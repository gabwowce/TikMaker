import { stage } from "./tokens";

// The stage types (docs/motion-planas.md, "Captionai ir stage"): where the
// picture and the captions go in a frame. A code scene's stage ("top", or
// "full" for a full-screen recording) tells the captions where to sit.
// A leaf module (no React): the scene schema reads the ids.

export const stageTypeIds = [
  "top", // the picture on top, the captions below – most scenes
  "bottom", // the captions on top, the picture below – for variety
  "statement", // no picture: one big phrase – a hook, a claim, a conclusion
  "full", // the picture over the whole frame, the captions on it – recordings
  // (a screen fills all 1080x1920; any other block is drawn a little bigger)
  "split", // a main picture and a small one under it – the thing and what goes
  // with it; never two equal pictures, which leave the eye nowhere to land
] as const;
export type StageType = (typeof stageTypeIds)[number];

// Where the top zone goes: its centre's y on the frame, and its scale.
export type ZonePlacement = { y: number; scale: number };
export type StageLayout = {
  visuals: ZonePlacement[];
  // the captions' top edge (px) and how much bigger or smaller they are
  caption: { top: number; scale: number };
};

// ── Pictures and captions never overlap ───────────────────────────────────
// Measured, not judged: the band a picture covers and the band the spoken
// words take are both known numbers, so the code keeps them apart (the
// review of the frames kept finding a node under the caption – the old split
// put its lower picture down to 1399 px, the caption started at 1450 and a
// third line or a glide reached into it).

// The vertical band (px) a block covers at a centre y and a scale: blocks are
// drawn for the top zone and scaled about its centre.
export function zoneBand(y: number, scale: number): [number, number] {
  const half = ((stage.visualBottom - stage.visualTop) * scale) / 2;
  return [y - half, y + half];
}

// How many lines a caption phrase may wrap to (2–3 words a phrase).
export const CAPTION_LINES = 2;
// The band the spoken words take where a stage type puts them.
export function captionBand(layout: StageLayout): [number, number] {
  const line = stage.captionSize * stage.captionLine;
  const height = (CAPTION_LINES * line + 6) * layout.caption.scale;
  return [layout.caption.top, layout.caption.top + height];
}

// Stage types whose captions sit ON the picture by design: a recording over
// the whole frame (full).
export const CAPTIONS_OVER_PICTURE: StageType[] = ["full"];

export const overlaps = (a: [number, number], b: [number, number]) =>
  a[0] < b[1] && b[0] < a[1];

// Does a picture at this pose run into the captions of this stage type?
export function coversCaption(
  type: StageType,
  y: number,
  scale: number,
): boolean {
  if (CAPTIONS_OVER_PICTURE.includes(type)) return false;
  return overlaps(zoneBand(y, scale), captionBand(STAGE_LAYOUTS[type]));
}

export const STAGE_LAYOUTS: Record<StageType, StageLayout> = {
  top: {
    visuals: [{ y: stage.visualCenterY, scale: 1 }],
    caption: { top: stage.captionTop, scale: 1 },
  },
  bottom: {
    visuals: [{ y: 1080, scale: 1 }],
    caption: { top: 300, scale: 1 },
  },
  statement: {
    visuals: [],
    caption: { top: 640, scale: 1.4 },
  },
  // the picture is the whole frame here (a full-screen recording), centred
  full: {
    visuals: [{ y: 960, scale: 1 }],
    caption: { top: 1400, scale: 0.9 },
  },
  // The first place is the main picture (80 %), the second a small one under
  // it (40 %). Two at 68 % each (test 10) had no hierarchy: two diagrams of
  // the same weight, both with text too small to read.
  split: {
    visuals: [
      { y: 600, scale: 0.8 },
      { y: 1135, scale: 0.4 },
    ],
    caption: { top: 1340, scale: 0.85 },
  },
};
