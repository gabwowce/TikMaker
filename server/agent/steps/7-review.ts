import fs from "node:fs";
import path from "node:path";
import type {
  ChatTarget,
  ReviewFromAi,
  ReviewInMessage,
} from "../../../src/agent/run/7-chat.js";
import type { VideoProject } from "../../../src/schema/project.js";
import { KNOWLEDGE_DIR } from "../../config.js";
import { agentFolder } from "../claudeCode.js";
import { builtProject, rewriteCodeScenes, savedProject } from "../codeScenes.js";
import type { Job } from "../job.js";
import { reviewFrames } from "../prompts/reviewFrames.js";
import { renderStills, type Still } from "../stills.js";
import { isLimitError } from "../limits.js";
import { agentSays, step7Change } from "./7-chat.js";

// The review of the frames (docs/perziura-kodas.md): the agent renders frames
// of the video, looks at them (FR-15) and decides what to change.
//
// - step6SelfReview: at the end of the build, before "done" – the agent
//   fixes what it found by itself and looks again, until every scene reads
//   well, the rounds run out or a round finds no fewer scenes to fix (FR-16).
//   No button: the creator's decisions stay the three of NFR-11.
// - step7Review: the "Review frames" button / a message later on – the video
//   as the editor saved it (the creator may have changed it by hand), and the
//   fixes only proposed, done on "Do it".

// What the review found: the agent's message, the changes it wants, and
// every scene's verdict (shown as a list in the panel).
export type ReviewResult = {
  text: string;
  targets: ChatTarget[];
  scenes: ReviewFromAi["scenes"];
};
const shown = (
  found: ReviewResult,
  next: ReviewInMessage["next"],
  round?: number,
): { review: ReviewInMessage } => ({
  review: { ...(round ? { round } : {}), scenes: found.scenes, next },
});

// How the frames are made – Remotion by default; the tests pass a fake.
export type RenderFrames = (
  project: VideoProject,
  folder: string,
) => Promise<Still[]>;

// Fix rounds at most (FR-16): look → fix → look again, three times.
export const MAX_FIX_ROUNDS = 3;

// One look: the frames of `project`, and what the model makes of them.
async function reviewProject(
  job: Job,
  project: VideoProject,
  render: RenderFrames,
): Promise<ReviewResult> {
  const { script, code } = job.run;
  if (!script || !code) throw new Error("The video is not built yet");
  // Inside the folder Claude Code runs in, so its Read tool may open them.
  const folder = path.join(
    agentFolder(),
    "review",
    job.run.id,
    `${Date.now()}`,
  );
  const stills = await render(project, folder);
  // the example sheets go in the same folder, so the Read tool may open them
  const references = job.knowledge.referenceSheets.flatMap((sheet) => {
    const from = path.join(KNOWLEDGE_DIR, "shared", sheet.file);
    if (!fs.existsSync(from)) return [];
    const file = path.join(folder, `example-${path.basename(sheet.file)}`);
    fs.copyFileSync(from, file);
    return [{ sheet, file }];
  });
  const review = await job.ai("reviewFrames", () =>
    reviewFrames(script.scenes, code, stills, {
      rubric: job.knowledge.reviewRubric,
      references,
      principles: job.knowledge.picturePrinciples,
    }),
  );
  return reviewResult(review, script.scenes.length);
}

export async function step7Review(
  job: Job,
  render: RenderFrames = renderStills,
): Promise<ReviewResult> {
  // The project as the editor saved it (AutoSave): what the creator sees.
  const project = await savedProject(job);
  if (!project)
    throw new Error("The project is not saved yet – open it in the editor");
  return reviewProject(job, project, render);
}

// At the end of the build: look, fix, look again. Every round is said in the
// conversation, so the creator sees what the agent changed and why. Anything
// failing here (no Claude Code, a render error) ends the review, not the run:
// the video is built either way.
export async function step6SelfReview(
  job: Job,
  render: RenderFrames = renderStills,
): Promise<void> {
  let before = Infinity;
  for (let round = 1; ; round++) {
    let found: ReviewResult;
    try {
      found = await reviewProject(job, await builtProject(job), render);
    } catch (error) {
      // the usage limit pauses the run (agent.ts); "Continue" looks again
      if (isLimitError(error)) throw error;
      const why = error instanceof Error ? error.message : String(error);
      return agentSays(job, `I could not review the frames: ${why}`);
    }
    const said = `Self-review, round ${round}: ${found.text}`;
    if (!found.targets.length)
      return agentSays(job, said, shown(found, "done", round));
    // fewer scenes to fix every round, or the fixes are not helping
    if (found.targets.length >= before)
      return agentSays(
        job,
        `${said}\nThe last round did not make it better, so I stopped – tell me what to change.`,
        shown(found, "stopped", round),
      );
    if (round > MAX_FIX_ROUNDS)
      return agentSays(
        job,
        `${said}\nThat was the last round – tell me what to change.`,
        shown(found, "last", round),
      );
    const scenes = found.targets.map((t) => (t.sceneIndex ?? 0) + 1);
    await agentSays(
      job,
      `${said}\nFixing scene(s) ${scenes.join(", ")}…`,
      shown(found, "fixing", round),
    );
    // The pictures and their motion are code: every scene to fix is written
    // again in one Claude Code run (one session sees the whole video, and it
    // is one start-up instead of several); words go one by one.
    const code = found.targets.filter((t) => t.kind !== "words");
    const words = found.targets.filter((t) => t.kind === "words");
    const fixes: (() => Promise<unknown>)[] = [
      ...(code.length
        ? [
            () =>
              rewriteCodeScenes(
                job,
                [...new Set(code.map((t) => t.sceneIndex ?? 0))],
                code
                  .map((t) => `Scene ${(t.sceneIndex ?? 0) + 1}: ${t.instruction ?? ""}`)
                  .join("\n"),
              ),
          ]
        : []),
      ...words.map((target) => () => step7Change(job, target)),
    ];
    for (const fix of fixes) {
      try {
        await fix();
      } catch (error) {
        if (isLimitError(error)) throw error;
        const why = error instanceof Error ? error.message : String(error);
        await agentSays(job, `The fix failed – ${why}`);
      }
    }
    before = found.targets.length;
  }
}

// The review → what the agent says and proposes. A change for a scene that
// does not exist is dropped; "good" scenes are named together in one line,
// and a good scene's notes (taste, the rubric's "note" checks) are said but
// never become a change.
export function reviewResult(
  review: ReviewFromAi,
  sceneCount: number,
): ReviewResult {
  const scenes = review.scenes.filter(
    (scene) => scene.sceneIndex >= 0 && scene.sceneIndex < sceneCount,
  );
  const fix = scenes.filter((scene) => scene.verdict === "fix");
  const good = scenes
    .filter((scene) => scene.verdict === "good")
    .map((scene) => scene.sceneIndex + 1);
  const targets: ChatTarget[] = fix.flatMap((scene) =>
    scene.change
      ? [
          {
            kind: scene.change.kind,
            sceneIndex: scene.sceneIndex,
            instruction: scene.change.instruction,
          },
        ]
      : [],
  );
  const lines = [
    fix.length
      ? `I looked at the frames. ${fix.length} scene(s) need a fix:`
      : "I looked at the frames – every scene reads well.",
    ...fix.map(
      (scene) =>
        `Scene ${scene.sceneIndex + 1}: ${scene.problems.join("; ") || scene.sees}`,
    ),
    ...(good.length && fix.length ? [`Good as they are: ${good.join(", ")}.`] : []),
    ...scenes
      .filter((scene) => scene.verdict === "good" && scene.problems.length)
      .map(
        (scene) =>
          `Note, scene ${scene.sceneIndex + 1} (left as it is): ${scene.problems.join("; ")}`,
      ),
  ];
  return { text: lines.join("\n"), targets, scenes };
}
