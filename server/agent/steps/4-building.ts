import { writeCodeScenes } from "../codeScenes.js";
import type { Job } from "../job.js";

// 4 Building (docs/tikmaker-kryptis.md, "Kaip veiks"): every scene's picture
// is written as code by Claude Code with the skills – the official Remotion
// skill, the TikMaker explainer skill and the channel's brand kit – and
// checked: it compiles, every scene has its component, Claude Code renders
// frames and looks at them itself. A scene that still fails gets a plain
// fallback, so the video always renders; its error stays in code.problems.
// The editor builds the project from the run (projectFromCode) – the agent
// never writes the project itself. The self-review with the frames
// (steps/7-review.ts) comes after.
export async function step4Building(job: Job): Promise<void> {
  if (!job.run.script?.approved)
    throw new Error("The video is built only after the script is approved");
  await writeCodeScenes(job);
}
