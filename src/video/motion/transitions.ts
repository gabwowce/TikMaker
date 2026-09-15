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
const DIRECTIONS: Record<Exclude<TransitionPreset, "cut">, Direction> = {
  push: { axis: "x", sign: 1 },
  slideLeft: { axis: "x", sign: 1 },
  slideRight: { axis: "x", sign: -1 },
  slideUp: { axis: "y", sign: 1 },
  slideDown: { axis: "y", sign: -1 },
};
export function transitionStyle(
  preset: TransitionPreset | undefined,
  args: TransitionArgs,
): CSSProperties {
  if (!preset || preset === "cut") return {};
  const { frameInScene } = args;
  const { axis, sign } = DIRECTIONS[preset];
  const inProgress = interpolate(frameInScene, [0, PUSH_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const translate = inProgress * 100 * sign;
  return {
    transform:
      axis === "x" ? `translateX(${translate}%)` : `translateY(${translate}%)`,
  };
}
