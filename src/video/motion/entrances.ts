import type { CSSProperties } from "react";
import { interpolate, spring } from "remotion";
import type { EntrancePreset } from "../../schema/scene";
import { videoDefaults } from "../typography/tokens";
import { standardEasing } from "./easing";
type EnterArgs = {
  frame: number;
  fps: number;
  delay?: number;
  durationInFrames?: number;
  distance?: number;
};
const springConfig = { damping: 200, stiffness: 200, mass: 0.7 };
const ARRIVE_DISTANCE = 260;
const OFF_FRAME_MARGIN = 200;
export function offFrameTravel(axis: "x" | "y"): number {
  return (
    (axis === "x" ? videoDefaults.width : videoDefaults.height) +
    OFF_FRAME_MARGIN
  );
}
function slideAxis(
  preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight",
): "x" | "y" {
  return preset === "slideLeft" || preset === "slideRight" ? "x" : "y";
}
export const BLUR_RADIUS = 22;
export const SPIN_DEGREES = 200;
export const ROLL_DEGREES = 140;
export const FULL_TRAVEL_DISTANCE = 400;
export const OFF_FRAME_DISTANCE = 1200;
function slideOffset(
  preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight",
  distance: number,
): {
  x: number;
  y: number;
} {
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
  const { frame, fps, delay = 0, durationInFrames, distance } = args;
  const localFrame = frame - delay;
  const springDuration =
    durationInFrames === undefined
      ? undefined
      : Math.max(1, Math.round(durationInFrames));
  switch (preset) {
    case "fade": {
      const opacity = interpolate(
        localFrame,
        [0, springDuration ?? 18],
        [0, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: standardEasing,
        },
      );
      return { opacity };
    }
    case "slideUp":
    case "slideDown":
    case "slideLeft":
    case "slideRight": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: springConfig,
        durationInFrames: springDuration,
      });
      const travel = distance ?? offFrameTravel(slideAxis(preset));
      const fades = travel < FULL_TRAVEL_DISTANCE;
      const { x, y } = slideOffset(preset, travel);
      const translateX = interpolate(progress, [0, 1], [x, 0]);
      const translateY = interpolate(progress, [0, 1], [y, 0]);
      return {
        opacity: fades ? progress : 1,
        transform: `translate(${translateX}px, ${translateY}px)`,
      };
    }
    case "scaleIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: springConfig,
        durationInFrames: springDuration,
      });
      const scale = interpolate(progress, [0, 1], [0.85, 1]);
      return { opacity: progress, transform: `scale(${scale})` };
    }
    case "pop": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 12, stiffness: 260, mass: 0.6 },
        durationInFrames: springDuration,
      });
      const scale = interpolate(progress, [0, 1], [0.5, 1]);
      return {
        opacity: Math.min(progress * 1.6, 1),
        transform: `scale(${scale})`,
      };
    }
    case "zoomSettleRight":
    case "zoomSettleLeft": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 16, stiffness: 140, mass: 0.8 },
        durationInFrames: springDuration,
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
        durationInFrames: springDuration,
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
    case "zoomIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: springConfig,
        durationInFrames: springDuration,
      });
      const scale = interpolate(progress, [0, 1], [1.6, 1]);
      return { opacity: progress, transform: `scale(${scale})` };
    }
    case "blurIn": {
      const progress = interpolate(
        localFrame,
        [0, springDuration ?? 18],
        [0, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: standardEasing,
        },
      );
      const blur = interpolate(progress, [0, 1], [BLUR_RADIUS, 0]);
      const scale = interpolate(progress, [0, 1], [1.06, 1]);
      return {
        opacity: progress,
        filter: `blur(${blur}px)`,
        transform: `scale(${scale})`,
      };
    }
    case "spinIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: springConfig,
        durationInFrames: springDuration,
      });
      const rotate = interpolate(progress, [0, 1], [-SPIN_DEGREES, 0]);
      const scale = interpolate(progress, [0, 1], [0.3, 1]);
      return {
        opacity: Math.min(progress * 2, 1),
        transform: `rotate(${rotate}deg) scale(${scale})`,
      };
    }
    case "flipIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: springConfig,
        durationInFrames: springDuration,
      });
      const rotateY = interpolate(progress, [0, 1], [90, 0]);
      return {
        opacity: Math.min(progress * 2, 1),
        transform: `perspective(1200px) rotateY(${rotateY}deg)`,
      };
    }
    case "bounceIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 8, stiffness: 180, mass: 0.9 },
        durationInFrames: springDuration,
      });
      const scale = interpolate(progress, [0, 1], [0.4, 1]);
      return {
        opacity: Math.min(progress * 2.2, 1),
        transform: `scale(${scale})`,
      };
    }
    case "dropIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 9, stiffness: 150, mass: 1 },
        durationInFrames: springDuration,
      });
      const travel = distance ?? offFrameTravel("y");
      const translateY = interpolate(progress, [0, 1], [-travel, 0]);
      return { opacity: 1, transform: `translateY(${translateY}px)` };
    }
    case "rollIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: springConfig,
        durationInFrames: springDuration,
      });
      const travel = distance ?? offFrameTravel("x");
      const translateX = interpolate(progress, [0, 1], [-travel, 0]);
      const rotate = interpolate(progress, [0, 1], [-ROLL_DEGREES, 0]);
      return {
        opacity: 1,
        transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
      };
    }
    default:
      return {};
  }
}
