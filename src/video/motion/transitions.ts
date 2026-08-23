import { interpolate } from "remotion";
import type { CSSProperties } from "react";
import { standardEasing } from "./easing";
import type { TransitionPreset } from "../../schema/scene";

type TransitionArgs = {
  frameInScene: number;
  durationInFrames: number;
  fps: number;
};

const PUSH_FRAMES = 12;

export function transitionStyle(preset: TransitionPreset | undefined, args: TransitionArgs): CSSProperties {
  if (!preset || preset === "cut") return {};

  const { frameInScene, durationInFrames } = args;

  if (preset === "push") {
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
    const translate = (inProgress + outProgress) * 100;
    return { transform: `translateX(${translate}%)` };
  }

  return {};
}
