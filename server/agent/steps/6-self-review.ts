import type { ReviewInMessage } from "../../../src/agent/run/7-chat.js";
import { isLimitError } from "../limits.js";
import type { Job } from "../job.js";
import { renderStills } from "../tools/stills.js";
import {
  reviewProject,
  type RenderFrames,
  type ReviewResult,
} from "../tools/review.js";
import { builtProject, rewriteCodeScenes } from "./5-pictures.js";
import { agentSays, step7Change } from "./7-chat.js";

// 6 Self-review: at the end of the build, before "done", the agent looks at
// its own frames (tools/review.ts) and fixes what it found by itself, then
// looks again – until every scene reads well, the rounds run out or a round
// finds no fewer scenes to fix (FR-16). No button: the creator's decisions
// stay the three of NFR-11.
//
//   look → nothing to fix?            stop: "every scene reads well"
//        → no fewer to fix than last? stop: "fixing is not helping"
//        → past MAX_FIX_ROUNDS?       stop: "that was the last round"
//        → fix: pictures and motion in ONE Claude Code run, words one by one
//        → look again

// What a round shows in the panel: every scene's verdict and what comes next.
const shown = (
  found: ReviewResult,
  next: ReviewInMessage["next"],
  round?: number,
): { review: ReviewInMessage } => ({
  review: { ...(round ? { round } : {}), scenes: found.scenes, next },
});

// Fix rounds at most (FR-16): look → fix → look again, three times.
export const MAX_FIX_ROUNDS = 3;

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
