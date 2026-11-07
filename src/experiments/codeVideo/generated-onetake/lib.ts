import { Easing, interpolate } from "remotion";
import type { FreeScene } from "../FreeVideo";

// One look for the whole video: near-black, one text colour, ONE accent.
export const C = {
  bg: "#08090C",
  card: "#121419",
  cardTop: "#171A20",
  border: "rgba(255,255,255,0.09)",
  text: "#ECEDEF",
  dim: "rgba(236,237,239,0.42)",
  faint: "rgba(236,237,239,0.16)",
  accent: "#FF7A45",
};
export const MONO = 'Consolas, "JetBrains Mono", "SF Mono", Menlo, monospace';
export const DISPLAY = '"ClashDisplay-Semibold", "Segoe UI", sans-serif';

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const POP = Easing.bezier(0.34, 1.45, 0.64, 1);

export function ramp(
  f: number,
  a: number,
  b: number,
  from = 0,
  to = 1,
  easing: (t: number) => number = EASE,
) {
  if (b <= a) return f >= a ? to : from;
  return interpolate(f, [a, b], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

export const lin = (t: number) => t;

/** Opacity of something that lives in [start, end): fades in, fades out. */
export function life(f: number, start: number, end: number, fadeIn = 10, fadeOut = 6) {
  return Math.min(ramp(f, start, start + fadeIn), 1 - ramp(f, end - fadeOut, end));
}

export function typed(text: string, f: number, start: number, framesPerChar = 1.6) {
  const n = Math.max(0, Math.floor((f - start) / framesPerChar) + 1);
  return f < start ? "" : text.slice(0, n);
}

export function fmtTokens(n: number) {
  if (n < 1000) return `${Math.round(n)}`;
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

// ---------------------------------------------------------------- the card

export type Pose = { cx: number; cy: number; w: number; h: number; r: number };
export type Key = { at: number; pose: Pose; dur?: number; easing?: (t: number) => number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The ONE main element's pose: each key morphs from wherever the card was. */
export function poseAt(keys: Key[], f: number): Pose {
  const upTo = (i: number, t: number): Pose => {
    if (i === 0) return keys[0].pose;
    const k = keys[i];
    if (t < k.at) return upTo(i - 1, t);
    const from = upTo(i - 1, k.at);
    const e = ramp(t, k.at, k.at + (k.dur ?? 20), 0, 1, k.easing ?? EASE);
    return {
      cx: lerp(from.cx, k.pose.cx, e),
      cy: lerp(from.cy, k.pose.cy, e),
      w: lerp(from.w, k.pose.w, e),
      h: lerp(from.h, k.pose.h, e),
      r: lerp(from.r, k.pose.r, e),
    };
  };
  return upTo(keys.length - 1, f);
}

export const POSES = {
  term: { cx: 540, cy: 690, w: 900, h: 1000, r: 40 },
  counter: { cx: 540, cy: 640, w: 780, h: 640, r: 64 },
  bubble: { cx: 540, cy: 820, w: 900, h: 200, r: 100 },
  chat: { cx: 540, cy: 690, w: 880, h: 1000, r: 40 },
  tree: { cx: 540, cy: 690, w: 860, h: 1000, r: 40 },
  diff: { cx: 540, cy: 690, w: 960, h: 800, r: 40 },
  session: { cx: 540, cy: 680, w: 860, h: 900, r: 40 },
  squash: { cx: 540, cy: 680, w: 560, h: 120, r: 60 },
  editor: { cx: 540, cy: 690, w: 900, h: 760, r: 40 },
} satisfies Record<string, Pose>;

// ---------------------------------------------------------------- timeline

export type Timeline = {
  B: number[]; // scene starts
  E: number[]; // scene ends (next scene's start)
  end: number;
  W: (s: number, i: number) => number; // global frame of word i of scene s
  keys: Key[];
  restarts: number[]; // scene 7 session restarts
  diffAt: number;
  loadAt: number;
  clearAt: number;
};

export function buildTimeline(scenes: FreeScene[], end: number): Timeline {
  const B = scenes.map((s) => s.from);
  const E = scenes.map((s, i) => (i + 1 < scenes.length ? scenes[i + 1].from : end));
  const W = (s: number, i: number) => {
    const sc = scenes[s];
    if (!sc) return 0;
    return sc.words[i]?.frame ?? sc.from + i * 10;
  };
  const restarts = [B[6], W(6, 4) - 3, W(6, 9) - 3, W(6, 12) - 3];
  const diffAt = W(5, 16) - 3;
  const loadAt = W(7, 6) - 4;
  const clearAt = W(3, 4) + 8;

  const keys: Key[] = [
    { at: 0, pose: POSES.term },
    { at: B[1] - 2, pose: POSES.counter },
    { at: B[2] - 2, pose: POSES.bubble, dur: 22 },
    { at: W(2, 6) - 3, pose: POSES.chat, dur: 26 },
    { at: B[3] - 2, pose: POSES.term },
    { at: B[4] - 2, pose: POSES.tree },
    { at: diffAt, pose: POSES.diff, dur: 16 },
    { at: B[6] - 2, pose: POSES.squash, dur: 8 },
    { at: B[6] + 6, pose: POSES.session, dur: 16, easing: POP },
  ];
  for (const r of restarts.slice(1)) {
    keys.push({ at: r, pose: POSES.squash, dur: 7 });
    keys.push({ at: r + 7, pose: POSES.session, dur: 14, easing: POP });
  }
  keys.push({ at: B[7] - 2, pose: POSES.editor });
  keys.push({ at: loadAt, pose: POSES.squash, dur: 7 });
  keys.push({ at: loadAt + 7, pose: POSES.term, dur: 16, easing: POP });
  keys.push({ at: B[8] - 2, pose: POSES.term });
  keys.sort((a, b) => a.at - b.at);
  return { B, E, end, W, keys, restarts, diffAt, loadAt, clearAt };
}

export function sceneAt(T: Timeline, f: number) {
  let s = 0;
  for (let i = 0; i < T.B.length; i++) if (T.B[i] <= f) s = i;
  return s;
}
