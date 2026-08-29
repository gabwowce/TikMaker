import { interpolate } from "remotion";
import type { CSSProperties } from "react";
import { standardEasing } from "./easing";
import { FULL_TRAVEL_DISTANCE } from "./entrances";
import type { ExitPreset } from "../../schema/scene";

type ExitArgs = {
  frame: number;
  durationInFrames: number;
  exitDuration?: number;
  /** How far (px) the element travels on a slide preset. Past
   * `FULL_TRAVEL_DISTANCE` the opacity fade is dropped, so the element really
   * leaves the frame instead of dissolving a few pixels into the move. */
  distance?: number;
};

const SLIDE_DISTANCE = 70;

function slideOffset(
  preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight",
  distance: number,
): { x: number; y: number } {
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

/** Animates a scene's content out during the final `exitDuration` frames before it ends.
 * Returns an empty style outside that window, so it's cheap to always call. */
export function exitStyle(preset: ExitPreset | undefined, args: ExitArgs): CSSProperties {
  if (!preset) return {};

  const { frame, durationInFrames, exitDuration = 18, distance } = args;
  const travel = distance ?? SLIDE_DISTANCE;
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
      const { x, y } = slideOffset(preset, travel);
      const translateX = interpolate(progress, [0, 1], [0, x]);
      const translateY = interpolate(progress, [0, 1], [0, y]);
      return {
        opacity: travel < FULL_TRAVEL_DISTANCE ? 1 - progress : 1,
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
    default:
      return {};
  }
}
