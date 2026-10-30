import { z } from "zod";
import {
  analysisVocabulary,
  type AnalysisVocabularyField,
} from "../knowledge/analysisVocabulary";
import {
  backgroundFillKindSchema,
  backgroundIdSchema,
  entrancePresetSchema,
  highlightStyleSchema,
  kenBurnsPresetSchema,
  POSITION_MAX,
  POSITION_MIN,
  richTextFontSchema,
  richTextSizeSchema,
  visualEffectSchema,
  visualTypeSchema,
} from "../schema/capabilities";
import { scenePlanRoleSchema } from "../schema/scene";

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

// The project's scene roles, minus "other" for the same reason.
const knowledgeRoleSchema = scenePlanRoleSchema.exclude(["other"]);

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
    faceless: z.boolean(),
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

// Where something sits, measured on a real frame: the box's CENTRE and its
// width and height, all in percent of the 1080x1920 canvas — the same
// convention as a TikMaker layer's x/y. The layout compiler (D) puts the real
// element into this box (auto-fit), so the example leaves little to guess.
// Like a layer, a box may reach past the frame (a window zoomed in on purpose).
const percent = z.number().min(0).max(100);
const position = z.number().min(POSITION_MIN).max(POSITION_MAX);
const extent = z.number().positive().max(300);
const boxFields = { x: position, y: position, w: extent, h: extent };

// Elements are listed bottom first, like content.visuals: the array order is
// the z-order. `order` is when it appears (0 = first).
export const layoutElementSchema = z
  .object({
    kind: visualTypeSchema,
    ...boxFields,
    order: z.number().int().min(0),
    // Unknown from a still frame, so optional.
    enter: entrancePresetSchema.optional(),
    // Unset = the element holds still once it has arrived.
    alive: kenBurnsPresetSchema.optional(),
    effects: z.array(visualEffectSchema).optional(),
    note: z.string().optional(),
  })
  .strict();

export const layoutTextSchema = z
  .object({
    ...boxFields,
    order: z.number().int().min(0),
    size: richTextSizeSchema,
    lines: z.number().int().min(1),
    // The whole line in a box (a rich-headline `pill`), not one word.
    pill: z.boolean().optional(),
    // One highlighted word inside the line.
    emphasis: highlightStyleSchema.optional(),
    effects: z.array(visualEffectSchema).optional(),
    note: z.string().optional(),
  })
  .strict();

export const layoutExampleSchema = z
  .object({
    id: z.string().min(1),
    // The scene role this arrangement suits (the diagram's `type`).
    role: knowledgeRoleSchema,
    arrangement: z.enum(["stack", "side-by-side", "overlay", "corner"]),
    anchor: z.enum(["center", "left", "right", "top", "bottom"]),
    // What fills the frame behind everything. Unset when an element (a
    // full-frame talking head or recording) is itself the background.
    background: backgroundFillKindSchema.optional(),
    elements: z.array(layoutElementSchema),
    textBlocks: z.array(layoutTextSchema),
    // Where the captions sit (centre, % of the height), when the frame has
    // them. Captions are drawn from the voiceover, so they are not a text
    // block; this is the project's captions.y.
    captionsY: percent.optional(),
    continuity: z.string().optional(),
    // Path to the frame this example was taken from (C4).
    frame: z.string().optional(),
    // Why the frame works, and anything the fields above cannot say.
    note: z.string().optional(),
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
export type LayoutElement = z.infer<typeof layoutElementSchema>;
export type LayoutText = z.infer<typeof layoutTextSchema>;
export type LayoutExample = z.infer<typeof layoutExampleSchema>;
export type DesignRule = z.infer<typeof designRuleSchema>;
export type SoundRule = z.infer<typeof soundRuleSchema>;
