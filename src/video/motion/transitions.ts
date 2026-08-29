import { interpolate } from "remotion";
import type { CSSProperties } from "react";
import { standardEasing } from "./easing";
import type { TransitionPreset } from "../../schema/scene";

type TransitionArgs = {
  frameInScene: number;
  durationInFrames: number;
  fps: number;
};

/** Frames the slide takes at the start/end of a scene. Also the window
 * `computeSceneTimings` (see `utils/duration.ts`) overlaps consecutive scenes
 * by, so the outgoing scene's slide-out and the incoming scene's slide-in
 * play during the SAME absolute frames instead of either running past an
 * empty gap. */
export const PUSH_FRAMES = 12;

type Axis = "x" | "y";
type Direction = { axis: Axis; sign: 1 | -1 };

/** `slideLeft` enters from the right moving left (matches the entrance preset
 * of the same name), `slideRight` enters from the left moving right,
 * `slideUp` from below moving up, `slideDown` from above moving down. */
const DIRECTIONS: Record<Exclude<TransitionPreset, "cut">, Direction> = {
  push: { axis: "x", sign: 1 }, // deprecated alias for slideLeft
  slideLeft: { axis: "x", sign: 1 },
  slideRight: { axis: "x", sign: -1 },
  slideUp: { axis: "y", sign: 1 },
  slideDown: { axis: "y", sign: -1 },
};

/** Scenes whose `motion.transition` occupies the shared overlap window (every
 * preset except a hard `cut`, which has none). */
export function isOverlappingTransition(preset: TransitionPreset | undefined): boolean {
  return Boolean(preset) && preset !== "cut";
}

/** Pure translate — deliberately no opacity change. `motion.entrance`/
 * `motion.exit` add their OWN fade/slide on top of this; for a transition
 * meant to be the scene's only motion, leave those unset so the whole-scene
 * slide is the one thing the viewer sees, not slide-plus-fade layered together. */
export function transitionStyle(preset: TransitionPreset | undefined, args: TransitionArgs): CSSProperties {
  if (!preset || preset === "cut") return {};

  const { frameInScene, durationInFrames } = args;
  const { axis, sign } = DIRECTIONS[preset];

  const inProgress = interpolate(frameInScene, [0, PUSH_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const outStart = durationInFrames - PUSH_FRAMES;
  const outProgress = interpolate(frameInScene, [outStart, durationInFrames], [0, -1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const translate = (inProgress + outProgress) * 100 * sign;

  return { transform: axis === "x" ? `translateX(${translate}%)` : `translateY(${translate}%)` };
}
