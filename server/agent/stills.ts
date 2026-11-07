import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";
import fs from "node:fs";
import path from "node:path";
import type { VideoProject } from "../../src/schema/project.js";
import { ROOT } from "../config.js";
import { framesToReview, type Still } from "./frames.js";

export type { Still } from "./frames.js";

// The frames the agent looks at when it reviews its own video
// (steps/7-review.ts): a picture of each scene as the viewer will see it –
// rendered by Remotion from the same composition as the MP4, so what the
// model judges is exactly what gets posted.

// Half size (540x960): enough to judge size and hierarchy, a quarter of the
// tokens of a full frame.
const SCALE = 0.5;

// Renders those frames to PNGs in `folder`. The bundle is made once per review
// (~30 s); every frame after that takes a second or two.
export async function renderStills(
  project: VideoProject,
  folder: string,
): Promise<Still[]> {
  fs.mkdirSync(folder, { recursive: true });
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "src", "index.ts"),
    webpackOverride: enableTailwind,
    publicDir: path.join(ROOT, "public"),
  });
  const inputProps = { project };
  // REMOTION_BROWSER_EXECUTABLE: a Chrome of the machine's own (remotion.config.ts)
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
  const composition = await selectComposition({
    serveUrl,
    id: "TikTokVideo",
    inputProps,
    browserExecutable,
  });
  const stills: Still[] = [];
  for (const { sceneIndex, frame } of framesToReview(project)) {
    const file = path.join(folder, `scene-${sceneIndex + 1}-f${frame}.png`);
    await renderStill({
      serveUrl,
      composition,
      inputProps,
      frame,
      output: file,
      imageFormat: "png",
      scale: SCALE,
      browserExecutable,
    });
    stills.push({ sceneIndex, seconds: frame / project.fps, file });
  }
  return stills;
}

