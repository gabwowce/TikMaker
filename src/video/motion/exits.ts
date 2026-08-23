import { interpolate } from "remotion";
import type { CSSProperties } from "react";
import { standardEasing } from "./easing";
import type { ExitPreset } from "../../schema/scene";

type ExitArgs = {
  frame: number;
  durationInFrames: number;
  exitDuration?: number;
};

const SLIDE_DISTANCE = 70;

function slideOffset(preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight"): { x: number; y: number } {
  switch (preset) {
    case "slideUp":
      return { x: 0, y: -SLIDE_DISTANCE };
    case "slideDown":
      return { x: 0, y: SLIDE_DISTANCE };
    case "slideLeft":
      return { x: -SLIDE_DISTANCE, y: 0 };
    case "slideRight":
      return { x: SLIDE_DISTANCE, y: 0 };
  }
}

/** Animates a scene's content out during the final `exitDuration` frames before it ends.
 * Returns an empty style outside that window, so it's cheap to always call. */
export function exitStyle(preset: ExitPreset | undefined, args: ExitArgs): CSSProperties {
  if (!preset) return {};

  const { frame, durationInFrames, exitDuration = 18 } = args;
  const start = durationInFrames - exitDuration;
  if (frame < start) return {};

  const progress = interpolate(frame, [start, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });

  switch (preset) {
    case "fade":
      return { opacity: 1 - progress };
    case "slideUp":
    case "slideDown":
    case "slideLeft":
    case "slideRight": {
      const { x, y } = slideOffset(preset);
      const translateX = interpolate(progress, [0, 1], [0, x]);
      const translateY = interpolate(progress, [0, 1], [0, y]);
      return { opacity: 1 - progress, transform: `translate(${translateX}px, ${translateY}px)` };
    }
    case "scaleOut": {
      const scale = interpolate(progress, [0, 1], [1, 0.85]);
      return { opacity: 1 - progress, transform: `scale(${scale})` };
    }
    default:
      return {};
  }
}
