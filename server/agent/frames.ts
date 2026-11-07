import type { VideoProject } from "../../src/schema/project.js";
import { computeSceneTimings } from "../../src/utils/duration.js";

// Which frames the review looks at (stills.ts renders them). Kept apart from
// the rendering, which pulls in Remotion's bundler, so it can be tested alone.

// One frame the reviewer gets: which scene, when, and the PNG on disk.
export type Still = { sceneIndex: number; seconds: number; file: string };

// Never earlier than this after a block appears: past its entrance.
const SETTLED_FRAMES = 30;
// Taken this long before a block leaves (or the scene ends): by then every
// part of it is in – a loop with all its nodes, not just the first one (the
// first try looked right after the entrance and saw one node of four).
const END_MARGIN = 15;
// At most this many frames a scene: the first picture and the last one.
const PER_SCENE = 2;

// Which frames of the video to look at: in every scene, its first block and
// its last block each at its fullest – just before it leaves. On a split or a
// scene whose blocks take turns those are different pictures.
export function framesToReview(
  project: VideoProject,
): { sceneIndex: number; frame: number }[] {
  return computeSceneTimings(project).flatMap(
    ({ scene, from, durationInFrames }, sceneIndex) => {
      const last = Math.max(0, durationInFrames - END_MARGIN);
      const at = (scene.content.visuals ?? [])
        .map((entry) => {
          const from = entry.delay ?? 0;
          const leaves = Math.min(last, (entry.exitAt ?? durationInFrames) - END_MARGIN);
          return Math.min(last, Math.max(from + SETTLED_FRAMES, leaves));
        })
        .sort((a, b) => a - b);
      const picked = at.length
        ? [...new Set([at[0], at[at.length - 1]])]
        : [Math.round(durationInFrames / 2)];
      return picked
        .slice(0, PER_SCENE)
        .map((frame) => ({ sceneIndex, frame: from + frame }));
    },
  );
}

