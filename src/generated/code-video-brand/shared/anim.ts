import { createContext, useContext } from "react";
import { Easing, interpolate } from "remotion";
import type { FreeScene } from "../../../experiments/codeVideo/FreeVideo";

// Motion vocabulary of the brand kit: decelerating entrances, bouncy only for
// stickers and small icons, fast accelerating exits.
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const EXIT = Easing.bezier(0.7, 0, 0.84, 0);

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0 → 1 between frames a and b.
export function ramp(f: number, a: number, b: number, easing = EASE) {
  if (b <= a) return f >= b ? 1 : 0;
  return interpolate(f, [a, b], [0, 1], { ...CLAMP, easing });
}

// Linear map with clamping on both sides.
export function lerp(f: number, a: number, b: number, from: number, to: number) {
  if (b <= a) return f >= b ? to : from;
  return interpolate(f, [a, b], [from, to], CLAMP);
}

// A card entrance with the kit's 1.02 overshoot.
export function popScale(f: number, start: number, len = 12, from = 0.9) {
  return interpolate(f, [start, start + len * 0.7, start + len], [from, 1.02, 1], {
    ...CLAMP,
    easing: EASE,
  });
}

// The part of `text` typed so far between frames a and b.
export function typed(text: string, f: number, a: number, b: number) {
  const n = Math.round(lerp(f, a, b, 0, text.length));
  return text.slice(0, n);
}

// Every spoken word's frame from the brief, scene-local – the fallback when a
// clip carries no word timings.
const BRIEF: number[][] = [
  [0, 5, 13, 20, 26, 33, 37, 53, 58, 63, 69],
  [0, 9, 18, 26, 39, 50, 54, 68, 70, 90, 97, 102, 104],
  [0, 20, 28, 37, 55, 64, 74, 85, 88, 95, 115, 121, 124, 135, 148, 156, 160, 165, 168],
  [0, 6, 27, 40, 51, 62, 68, 71, 79, 99, 103, 111],
  [0, 21, 29, 32, 38, 42, 49, 76, 88, 93, 111, 119, 122, 133],
  [0, 21, 29, 32, 35, 38, 59, 66, 75, 90, 94, 97, 106, 117, 123, 163, 167, 173, 191],
  [0, 22, 29, 68, 77, 87, 94, 110, 115, 117, 134, 138, 154, 163],
  [0, 7, 10, 23, 30, 35, 69, 74, 83, 91, 108, 115, 118, 125, 130, 138],
  [0, 8, 10, 20, 23, 26, 32, 38, 56, 65, 70, 78],
];

export type Timeline = {
  scenes: FreeScene[];
  // global frame of word i in scene s
  w: (s: number, i: number) => number;
  // global frame scene s starts / ends
  start: (s: number) => number;
  end: (s: number) => number;
  // the frame the picture switches to scene s's state
  cut: (s: number) => number;
};

export function makeTimeline(scenes: FreeScene[]): Timeline {
  const start = (s: number) => scenes[s]?.from ?? 0;
  const end = (s: number) =>
    scenes[s] ? scenes[s].from + scenes[s].durationInFrames : 0;
  return {
    scenes,
    start,
    end,
    w: (s, i) => scenes[s]?.words[i]?.frame ?? start(s) + (BRIEF[s]?.[i] ?? 0),
    // a few frames before the scene's first word, so the new state has landed
    // as the word is spoken
    cut: (s) => (s === 0 ? 0 : Math.max(start(s) - 4, end(s - 1) - 16)),
  };
}

export const TimelineContext = createContext<Timeline | null>(null);
export function useTimeline(): Timeline {
  const t = useContext(TimelineContext);
  if (!t) throw new Error("TimelineContext missing");
  return t;
}
