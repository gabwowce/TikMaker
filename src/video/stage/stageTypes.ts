import { stage } from "./tokens";

// The stage types (docs/motion-planas.md, "Captionai ir stage"): where the
// picture and the captions go in a frame. Every block is drawn for the top
// zone (stage.visualTop..visualBottom, full width); a type places that zone –
// moves its centre and scales it – so a block never needs to know the type.
// A leaf module (no React): the scene schema reads the ids.

export const stageTypeIds = [
  "top", // the picture on top, the captions below – most scenes
  "bottom", // the captions on top, the picture below – for variety
  "statement", // no picture: one big phrase – a hook, a claim, a conclusion
  "full", // the picture over the whole frame, the captions on it – recordings
  "split", // two pictures, one above the other – before / after
] as const;
export type StageType = (typeof stageTypeIds)[number];

// Where the top zone goes: its centre's y on the frame, and its scale.
export type ZonePlacement = { y: number; scale: number };
export type StageLayout = {
  visuals: ZonePlacement[];
  // the captions' top edge (px) and how much bigger or smaller they are
  caption: { top: number; scale: number };
};

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
  full: {
    visuals: [{ y: 860, scale: 1.12 }],
    caption: { top: 1400, scale: 0.9 },
  },
  split: {
    visuals: [
      { y: 520, scale: 0.68 },
      { y: 1110, scale: 0.68 },
    ],
    caption: { top: 1450, scale: 0.8 },
  },
};
