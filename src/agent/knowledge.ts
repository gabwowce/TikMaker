import { z } from "zod";
import {
  analysisVocabulary,
  type AnalysisVocabularyField,
} from "../knowledge/analysisVocabulary";
import { backgroundIdSchema, richTextFontSchema } from "../schema/capabilities";

// The knowledge base (knowledge/): what the analysis of real videos taught,
// written in TikMaker's own words so the agent can only pick what TikMaker can
// draw. Diagram: docs/bd/diagramos/ziniu-baze.puml.
//
// Every object is .strict(): these files are written by an AI (C2) and then
// by hand, and a misspelled field silently ignored is worse than an error.

// One list from analysis-vocabulary.json as an enum — the same words the
// analysis used, so a knowledge file can't invent a hook type of its own.
// "other" is left out: the analysis needs it for what fits no word, but a
// template or a hook of type "other" tells the agent nothing.
function vocabulary(field: AnalysisVocabularyField) {
  const words = analysisVocabulary[field].filter((word) => word !== "other");
  return z.enum(words as [string, ...string[]]);
}

// The project's scene roles (the same analysis list), minus "other" for the
// same reason. Built like the others rather than with .exclude(): the role
// enum's type is plain string, and excluding from it typed every role as never.
const knowledgeRoleSchema = vocabulary("role");

const secondsRangeSchema = z
  .object({ min: z.number().positive(), max: z.number().positive() })
  .strict()
  .refine((range) => range.min <= range.max, {
    message: "min must not be greater than max",
  });

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "expected #RRGGBB");

// ---- knowledge/workspaces/<id>/ — one channel --------------------------------

export const workspaceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    brief: z.string(),
    audience: z.string(),
    tone: z.string(),
    language: z.string().min(2),
    // The channel's own product as it really looks (for a channel about its
    // product): each screen and what is on it. Scenes that show the product
    // and recording requests describe only these – the model does not know
    // the product and would otherwise invent screens that cannot be recorded.
    screens: z
      .array(z.object({ name: z.string().min(1), shows: z.string().min(1) }))
      .optional(),
  })
  .strict();

export const workspaceStyleSchema = z
  .object({
    backgrounds: z.array(backgroundIdSchema).min(1),
    surface: hexColorSchema,
    textPrimary: hexColorSchema,
    textSecondary: hexColorSchema,
    accent: hexColorSchema,
    headlineFont: richTextFontSchema,
    bodyFont: richTextFontSchema,
  })
  .strict();

// ---- knowledge/shared/ — from the video analysis, shared by every channel ----

// `fixed`: a fact from the idea or the source, never invented.
// `creative`: the agent proposes options — the only place the user chooses.
export const sceneSlotSchema = z
  .object({
    name: z.string().min(1),
    kind: z.enum(["fixed", "creative"]),
  })
  .strict();

export const sceneTemplateSchema = z
  .object({
    role: knowledgeRoleSchema,
    purpose: z.string().min(1),
    seconds: secondsRangeSchema,
    repeatable: z.boolean(),
    optional: z.boolean(),
    connectionToNext: vocabulary("connection"),
    slots: z.array(sceneSlotSchema),
  })
  .strict();

export const actTemplateSchema = z
  .object({
    act: vocabulary("act"),
    scenes: z.array(sceneTemplateSchema).min(1),
  })
  .strict();

export const videoTemplateSchema = z
  .object({
    id: z.string().min(1),
    format: vocabulary("format"),
    name: z.string().min(1),
    oneLine: z.string().min(1),
    whenToUse: z.string().min(1),
    seconds: secondsRangeSchema,
    hookTypes: z.array(vocabulary("hookType")).min(1),
    ctaTypes: z.array(vocabulary("ctaType")).min(1),
    acts: z.array(actTemplateSchema).min(1),
    basedOnAnalysisIds: z.array(z.string()),
  })
  .strict();

// Formulas carry an id so an agent run can record which one it used.
export const hookFormulaSchema = z
  .object({
    id: z.string().min(1),
    type: vocabulary("hookType"),
    formula: z.string().min(1),
    examples: z.array(z.string()).min(1),
    fits: z.array(vocabulary("format")).min(1),
    basedOnAnalysisIds: z.array(z.string()),
  })
  .strict();

export const ctaFormulaSchema = z
  .object({
    id: z.string().min(1),
    type: vocabulary("ctaType"),
    formula: z.string().min(1),
    examples: z.array(z.string()).min(1),
  })
  .strict();

export const titleFormulaSchema = z
  .object({
    id: z.string().min(1),
    formula: z.string().min(1),
    examples: z.array(z.string()).min(1),
    fits: z.array(vocabulary("format")).min(1),
  })
  .strict();

export const transitionPhraseSchema = z
  .object({
    connection: vocabulary("connection"),
    phrases: z.array(z.string()).min(1),
  })
  .strict();

// Thresholds come from the analysis statistics (p90). `check` names a check
// the code implements; C5 narrows it to that list.
export const designRuleSchema = z
  .object({
    id: z.string().min(1),
    check: z.string().min(1),
    min: z.number().optional(),
    max: z.number().optional(),
    level: z.enum(["error", "warning"]),
  })
  .strict();

// Used by code (the sound planner), never by the AI. `sound` is an sfx id.
export const soundRuleSchema = z
  .object({
    event: vocabulary("syncedTo"),
    sound: z.string().min(1),
    maxPerScene: z.number().int().min(0),
  })
  .strict();

// How things should move (docs/motion-planas.md, C): a principle, why it
// works, what it means in TikMaker's own presets, and where it comes from. The
// motion step gives these to the model as knowledge, not as rules – the code
// checks only what follows from how the frame works (checkMotion).
// A principle of motion or of pictures (shared/motion-principles.json,
// shared/picture-principles.json): knowledge for the model, not a rule the
// code enforces. `principle` and `why` are the general idea; `inTikMaker` how
// it applies here, with TikMaker's own starting values. `priority`: how much
// weight the model should give it.
export const motionPrincipleSchema = z
  .object({
    id: z.string().min(1),
    priority: z.enum(["must", "recommended", "optional"]),
    principle: z.string().min(1),
    why: z.string().min(1),
    inTikMaker: z.string().min(1),
    sources: z.array(z.string().url()),
  })
  .strict();

// What the review of the frames checks (shared/review-rubric.json, FR-15):
// "fix" – the scene does not work, the agent changes it; "note" – a matter of
// taste, said but not changed (a reviewer that fixed every taste note would
// keep rewriting a video that already works).
export const reviewCheckSchema = z
  .object({
    id: z.string().min(1),
    level: z.enum(["fix", "note"]),
    check: z.string().min(1),
    fails: z.string().min(1),
  })
  .strict();

// A sheet of good frames the review compares against
// (shared/reference-frames.json; the image beside it in reference-frames/).
export const referenceSheetSchema = z
  .object({
    id: z.string().min(1),
    file: z.string().min(1), // relative to shared/
    source: z.string().min(1),
    tiles: z.array(z.string().min(1)).min(1),
    takeaways: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type ReviewCheck = z.infer<typeof reviewCheckSchema>;
export type ReferenceSheet = z.infer<typeof referenceSheetSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type WorkspaceStyle = z.infer<typeof workspaceStyleSchema>;
export type SceneSlot = z.infer<typeof sceneSlotSchema>;
export type SceneTemplate = z.infer<typeof sceneTemplateSchema>;
export type ActTemplate = z.infer<typeof actTemplateSchema>;
export type VideoTemplate = z.infer<typeof videoTemplateSchema>;
export type HookFormula = z.infer<typeof hookFormulaSchema>;
export type CtaFormula = z.infer<typeof ctaFormulaSchema>;
export type TitleFormula = z.infer<typeof titleFormulaSchema>;
export type TransitionPhrase = z.infer<typeof transitionPhraseSchema>;
export type DesignRule = z.infer<typeof designRuleSchema>;
export type SoundRule = z.infer<typeof soundRuleSchema>;
export type MotionPrinciple = z.infer<typeof motionPrincipleSchema>;
