import type { VideoProject } from "../schema/project";
import type { Scene } from "../schema/scene";
import { PUSH_FRAMES, isOverlappingTransition } from "../video/motion/transitions";
import { resolveSceneDuration } from "./pacing";

/** Frames a scene overlaps with the one before it when its own `motion.transition`
 * is a slide (any direction, or the deprecated "push" alias). Matches
 * `PUSH_FRAMES` in `motion/transitions.ts` — the slide's in/out window — so the
 * outgoing scene's slide-out and the incoming scene's slide-in play during the
 * SAME absolute frames instead of each sliding through an empty gap where
 * neither scene has content on screen. */
export const SCENE_OVERLAP_FRAMES = PUSH_FRAMES;

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
  return project.scenes.map((scene, index) => {
    const durationSeconds = resolveSceneDuration(scene);
    const durationInFrames = Math.round(durationSeconds * project.fps);
    const overlap = index > 0 && isOverlappingTransition(scene.motion?.transition) ? SCENE_OVERLAP_FRAMES : 0;
    const from = Math.max(0, cursor - overlap);
    cursor = from + durationInFrames;
    return { scene, from, durationInFrames, durationSeconds };
  });
}

export function projectDurationInFrames(project: VideoProject): number {
  const timings = computeSceneTimings(project);
  if (timings.length === 0) return 1;
  const last = timings[timings.length - 1];
  return Math.max(1, last.from + last.durationInFrames);
}
