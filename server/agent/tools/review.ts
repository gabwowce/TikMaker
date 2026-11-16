import fs from "node:fs";
import path from "node:path";
import type {
  ChatTarget,
  ReviewFromAi,
} from "../../../src/agent/run/7-chat.js";
import type { VideoProject } from "../../../src/schema/project.js";
import {
  STYLE_SHEETS,
  VISUAL_STYLES,
  type VisualStyle,
} from "../../../src/agent/visualStyles.js";
import { KNOWLEDGE_DIR, ROOT } from "../../config.js";
import { agentFolder } from "../ai/claudeCode.js";
import type { Job } from "../job.js";
import { reviewFrames } from "../prompts/reviewFrames.js";
import type { Still } from "./stills.js";

// TOOL: looking at the video's frames (docs/perziura-kodas.md). Used by two
// steps:
// - 6 Self-review (steps/6-self-review.ts) – at the end of the build, the
//   agent looks and fixes by itself;
// - 7 Chat (steps/7-chat.ts, step7Review) – the "Review frames" button or a
//   message later on; the fixes are only proposed.
//
// One look: Remotion renders a still of every scene → the knowledge base's
// example frames are put next to them → the model (reviewFrames) gives every
// scene a verdict, "good" or "fix" and what to change → reviewResult turns
// that into the agent's message and the list of changes.

// What the review found: the agent's message, the changes it wants, and
// every scene's verdict (shown as a list in the panel).
export type ReviewResult = {
  text: string;
  targets: ChatTarget[];
  scenes: ReviewFromAi["scenes"];
};

// How the frames are made – Remotion by default; the tests pass a fake.
export type RenderFrames = (
  project: VideoProject,
  folder: string,
) => Promise<Still[]>;

// One look: the frames of `project`, and what the model makes of them.
export async function reviewProject(
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
  // the example sheets go in the same folder, so the Read tool may open them:
  // the composition sheets, this video's style sheet (never another
  // style's), and the style's own example frames
  const style = VISUAL_STYLES[job.run.input.visualStyle ?? "clear"];
  const sheets = job.knowledge.referenceSheets.filter(
    (sheet) => !STYLE_SHEETS.includes(sheet.id) || sheet.id === style.reviewSheet,
  );
  const references = [
    ...sheets.flatMap((sheet) => {
      const from = path.join(KNOWLEDGE_DIR, "shared", sheet.file);
      if (!fs.existsSync(from)) return [];
      const file = path.join(folder, `example-${path.basename(sheet.file)}`);
      fs.copyFileSync(from, file);
      return [{ sheet, file }];
    }),
    ...styleImages(style, folder),
  ];
  const review = await job.ai("reviewFrames", () =>
    reviewFrames(script.scenes, code, stills, {
      rubric: job.knowledge.reviewRubric,
      references,
      principles: job.knowledge.picturePrinciples,
    }),
  );
  return reviewResult(review, script.scenes.length);
}

// The style's own example frames (its skill's references folder), at most 8,
// as one more set of examples.
function styleImages(style: VisualStyle, folder: string) {
  if (!style.reviewImagesDir) return [];
  const dir = path.join(ROOT, style.reviewImagesDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .slice(0, 8)
    .map((name) => {
      const file = path.join(folder, `style-${name}`);
      fs.copyFileSync(path.join(dir, name), file);
      return {
        sheet: {
          id: `${style.id}-${name}`,
          file: name,
          source: `${style.reviewNote} – the creator's example frame`,
          tiles: [name],
          takeaways: [style.description],
        },
        file,
      };
    });
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
