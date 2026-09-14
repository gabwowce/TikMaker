import type { CSSProperties } from "react";
import { interpolate } from "remotion";
import type { KenBurnsPreset } from "../../schema/scene";
type KenBurnsArgs = {
  frame: number;
  durationInFrames: number;
  seed?: number;
  speed?: number;
};
const ZOOM_RANGE: [number, number] = [1, 1.14];
const PAN_SCALE = 1.1;
const PAN_RANGE = 4;
const FLOAT_SPEED = 0.011;
const FLOAT_DRIFT_PX = 30;
const FLOAT_TILT_DEG = 11;
const FLOAT_BREATHE = 0.05;
const ROTATE_DEG_PER_FRAME = 1.2;
export function kenBurns(
  preset: KenBurnsPreset | undefined,
  args: KenBurnsArgs,
): CSSProperties {
  if (!preset) return {};
  const { frame, durationInFrames, seed = 0, speed = 1 } = args;
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (preset === "float") {
    const t = frame * FLOAT_SPEED * speed + seed;
    const dx = Math.cos(t) * FLOAT_DRIFT_PX;
    const dy = Math.sin(t * 1.2) * FLOAT_DRIFT_PX * 0.87;
    const rotation = Math.sin(t * 0.7 + seed) * FLOAT_TILT_DEG;
    const breathe = 1 + Math.sin(t * 0.5 + seed) * FLOAT_BREATHE;
    return {
      transform: `translate(${dx}px, ${dy}px) rotate(${rotation}deg) scale(${breathe})`,
    };
  }
  if (preset === "rotateCW" || preset === "rotateCCW") {
    const direction = preset === "rotateCW" ? 1 : -1;
    const rotation = frame * ROTATE_DEG_PER_FRAME * speed * direction;
    return { transform: `rotate(${rotation}deg)` };
  }
  switch (preset) {
    case "zoomIn": {
      const scale = interpolate(progress, [0, 1], ZOOM_RANGE);
      return { transform: `scale(${scale})` };
    }
    case "zoomOut": {
      const scale = interpolate(
        progress,
        [0, 1],
        [...ZOOM_RANGE].reverse() as [number, number],
      );
      return { transform: `scale(${scale})` };
    }
    case "panLeft": {
      const x = interpolate(progress, [0, 1], [PAN_RANGE, -PAN_RANGE]);
      return { transform: `scale(${PAN_SCALE}) translate(${x}%, 0)` };
    }
    case "panRight": {
      const x = interpolate(progress, [0, 1], [-PAN_RANGE, PAN_RANGE]);
      return { transform: `scale(${PAN_SCALE}) translate(${x}%, 0)` };
    }
    case "panUp": {
      const y = interpolate(progress, [0, 1], [PAN_RANGE, -PAN_RANGE]);
      return { transform: `scale(${PAN_SCALE}) translate(0, ${y}%)` };
    }
    case "panDown": {
      const y = interpolate(progress, [0, 1], [-PAN_RANGE, PAN_RANGE]);
      return { transform: `scale(${PAN_SCALE}) translate(0, ${y}%)` };
    }
    default:
      return {};
  }
}
