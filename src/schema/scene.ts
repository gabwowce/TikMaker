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

export const entrancePresetSchema = z.enum([
  "fade",
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleIn",
  "pop",
]);
export const exitPresetSchema = z.enum(["fade", "slideUp", "slideDown", "slideLeft", "slideRight", "scaleOut"]);
export const transitionPresetSchema = z.enum(["cut", "push"]);
export const richTextSizeSchema = z.enum(["hero", "headline", "title", "bodyLarge", "body", "label"]);
export const richTextFontSchema = z.enum(["tanker", "clash"]);
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
});

const stepItemSchema = z.object({
  label: z.string(),
  value: z.string().optional(),
});

const richHeadlineLineSchema = z.object({
  text: z.string(),
  size: richTextSizeSchema,
  font: richTextFontSchema.optional(),
  pill: z.boolean().optional(),
  animation: entrancePresetSchema.optional(),
  splitBy: richTextSplitBySchema.optional(),
});

const positionedVisualSchema = z.object({
  id: z.string(),
  visual: visualConfigSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  scale: z.number().positive().optional(),
  entrance: entrancePresetSchema.optional(),
  exit: exitPresetSchema.optional(),
  exitDuration: z.number().min(1).max(60).optional(),
  delay: z.number().min(0).optional(),
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
  letterSpacing: z.number().optional(),
  animation: entrancePresetSchema.optional(),
  splitBy: richTextSplitBySchema.optional(),
  delay: z.number().min(0).optional(),
});

const baseSceneFields = {
  id: z.string(),
  durationSeconds: z.number().positive(),
  background: backgroundIdSchema,
  content: z.object({
    eyebrow: z.string().optional(),
    headline: z.string().optional(),
    body: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    badge: z.string().optional(),
    left: sideContentSchema.optional(),
    right: sideContentSchema.optional(),
    items: z.array(stepItemSchema).optional(),
    richHeadline: z.array(richHeadlineLineSchema).max(6).optional(),
    blocks: z.array(blockSchema).max(8).optional(),
    visuals: z.array(positionedVisualSchema).max(6).optional(),
  }),
  visual: visualConfigSchema.optional(),
  visualPosition: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
    .optional(),
  /** Independent of `motion.entrance`/`motion.exit` (the rest of the scene) —
   * lets a visual have its own in/out animation. Falls back to `motion.entrance`
   * when unset; `visualExit` defaults to no exit (stays until the scene cuts). */
  visualEntrance: entrancePresetSchema.optional(),
  visualExit: exitPresetSchema.optional(),
  visualExitDuration: z.number().min(1).max(60).optional(),
  motion: z
    .object({
      entrance: entrancePresetSchema.optional(),
      exit: exitPresetSchema.optional(),
      exitDuration: z.number().min(1).max(60).optional(),
      transition: transitionPresetSchema.optional(),
      stagger: z.number().min(0).optional(),
    })
    .optional(),
  sound: z.array(z.string()).optional(),
};

export const sceneSchema = z.object({
  ...baseSceneFields,
  type: sceneTypeSchema,
});

export type Scene = z.infer<typeof sceneSchema>;
export type BackgroundId = z.infer<typeof backgroundIdSchema>;
export type EntrancePreset = z.infer<typeof entrancePresetSchema>;
export type ExitPreset = z.infer<typeof exitPresetSchema>;
export type TransitionPreset = z.infer<typeof transitionPresetSchema>;
export type SceneType = z.infer<typeof sceneTypeSchema>;
export type SideContent = z.infer<typeof sideContentSchema>;
export type StepItem = z.infer<typeof stepItemSchema>;
export type RichHeadlineLine = z.infer<typeof richHeadlineLineSchema>;
export type RichTextSize = z.infer<typeof richTextSizeSchema>;
export type RichTextFont = z.infer<typeof richTextFontSchema>;
export type RichTextSplitBy = z.infer<typeof richTextSplitBySchema>;
export type Block = z.infer<typeof blockSchema>;
export type BlockType = z.infer<typeof blockTypeSchema>;
export type VisualPosition = { x: number; y: number };
export type PositionedVisualEntry = z.infer<typeof positionedVisualSchema>;
