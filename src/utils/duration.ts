import type { VideoProject } from "../schema/project";
import type { Scene } from "../schema/scene";
import { resolveSceneDuration } from "./pacing";
export type SceneTiming = {
  scene: Scene;
  from: number;
  durationInFrames: number;
  durationSeconds: number;
};
function audioEndFrame(project: VideoProject): number {
  let end = 0;
  for (const clip of project.audioClips ?? [])
    end = Math.max(end, clip.from + (clip.durationInFrames ?? 1));
  return end;
}
export function computeSceneTimings(project: VideoProject): SceneTiming[] {
  let cursor = 0;
  const timings = project.scenes.map((scene) => {
    const durationSeconds = resolveSceneDuration(scene);
    const durationInFrames = Math.round(durationSeconds * project.fps);
    const from = cursor;
    cursor = from + durationInFrames;
    return { scene, from, durationInFrames, durationSeconds };
  });
  const last = timings[timings.length - 1];
  if (last) {
    const held = Math.max(
      last.durationInFrames,
      Math.ceil(audioEndFrame(project)) - last.from,
    );
    if (held > last.durationInFrames) {
      last.durationInFrames = held;
      last.durationSeconds = held / project.fps;
    }
  }
  return timings;
}
export function projectDurationInFrames(project: VideoProject): number {
  const timings = computeSceneTimings(project);
  if (timings.length === 0) return 1;
  const last = timings[timings.length - 1];
  let end = last.from + last.durationInFrames;
  for (const timing of timings) {
    const content = timing.scene.content;
    for (const line of content.richHeadline ?? [])
      end = Math.max(
        end,
        timing.from + (line.exitAt ?? timing.durationInFrames),
      );
    for (const block of content.blocks ?? [])
      end = Math.max(
        end,
        timing.from + (block.exitAt ?? timing.durationInFrames),
      );
    for (const visual of content.visuals ?? []) {
      end = Math.max(
        end,
        timing.from + (visual.exitAt ?? timing.durationInFrames),
      );
      if (visual.visual.type === "checklist") {
        for (const item of visual.visual.items) {
          end = Math.max(
            end,
            timing.from +
              (item.exitAt ?? visual.exitAt ?? timing.durationInFrames),
          );
        }
      }
    }
    for (const item of content.items ?? [])
      end = Math.max(
        end,
        timing.from + (item.exitAt ?? timing.durationInFrames),
      );
  }
  end = Math.max(end, audioEndFrame(project));
  return Math.max(1, Math.ceil(end));
}
