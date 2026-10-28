import { z } from "zod";

// Everything TikMaker can render, in one place. The editor, the knowledge base
// and the agent choose only from these lists. What we SAW in the analysed videos
// is a different list: src/knowledge/analysisVocabulary.ts.

export const backgroundIdSchema = z.enum([
  "solid-dark",
  "soft-grid",
  "orange-glow",
  "perspective-data-grid",
  "floating-glass-layers",
  "dot-grid",
  "spotlight",
]);

export const backgroundGridSchema = z.enum(["none", "lines", "dots"]);
export const entrancePresetSchema = z.enum([
  "none",
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleIn",
  "pop",
  "zoomSettleRight",
  "zoomSettleLeft",
  "zoomSettleTop",
  "zoomSettleBottom",
  "zoomIn",
  "blurIn",
  "spinIn",
  "flipIn",
  "bounceIn",
  "dropIn",
  "rollIn",
]);
export const exitPresetSchema = z.enum([
  "none",
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleOut",
  "burstOut",
  "zoomOut",
  "blurOut",
  "spinOut",
  "flipOut",
  "dropOut",
  "rollOut",
]);
export const kenBurnsPresetSchema = z.enum([
  "zoomIn",
  "zoomOut",
  "panLeft",
  "panRight",
  "panUp",
  "panDown",
  "float",
  "rotateCW",
  "rotateCCW",
]);
export const layoutIdSchema = z.enum([
  "visual-hero",
  "visual-top",
  "visual-bottom",
  "icon-corner-tr",
  "icon-corner-tl",
  "icon-corner-br",
  "icon-corner-bl",
  "text-only",
]);
export const transitionPresetSchema = z.enum([
  "cut",
  "push",
  "slideLeft",
  "slideRight",
  "slideUp",
  "slideDown",
]);
export const richTextSizeSchema = z.enum([
  "hero",
  "headline",
  "title",
  "bodyLarge",
  "body",
  "label",
]);
export const richTextFontSchema = z.enum([
  "tanker",
  "clash",
  "clashMedium",
  "clashSemibold",
  "clashBold",
  "panchangMedium",
  "panchangSemibold",
]);
export const textCaseSchema = z.enum(["upper", "lower", "none"]);
export const richTextSplitBySchema = z.enum(["word", "letter", "line"]);
export const sceneTypeSchema = z.enum([
  "hook-centered",
  "hook-visual",
  "visual-explainer",
  "screen-demo",
  "takeaway",
  "comparison",
  "steps",
]);
export const blockTypeSchema = z.enum(["text", "badge"]);
// Every visual TikMaker can draw (the "type" of VisualConfig in visual.ts).
export const visualTypeSchema = z.enum([
  "tool-logo",
  "tool-flow",
  "prop",
  "image",
  "recording",
  "browser",
  "screen",
  "phone",
  "stat-counter",
  "checklist",
  "checkpoint",
  "pricing-card",
  "app-mockup",
  "progress",
  "keycap",
  "claude-cli",
  "terminal",
  "code-diff",
  "flow",
  "node-group",
  "stack",
  "grid",
  "highlight",
  "transform",
  "corner-props",
]);
