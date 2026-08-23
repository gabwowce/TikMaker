import { interpolate, spring } from "remotion";
import type { CSSProperties } from "react";
import { standardEasing } from "./easing";
import type { EntrancePreset } from "../../schema/scene";

type EnterArgs = {
  frame: number;
  fps: number;
  delay?: number;
  durationInFrames?: number;
};

const springConfig = { damping: 200, stiffness: 200, mass: 0.7 };

const SLIDE_DISTANCE = 60;

function slideOffset(preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight"): { x: number; y: number } {
  switch (preset) {
    case "slideUp":
      return { x: 0, y: SLIDE_DISTANCE };
    case "slideDown":
      return { x: 0, y: -SLIDE_DISTANCE };
    case "slideLeft":
      return { x: SLIDE_DISTANCE, y: 0 };
    case "slideRight":
      return { x: -SLIDE_DISTANCE, y: 0 };
  }
}

export function enter(preset: EntrancePreset, args: EnterArgs): CSSProperties {
  const { frame, fps, delay = 0, durationInFrames = 18 } = args;
  const localFrame = frame - delay;

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
      const { x, y } = slideOffset(preset);
      const translateX = interpolate(progress, [0, 1], [x, 0]);
      const translateY = interpolate(progress, [0, 1], [y, 0]);
      return { opacity: progress, transform: `translate(${translateX}px, ${translateY}px)` };
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
    default:
      return {};
  }
}
