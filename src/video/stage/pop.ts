import { interpolate, spring } from "remotion";
import { springs } from "../motion/easing";

// Įėjimas su atšokimu: 0 → 1 (spyruoklė perlekia ~12 % ir grįžta).
export function pop(frame: number, at: number, fps: number) {
  return spring({ frame: frame - at, fps, config: springs.bouncy });
}
// Ramus įėjimas (be didelio atšokimo) – ilgesniems judesiams.
export function settle(frame: number, at: number, fps: number) {
  return spring({ frame: frame - at, fps, config: springs.settle });
}
// Linijinis 0 → 1 per `duration` kadrų nuo `at`.
export function ramp(frame: number, at: number, duration: number) {
  return interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}
