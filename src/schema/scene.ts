import { z } from "zod";
import { visualConfigSchema } from "./visual";
export const backgroundIdSchema = z.enum([
  "solid-dark",
  "soft-grid",
  "orange-glow",
  "perspective-data-grid",
  "floating-glass-layers",
  "dot-grid",
  "spotlight",
]);
export const scenePlanRoleSchema = z.enum([
  "hook",
  "problem",
  "reveal",
  "benefit",
  "mechanism",
  "setup",
  "demo",
  "proof",
  "payoff",
  "cta",
]);
export const scenePlanSchema = z.object({
  role: scenePlanRoleSchema,
  purpose: z.string().optional(),
  visualBrief: z.string().optional(),
});
export const backgroundFillSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("solid"), color: z.string() }),
  z.object({
    kind: z.literal("gradient"),
    colors: z.array(z.string()).min(2).max(3),
    angle: z.number().min(0).max(360).optional(),
    shape: z.enum(["linear", "radial"]).optional(),
  }),
  z.object({ kind: z.literal("image"), src: z.string() }),
]);
export const backgroundGridSchema = z.enum(["none", "lines", "dots"]);
export const customBackgroundSchema = z.object({
  type: z.literal("custom"),
  fill: backgroundFillSchema,
  grid: backgroundGridSchema.optional(),
});
export const sceneBackgroundSchema = z.union([
  backgroundIdSchema,
  customBackgroundSchema,
]);
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
const sideContentSchema = z.object({
  label: z.string().optional(),
  headline: z.string().optional(),
  body: z.string().optional(),
  visual: visualConfigSchema.optional(),
  visualEntrance: entrancePresetSchema.optional(),
  visualExit: exitPresetSchema.optional(),
  visualEntranceDuration: z.number().min(1).max(60).optional(),
  visualExitDuration: z.number().min(1).max(60).optional(),
  visualEntranceDistance: z.number().min(0).max(2400).optional(),
  visualExitDistance: z.number().min(0).max(2400).optional(),
  visualScale: z.number().positive().optional(),
  visualKenBurns: kenBurnsPresetSchema.optional(),
  visualKenBurnsSpeed: z.number().min(0.1).max(5).optional(),
  visualSfx: z.string().optional(),
  visualExitSfx: z.string().optional(),
});
const stepItemSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
  lane: z.number().int().min(0).max(24).optional(),
  delay: z.number().min(0).optional(),
  exitAt: z.number().min(0).optional(),
});
const richHeadlineLineSchema = z.object({
  text: z.string(),
  size: richTextSizeSchema,
  sizePx: z.number().min(8).max(400).optional(),
  font: richTextFontSchema.optional(),
  textCase: textCaseSchema.optional(),
  letterSpacing: z.number().min(-20).max(80).optional(),
  pill: z.boolean().optional(),
  color: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
  animation: entrancePresetSchema.optional(),
  entranceDuration: z.number().min(1).max(90).optional(),
  delay: z.number().min(0).optional(),
  exitAt: z.number().min(0).optional(),
  entranceDistance: z.number().min(0).max(2400).optional(),
  exit: exitPresetSchema.optional(),
  exitDistance: z.number().min(0).max(2400).optional(),
  exitDuration: z.number().min(1).max(60).optional(),
  exitDelay: z.number().min(-60).max(60).optional(),
  splitBy: richTextSplitBySchema.optional(),
  splitDuration: z.number().min(0).max(300).optional(),
  lane: z.number().int().min(0).max(24).optional(),
  sfx: z.string().optional(),
  sfxAt: z.number().min(0).optional(),
});
const positionedVisualSchema = z.object({
  id: z.string(),
  visual: visualConfigSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  scale: z.number().positive().optional(),
  entrance: entrancePresetSchema.optional(),
  entranceDuration: z.number().min(1).max(60).optional(),
  exit: exitPresetSchema.optional(),
  exitDuration: z.number().min(1).max(60).optional(),
  entranceDistance: z.number().min(0).max(2400).optional(),
  exitDistance: z.number().min(0).max(2400).optional(),
  delay: z.number().min(0).optional(),
  exitAt: z.number().min(0).optional(),
  sfx: z.string().optional(),
  sfxAt: z.number().min(0).optional(),
  sfxStartFrom: z.number().min(0).optional(),
  sfxDuration: z.number().min(1).optional(),
  exitSfx: z.string().optional(),
  exitSfxAt: z.number().min(0).optional(),
  exitSfxStartFrom: z.number().min(0).optional(),
  exitSfxDuration: z.number().min(1).optional(),
  link: z
    .object({
      groupId: z.string(),
      glideLead: z.number().min(0).max(60).optional(),
      glideDuration: z.number().min(1).max(90).optional(),
    })
    .optional(),
  kenBurns: kenBurnsPresetSchema.optional(),
  kenBurnsSpeed: z.number().min(0.1).max(5).optional(),
  lane: z.number().int().min(0).max(24).optional(),
  keyframes: z
    .array(
      z.object({
        id: z.string(),
        frame: z.number().min(0),
        x: z.number().min(0).max(100).optional(),
        y: z.number().min(0).max(100).optional(),
        scale: z.number().positive().optional(),
      }),
    )
    .max(20)
    .optional(),
});
export const blockTypeSchema = z.enum(["text", "badge"]);
const blockSchema = z.object({
  id: z.string(),
  type: blockTypeSchema,
  text: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  size: z.number().positive().optional(),
  color: z.string().optional(),
  font: richTextFontSchema.optional(),
  textCase: textCaseSchema.optional(),
  letterSpacing: z.number().optional(),
  animation: entrancePresetSchema.optional(),
  entranceDuration: z.number().min(1).max(90).optional(),
  exit: exitPresetSchema.optional(),
  exitDuration: z.number().min(1).max(90).optional(),
  splitBy: richTextSplitBySchema.optional(),
  splitDuration: z.number().min(0).max(300).optional(),
  lane: z.number().int().min(0).max(24).optional(),
  delay: z.number().min(0).optional(),
  exitAt: z.number().min(0).optional(),
  sfx: z.string().optional(),
});
const baseSceneFields = {
  id: z.string(),
  plan: scenePlanSchema.optional(),
  durationSeconds: z.number().positive().optional(),
  timelineRange: z
    .object({
      from: z.number().min(0),
      durationInFrames: z.number().min(1),
    })
    .optional(),
  vo: z.string().optional(),
  notes: z.string().optional(),
  background: sceneBackgroundSchema,
  content: z.object({
    eyebrow: z.string().optional(),
    headline: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    left: sideContentSchema.optional(),
    right: sideContentSchema.optional(),
    items: z.array(stepItemSchema).optional(),
    richHeadline: z.array(richHeadlineLineSchema).max(6).optional(),
    richHeadlineY: z.number().min(0).max(100).optional(),
    richHeadlineX: z.number().min(0).max(100).optional(),
    blocks: z.array(blockSchema).max(8).optional(),
    visuals: z.array(positionedVisualSchema).optional(),
  }),
  layout: layoutIdSchema.optional(),
  motion: z
    .object({
      entrance: entrancePresetSchema.optional(),
      entranceDuration: z.number().min(1).max(60).optional(),
      exit: exitPresetSchema.optional(),
      exitDuration: z.number().min(1).max(60).optional(),
      entranceDistance: z.number().min(0).max(2400).optional(),
      exitDistance: z.number().min(0).max(2400).optional(),
      transition: transitionPresetSchema.optional(),
      stagger: z.number().min(0).optional(),
      startDelay: z.number().min(0).optional(),
      exitAt: z.number().min(0).optional(),
      sfx: z.string().optional(),
      exitSfx: z.string().optional(),
      sfxAt: z.number().min(0).optional(),
      exitSfxAt: z.number().min(0).optional(),
      sfxStartFrom: z.number().min(0).optional(),
      sfxDuration: z.number().min(1).optional(),
      exitSfxStartFrom: z.number().min(0).optional(),
      exitSfxDuration: z.number().min(1).optional(),
    })
    .optional(),
};
export const sceneSchema = z.object({
  ...baseSceneFields,
  type: sceneTypeSchema,
});
export type Scene = z.infer<typeof sceneSchema>;
export type ScenePlanRole = z.infer<typeof scenePlanRoleSchema>;
export type BackgroundId = z.infer<typeof backgroundIdSchema>;
export type BackgroundFill = z.infer<typeof backgroundFillSchema>;
export type BackgroundGrid = z.infer<typeof backgroundGridSchema>;
export type CustomBackground = z.infer<typeof customBackgroundSchema>;
export type SceneBackground = z.infer<typeof sceneBackgroundSchema>;
export type EntrancePreset = z.infer<typeof entrancePresetSchema>;
export type ExitPreset = z.infer<typeof exitPresetSchema>;
export type KenBurnsPreset = z.infer<typeof kenBurnsPresetSchema>;
export type TransitionPreset = z.infer<typeof transitionPresetSchema>;
export type SceneType = z.infer<typeof sceneTypeSchema>;
export type LayoutId = z.infer<typeof layoutIdSchema>;
export type SideContent = z.infer<typeof sideContentSchema>;
export type StepItem = z.infer<typeof stepItemSchema>;
export type RichHeadlineLine = z.infer<typeof richHeadlineLineSchema>;
export type RichTextSize = z.infer<typeof richTextSizeSchema>;
export type RichTextFont = z.infer<typeof richTextFontSchema>;
export type TextCase = z.infer<typeof textCaseSchema>;
export type RichTextSplitBy = z.infer<typeof richTextSplitBySchema>;
export type Block = z.infer<typeof blockSchema>;
export type BlockType = z.infer<typeof blockTypeSchema>;
export type VisualPosition = {
  x: number;
  y: number;
};
export type PositionedVisualEntry = z.infer<typeof positionedVisualSchema>;
