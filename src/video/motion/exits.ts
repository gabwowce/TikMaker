import { interpolate } from "remotion";
import type { CSSProperties } from "react";
import { exitEasing } from "./easing";
import { BLUR_RADIUS, offFrameTravel, ROLL_DEGREES, SPIN_DEGREES } from "./entrances";
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

// CapCut-style OUT slides finish outside the 1080x1920 canvas. A tiny offset
// followed by hiding at the clip edge reads as a pop, not a completed slide.
// `offFrameTravel` sizes that per axis off the real canvas, so a vertical slide
// clears the 1920-tall frame instead of stopping 700px short of it the way one
// shared horizontal constant did.
function slideAxis(preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight"): "x" | "y" {
  return preset === "slideLeft" || preset === "slideRight" ? "x" : "y";
}

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
  const { frame, durationInFrames, exitDuration = 18, distance } = args;
  // The timeline OUT edge is the moment the object is fully gone. Slide
  // presets previously stayed at their final offset with opacity 1 forever.
  if (frame >= durationInFrames) return { opacity: 0, visibility: "hidden" };
  if (!preset) return {};

  const start = durationInFrames - exitDuration;
  if (frame < start) return {};

  const progress = interpolate(frame, [start, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    // Accelerating away, not decelerating in — see `exitEasing`.
    easing: exitEasing,
  });

  switch (preset) {
    case "fade":
      return { opacity: 1 - progress };
    case "slideUp":
    case "slideDown":
    case "slideLeft":
    case "slideRight": {
      const { x, y } = slideOffset(preset, distance ?? offFrameTravel(slideAxis(preset)));
      const translateX = interpolate(progress, [0, 1], [0, x]);
      const translateY = interpolate(progress, [0, 1], [0, y]);
      // A slide is spatial motion, not a dissolve. Keeping opacity at 1 also
      // makes the selected preset honest in the editor: fade is its own preset.
      return { opacity: 1, transform: `translate(${translateX}px, ${translateY}px)` };
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
      // `scaleOut` already shrinks away; this is the opposite gesture — the
      // element grows past the frame, as if it passed the camera.
      const scale = interpolate(progress, [0, 1], [1, 1.8]);
      return { opacity: 1 - progress, transform: `scale(${scale})` };
    }
    case "blurOut": {
      const blur = interpolate(progress, [0, 1], [0, BLUR_RADIUS]);
      const scale = interpolate(progress, [0, 1], [1, 1.06]);
      return { opacity: 1 - progress, filter: `blur(${blur}px)`, transform: `scale(${scale})` };
    }
    case "spinOut": {
      const rotate = interpolate(progress, [0, 1], [0, SPIN_DEGREES]);
      const scale = interpolate(progress, [0, 1], [1, 0.3]);
      return { opacity: 1 - progress, transform: `rotate(${rotate}deg) scale(${scale})` };
    }
    case "flipOut": {
      const rotateY = interpolate(progress, [0, 1], [0, -90]);
      return { opacity: 1 - progress, transform: `perspective(1200px) rotateY(${rotateY}deg)` };
    }
    case "dropOut": {
      // Gravity, not a slide: the fall accelerates (progress squared) and the
      // element tips as it goes, so it reads as being let go rather than pushed.
      const travel = distance ?? offFrameTravel("y");
      const translateY = progress * progress * travel;
      const rotate = interpolate(progress, [0, 1], [0, 18]);
      return { opacity: 1, transform: `translateY(${translateY}px) rotate(${rotate}deg)` };
    }
    case "rollOut": {
      const travel = distance ?? offFrameTravel("x");
      const translateX = interpolate(progress, [0, 1], [0, travel]);
      const rotate = interpolate(progress, [0, 1], [0, ROLL_DEGREES]);
      return { opacity: 1, transform: `translateX(${translateX}px) rotate(${rotate}deg)` };
    }
    default:
      return {};
  }
}
