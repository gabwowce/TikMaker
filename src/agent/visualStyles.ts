import { z } from "zod";

// The visual styles a video can be made in (docs/tikmaker-kryptis.md). Each
// is a skill in .claude/skills/ that the code step reads on top of the shared
// scene contract (tikmaker-scene), with its own example frames. Picked in the
// form; one video is in one style.
export const visualStyleId = z.enum(["clear", "depth"]);
export type VisualStyleId = z.infer<typeof visualStyleId>;

export type VisualStyle = {
  id: VisualStyleId;
  label: string;
  // one line for the form
  description: string;
  // the style skill (.claude/skills/<skill>/SKILL.md)
  skill: string;
  // the style's example frames, for the review: a sheet in
  // knowledge/shared/reference-frames.json, or the skill's own references
  // folder (every .jpg / .png in it)
  reviewSheet?: string;
  reviewImagesDir?: string;
  // what the review judges the style by
  reviewNote: string;
};

export const VISUAL_STYLES: Record<VisualStyleId, VisualStyle> = {
  clear: {
    id: "clear",
    label: "Clear",
    description: "Few big flat shapes and icons, text as grey bars, one orange focus, calm dark space",
    skill: "tikmaker-explainer",
    reviewSheet: "icon-minimal",
    reviewNote: "STYLE clear: few big flat shapes, no text to read, one orange focus",
  },
  depth: {
    id: "depth",
    label: "Depth",
    description: "Glass cards tilted in 3D, springy motion, a dock, a camera that never stops, a new background colour every scene",
    skill: "tikmaker-depth",
    reviewImagesDir: ".claude/skills/tikmaker-depth/references",
    reviewNote:
      "STYLE depth: 2.5D glass cards tilted in perspective, one focal card ~78 % wide, layered depth, a scene-coloured background orb, max 5 headline words",
  },
};

// The review sheets that belong to a style – the others' are left out, so a
// video is not judged by another style's look.
export const STYLE_SHEETS = Object.values(VISUAL_STYLES).flatMap((style) =>
  style.reviewSheet ? [style.reviewSheet] : [],
);
