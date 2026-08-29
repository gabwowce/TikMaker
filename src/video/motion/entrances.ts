import { interpolate, spring } from "remotion";
import type { CSSProperties } from "react";
import { standardEasing } from "./easing";
import type { EntrancePreset } from "../../schema/scene";

type EnterArgs = {
  frame: number;
  fps: number;
  delay?: number;
  durationInFrames?: number;
  /** How far (px) the element travels on a slide/zoomSettle preset. Unset =
   * the tasteful default below. Past `FULL_TRAVEL_DISTANCE` the opacity fade
   * is dropped so a long slide reads as one continuous move from off-frame
   * instead of the element materialising halfway in — same reasoning as the
   * whole-scene slide in `transitions.ts`, which never fades either. */
  distance?: number;
};

const springConfig = { damping: 200, stiffness: 200, mass: 0.7 };

const SLIDE_DISTANCE = 60;
const ARRIVE_DISTANCE = 260;
/** At or past this travel distance the element is far enough out of frame that
 * fading it too just makes it vanish early — so opacity is left alone. */
export const FULL_TRAVEL_DISTANCE = 400;
/** Convenience for the editor: travelling this far clears the 1080x1920 canvas
 * from any starting position. */
export const OFF_FRAME_DISTANCE = 1200;

function slideOffset(
  preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight",
  distance: number,
): { x: number; y: number } {
  switch (preset) {
    case "slideUp":
      return { x: 0, y: distance };
    case "slideDown":
      return { x: 0, y: -distance };
    case "slideLeft":
      return { x: distance, y: 0 };
    case "slideRight":
      return { x: -distance, y: 0 };
  }
}

export function enter(preset: EntrancePreset, args: EnterArgs): CSSProperties {
  const { frame, fps, delay = 0, durationInFrames = 18, distance } = args;
  const localFrame = frame - delay;
  const travel = distance ?? SLIDE_DISTANCE;
  const fades = travel < FULL_TRAVEL_DISTANCE;

  switch (preset) {
    case "fade": {
      const opacity = interpolate(localFrame, [0, durationInFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: standardEasing,
      });
      return { opacity };
    }
    case "slideUp":
    case "slideDown":
    case "slideLeft":
    case "slideRight": {
      const progress = spring({ frame: localFrame, fps, config: springConfig });
      const { x, y } = slideOffset(preset, travel);
      const translateX = interpolate(progress, [0, 1], [x, 0]);
      const translateY = interpolate(progress, [0, 1], [y, 0]);
      return { opacity: fades ? progress : 1, transform: `translate(${translateX}px, ${translateY}px)` };
    }
    case "scaleIn": {
      const progress = spring({ frame: localFrame, fps, config: springConfig });
      const scale = interpolate(progress, [0, 1], [0.85, 1]);
      return { opacity: progress, transform: `scale(${scale})` };
    }
    case "pop": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 12, stiffness: 260, mass: 0.6 },
      });
      const scale = interpolate(progress, [0, 1], [0.5, 1]);
      return { opacity: Math.min(progress * 1.6, 1), transform: `scale(${scale})` };
    }
    case "zoomSettleRight":
    case "zoomSettleLeft": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 16, stiffness: 140, mass: 0.8 },
      });
      const arrive = distance ?? ARRIVE_DISTANCE;
      const fromX = preset === "zoomSettleRight" ? arrive : -arrive;
      const translateX = interpolate(progress, [0, 0.65, 1], [fromX, 0, 0]);
      const translateY = interpolate(progress, [0, 0.65, 1], [-36, -16, 0]);
      const scale = interpolate(progress, [0, 0.5, 1], [0.6, 1.15, 1]);
      const opacity = interpolate(progress, [0, 0.25, 1], [0, 1, 1]);
      return {
        opacity,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      };
    }
    case "zoomSettleTop":
    case "zoomSettleBottom": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 16, stiffness: 140, mass: 0.8 },
      });
      const arrive = distance ?? ARRIVE_DISTANCE;
      const fromY = preset === "zoomSettleBottom" ? arrive : -arrive;
      const translateY = interpolate(progress, [0, 0.65, 1], [fromY, 0, 0]);
      const scale = interpolate(progress, [0, 0.5, 1], [0.6, 1.15, 1]);
      const opacity = interpolate(progress, [0, 0.25, 1], [0, 1, 1]);
      return {
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
      };
    }
    default:
      return {};
  }
}
