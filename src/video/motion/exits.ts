import type { CSSProperties } from "react";
import { interpolate } from "remotion";
import type { ExitPreset } from "../../schema/scene";
import { exitEasing } from "./easing";
import {
  BLUR_RADIUS,
  offFrameTravel,
  ROLL_DEGREES,
  SPIN_DEGREES,
} from "./entrances";
type ExitArgs = {
  frame: number;
  durationInFrames: number;
  exitDuration?: number;
  distance?: number;
};
function slideAxis(
  preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight",
): "x" | "y" {
  return preset === "slideLeft" || preset === "slideRight" ? "x" : "y";
}
function slideOffset(
  preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight",
  distance: number,
): {
  x: number;
  y: number;
} {
  switch (preset) {
    case "slideUp":
      return { x: 0, y: -distance };
    case "slideDown":
      return { x: 0, y: distance };
    case "slideLeft":
      return { x: -distance, y: 0 };
    case "slideRight":
      return { x: distance, y: 0 };
  }
}
export function exitStyle(
  preset: ExitPreset | undefined,
  args: ExitArgs,
): CSSProperties {
  const { frame, durationInFrames, exitDuration = 18, distance } = args;
  if (frame >= durationInFrames) return { opacity: 0, visibility: "hidden" };
  if (!preset) return {};
  const start = durationInFrames - exitDuration;
  if (frame < start) return {};
  const progress = interpolate(frame, [start, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: exitEasing,
  });
  switch (preset) {
    case "fade":
      return { opacity: 1 - progress };
    case "slideUp":
    case "slideDown":
    case "slideLeft":
    case "slideRight": {
      const { x, y } = slideOffset(
        preset,
        distance ?? offFrameTravel(slideAxis(preset)),
      );
      const translateX = interpolate(progress, [0, 1], [0, x]);
      const translateY = interpolate(progress, [0, 1], [0, y]);
      return {
        opacity: 1,
        transform: `translate(${translateX}px, ${translateY}px)`,
      };
    }
    case "scaleOut": {
      const scale = interpolate(progress, [0, 1], [1, 0.85]);
      return { opacity: 1 - progress, transform: `scale(${scale})` };
    }
    case "burstOut": {
      const scale = interpolate(progress, [0, 1], [1, 1.4]);
      const rotate = interpolate(progress, [0, 1], [0, 7]);
      const translateY = interpolate(progress, [0, 1], [0, -34]);
      return {
        opacity: 1 - progress,
        transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
      };
    }
    case "zoomOut": {
      const scale = interpolate(progress, [0, 1], [1, 1.8]);
      return { opacity: 1 - progress, transform: `scale(${scale})` };
    }
    case "blurOut": {
      const blur = interpolate(progress, [0, 1], [0, BLUR_RADIUS]);
      const scale = interpolate(progress, [0, 1], [1, 1.06]);
      return {
        opacity: 1 - progress,
        filter: `blur(${blur}px)`,
        transform: `scale(${scale})`,
      };
    }
    case "spinOut": {
      const rotate = interpolate(progress, [0, 1], [0, SPIN_DEGREES]);
      const scale = interpolate(progress, [0, 1], [1, 0.3]);
      return {
        opacity: 1 - progress,
        transform: `rotate(${rotate}deg) scale(${scale})`,
      };
    }
    case "flipOut": {
      const rotateY = interpolate(progress, [0, 1], [0, -90]);
      return {
        opacity: 1 - progress,
        transform: `perspective(1200px) rotateY(${rotateY}deg)`,
      };
    }
    case "dropOut": {
      const travel = distance ?? offFrameTravel("y");
      const translateY = progress * progress * travel;
      const rotate = interpolate(progress, [0, 1], [0, 18]);
      return {
        opacity: 1,
        transform: `translateY(${translateY}px) rotate(${rotate}deg)`,
      };
    }
    case "rollOut": {
      const travel = distance ?? offFrameTravel("x");
      const translateX = interpolate(progress, [0, 1], [0, travel]);
      const rotate = interpolate(progress, [0, 1], [0, ROLL_DEGREES]);
      return {
        opacity: 1,
        transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
      };
    }
    default:
      return {};
  }
}
