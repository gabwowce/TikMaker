import { interpolate, spring } from "remotion";
import { springs } from "../motion/easing";

// An entrance with a bounce: 0 → 1 (the spring overshoots ~12 % and returns).
export function pop(frame: number, at: number, fps: number) {
  return spring({ frame: frame - at, fps, config: springs.bouncy });
}
// A calm entrance (no big bounce) – for longer moves.
export function settle(frame: number, at: number, fps: number) {
  return spring({ frame: frame - at, fps, config: springs.settle });
}
// Linear 0 → 1 over `duration` frames from `at`.
export function ramp(frame: number, at: number, duration: number) {
  return interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}
