import { interpolate } from "remotion";
import type { CSSProperties } from "react";
import type { KenBurnsPreset } from "../../schema/scene";

type KenBurnsArgs = {
  frame: number;
  durationInFrames: number;
  /** Phase offset for the cyclic "float" preset, so two visuals using it don't
   * drift in lockstep. Ignored by every other preset (they're one-way ramps
   * over the duration, with nothing to de-synchronise). */
  seed?: number;
  /** Rate multiplier for the CYCLIC presets (`float`, `rotateCW`/`rotateCCW`)
   * — 1 = default pace, 2 = twice as fast, 0.5 = half. No effect on the
   * duration-sized ramps (`zoomIn`/`panLeft`/etc), which have no "rate" to
   * scale independent of how long the visual is on screen. */
  speed?: number;
};

/** How far a "zoom" preset scales over the full duration, and how far a "pan"
 * preset drifts (as a % of the element's own size, via `translate`) while
 * holding a fixed scale so panning never reveals empty space at the edges. */
const ZOOM_RANGE: [number, number] = [1, 1.14];
const PAN_SCALE = 1.1;
const PAN_RANGE = 4; // percent

/** "float" drift — carried over from the old CornerFloat composition so a
 * split-out corner prop moves exactly as it did when it was half of one. */
const FLOAT_SPEED = 0.011;
const FLOAT_DRIFT_PX = 30;
const FLOAT_TILT_DEG = 11;
const FLOAT_BREATHE = 0.05;

/** Degrees per frame for "rotateCW"/"rotateCCW" — a full turn every ~10s at
 * 30fps. Driven by raw frames, same reasoning as "float": the spin rate stays
 * constant regardless of how long the scene is, instead of always completing
 * exactly one lap by the last frame. */
const ROTATE_DEG_PER_FRAME = 1.2;

/** A slow, continuous zoom/pan applied for the ENTIRE time a visual is on
 * screen — the "alive" motion behind every mockup/screenshot in a polished
 * TikTok/Reels edit, as opposed to `entrances.ts`/`exits.ts` which only
 * animate the first/last ~18 frames. Always linear (no spring, no easing) so
 * the drift reads as one smooth continuous move rather than settling/decelerating
 * partway through — jarring eases are what make a Ken Burns effect look fake. */
export function kenBurns(preset: KenBurnsPreset | undefined, args: KenBurnsArgs): CSSProperties {
  if (!preset) return {};

  const { frame, durationInFrames, seed = 0, speed = 1 } = args;
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Unlike the ramps below, this one is cyclic: it drifts, tilts and breathes
  // around its resting spot forever instead of travelling from A to B. It's
  // what keeps a prop parked in an empty corner feeling alive, and it's driven
  // by raw frames (not `progress`) so the rhythm is the same in a 2s scene and
  // a 20s one.
  if (preset === "float") {
    const t = frame * FLOAT_SPEED * speed + seed;
    const dx = Math.cos(t) * FLOAT_DRIFT_PX;
    const dy = Math.sin(t * 1.2) * FLOAT_DRIFT_PX * 0.87;
    const rotation = Math.sin(t * 0.7 + seed) * FLOAT_TILT_DEG;
    const breathe = 1 + Math.sin(t * 0.5 + seed) * FLOAT_BREATHE;
    return { transform: `translate(${dx}px, ${dy}px) rotate(${rotation}deg) scale(${breathe})` };
  }

  // Same cyclic reasoning as "float" — a spin has no natural start/end point,
  // so it's driven by raw frames rather than clamped `progress`.
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
      const scale = interpolate(progress, [0, 1], [...ZOOM_RANGE].reverse() as [number, number]);
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
