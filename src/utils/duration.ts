import type { VideoProject } from "../schema/project";
import type { Scene } from "../schema/scene";
import { resolveSceneDuration } from "./pacing";

/** Frames a scene overlaps with the one before it when its own `motion.transition`
 * is a slide (any direction, or the deprecated "push" alias). Matches
 * `PUSH_FRAMES` in `motion/transitions.ts` — the slide's in/out window — so the
 * outgoing scene's slide-out and the incoming scene's slide-in play during the
 * SAME absolute frames instead of each sliding through an empty gap where
 * neither scene has content on screen. */
/** Scene ranges are contiguous. Visual transitions never alter global time. */
export const SCENE_OVERLAP_FRAMES = 0;

export type SceneTiming = {
  scene: Scene;
  from: number;
  durationInFrames: number;
  /** Resolved length in seconds (see `resolveSceneDuration`) — scenes render
   * against this, never against the raw optional `scene.durationSeconds`. */
  durationSeconds: number;
};

/** Absolute-timeline placement for every scene, accounting for push-transition
 * overlap. Single source of truth for both the Remotion composition/Player
 * duration (`projectDurationInFrames`) and `SceneRenderer`'s actual `<Sequence>`
 * placement — they must never drift apart or scenes will play past the
 * composition's declared length (or leave trailing dead frames). */
export function computeSceneTimings(project: VideoProject): SceneTiming[] {
  let cursor = 0;
  return project.scenes.map((scene) => {
    const durationSeconds = resolveSceneDuration(scene);
    const durationInFrames = Math.round(durationSeconds * project.fps);
    const from = cursor;
    cursor = from + durationInFrames;
    return { scene, from, durationInFrames, durationSeconds };
  });
}

export function projectDurationInFrames(project: VideoProject): number {
  const timings = computeSceneTimings(project);
  if (timings.length === 0) return 1;
  const last = timings[timings.length - 1];
  let end = last.from + last.durationInFrames;
  for (const timing of timings) {
    const content = timing.scene.content;
    for (const line of content.richHeadline ?? []) end = Math.max(end, timing.from + (line.exitAt ?? timing.durationInFrames));
    for (const block of content.blocks ?? []) end = Math.max(end, timing.from + (block.exitAt ?? timing.durationInFrames));
    for (const visual of content.visuals ?? []) {
      end = Math.max(end, timing.from + (visual.exitAt ?? timing.durationInFrames));
      if (visual.visual.type === "checklist") {
        for (const item of visual.visual.items) {
          end = Math.max(end, timing.from + (item.exitAt ?? visual.exitAt ?? timing.durationInFrames));
        }
      }
    }
    for (const item of content.items ?? []) end = Math.max(end, timing.from + (item.exitAt ?? timing.durationInFrames));
  }
  for (const clip of project.audioClips ?? []) end = Math.max(end, clip.from + (clip.durationInFrames ?? 1));
  return Math.max(1, Math.ceil(end));
}
