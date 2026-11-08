import type { CSSProperties } from "react";
import { interpolate } from "remotion";
import type { TransitionPreset } from "../../schema/scene";
import { standardEasing } from "./easing";
type TransitionArgs = {
  frameInScene: number;
  durationInFrames: number;
  fps: number;
};
export const PUSH_FRAMES = 12;
type Axis = "x" | "y";
type Direction = {
  axis: Axis;
  sign: 1 | -1;
};
type SlidePreset =
  | "push"
  | "slideLeft"
  | "slideRight"
  | "slideUp"
  | "slideDown";
const DIRECTIONS: Record<SlidePreset, Direction> = {
  push: { axis: "x", sign: 1 },
  slideLeft: { axis: "x", sign: 1 },
  slideRight: { axis: "x", sign: -1 },
  slideUp: { axis: "y", sign: 1 },
  slideDown: { axis: "y", sign: -1 },
};
// The spatial ones move through depth, so they take a little longer than a
// slide – still inside the scenes' overlap, which is PUSH_FRAMES long.
// Like the slides they never fade: the move is the transition.
const ZOOM_FROM = 2.4; // zoomThrough: starts this big, as if the camera flew in
const DEPTH_FROM = 0.55; // fromDepth: starts this small, far behind the frame
const DEPTH_TILT = 28; // ...tipped back this many degrees
const FLIP_FROM = -90; // flip: starts turned edge-on
const PERSPECTIVE = 1600;
export function isOverlappingTransition(
  preset: TransitionPreset | undefined,
): boolean {
  return Boolean(preset) && preset !== "cut";
}
export function transitionStyle(
  preset: TransitionPreset | undefined,
  args: TransitionArgs,
): CSSProperties {
  if (!preset || preset === "cut") return {};
  const { frameInScene } = args;
  // 1 at the cut, 0 once the scene has arrived
  const inProgress = interpolate(frameInScene, [0, PUSH_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  switch (preset) {
    case "zoomThrough": {
      const scale = 1 + (ZOOM_FROM - 1) * inProgress;
      return {
        transform: `scale(${scale})`,
        filter: inProgress > 0.01 ? `blur(${inProgress * 14}px)` : undefined,
      };
    }
    case "fromDepth": {
      const scale = 1 - (1 - DEPTH_FROM) * inProgress;
      return {
        transform: `perspective(${PERSPECTIVE}px) rotateX(${DEPTH_TILT * inProgress}deg) scale(${scale})`,
      };
    }
    case "flip":
      return {
        transform: `perspective(${PERSPECTIVE}px) rotateY(${FLIP_FROM * inProgress}deg)`,
        backfaceVisibility: "hidden",
      };
    case "dissolve":
      return {
        opacity: 1 - inProgress,
        filter: inProgress > 0.01 ? `blur(${inProgress * 16}px)` : undefined,
        transform: `scale(${1 + inProgress * 0.04})`,
      };
    case "flash":
      // arrives overexposed and settles into its colours
      return {
        filter: inProgress > 0.01 ? `brightness(${1 + inProgress * 3})` : undefined,
        opacity: Math.min(1, (1 - inProgress) * 3),
      };
    default: {
      const { axis, sign } = DIRECTIONS[preset];
      const translate = inProgress * 100 * sign;
      return {
        transform:
          axis === "x"
            ? `translateX(${translate}%)`
            : `translateY(${translate}%)`,
      };
    }
  }
}

// The scene that is leaving, during the next scene's first PUSH_FRAMES
// (SceneRenderer draws both while they overlap): the other half of the move,
// so the old picture goes out the way the new one comes in.
export function exitTransitionStyle(
  preset: TransitionPreset | undefined,
  frameInTransition: number,
): CSSProperties {
  if (!preset || preset === "cut") return {};
  const out = interpolate(frameInTransition, [0, PUSH_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  switch (preset) {
    case "zoomThrough":
      return {
        transform: `scale(${1 + out * 0.6})`,
        opacity: 1 - out,
        filter: out > 0.01 ? `blur(${out * 12}px)` : undefined,
      };
    case "fromDepth":
      return { transform: `scale(${1 + out * 0.15})`, opacity: 1 - out };
    case "flip":
      return {
        transform: `perspective(${PERSPECTIVE}px) rotateY(${90 * out}deg)`,
        backfaceVisibility: "hidden",
      };
    case "dissolve":
      return {
        opacity: 1 - out,
        filter: out > 0.01 ? `blur(${out * 16}px)` : undefined,
      };
    case "flash":
      return {
        filter: `brightness(${1 + out * 4})`,
        opacity: 1 - Math.max(0, out - 0.5) * 2,
      };
    default: {
      const { axis, sign } = DIRECTIONS[preset];
      const translate = -out * 100 * sign;
      return {
        transform:
          axis === "x"
            ? `translateX(${translate}%)`
            : `translateY(${translate}%)`,
      };
    }
  }
}
