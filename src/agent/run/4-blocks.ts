import { z } from "zod";
import { stageTypeIds } from "../../video/stage/stageTypes";

// 4 Building (motion) – blocks (docs/motion-planas.md, stage C). The model
// turns the approved script into pictures: for every scene 1–4 blocks that
// replace one another in the top zone, and the key words for the spoken text
// at the bottom. Where a block stands, how big it is and how it moves is up to
// the code – the model only picks the block and writes what goes into it.

// The blocks – the same 10 as StageCatalog (src/video/stage/).
export const blockKind = z.enum([
  "logos", // a chain of logos: ids – 2–4 logos from the library
  "code", // a code card: file, lines – 2–6 lines ("+ " marks the key one)
  "terminal", // a terminal: lines – the command and 1–2 lines of output
  "screen", // a screen card: text – what to record (the user's recording)
  "list", // a big list: items – 2–4 points
  "number", // a number: value, prefix, suffix, text – what it means
  "compare", // a comparison: before and after – { label, value }
  "badge", // a "01" strip: text – a number or a short label
  "object", // one big object: id – a prop from the library
  "schema", // a diagram A → B → C: nodes – { label, id? }
]);

const pair = z.object({
  label: z.string().trim().min(1).max(24),
  value: z.string().trim().min(1).max(12),
});

// One block. The fields are shared by every kind of block (a model copes
// better with one object); which ones a kind needs is checked by the code
// (checkBlocks).
export const blockFromAi = z.object({
  // A word of the scene's voiceover – the block appears when it is said.
  onWord: z.string().trim().min(1),
  kind: blockKind,
  text: z.string().trim().max(40).optional(),
  file: z.string().trim().max(24).optional(),
  lines: z.array(z.string().max(35)).max(6).optional(),
  items: z.array(z.string().trim().max(24)).max(4).optional(),
  ids: z.array(z.string()).max(4).optional(),
  id: z.string().optional(),
  value: z.number().optional(),
  prefix: z.string().max(3).optional(),
  suffix: z.string().max(4).optional(),
  before: pair.optional(),
  after: pair.optional(),
  nodes: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(16),
        id: z.string().optional(),
      }),
    )
    .max(4)
    .optional(),
});

export const sceneBlocksFromAi = z.object({
  // Where the scene's picture and captions go (src/video/stage/stageTypes.ts).
  // The agent picks it; checkBlocks asks for it. Unset (older runs) – "top".
  stage: z.enum(stageTypeIds).optional(),
  // None only in a "statement" – a scene of words with no picture.
  blocks: z.array(blockFromAi).max(4),
  // Words of the voiceover shown bold and bright in the text at the bottom.
  keywords: z.array(z.string().trim().min(1)).max(4),
});

export const blocksFromAi = z.object({
  scenes: z.array(sceneBlocksFromAi).min(1),
  // What the model wanted but the library lacks (e.g. "Notion logo") – a wish list.
  wishes: z.array(z.string().trim().min(3)).max(10),
});

// One problem the code found: which scene, if any, and what is wrong.
export const blocksProblem = z.object({
  sceneIndex: z.number().int().min(0).optional(),
  message: z.string().min(1),
});

// In the run's file: what the model sent, and the problems it did not fix.
export const blocksInRun = blocksFromAi.extend({
  problems: z.array(blocksProblem),
});

export type BlockKind = z.infer<typeof blockKind>;
export type BlockFromAi = z.infer<typeof blockFromAi>;
export type SceneBlocksFromAi = z.infer<typeof sceneBlocksFromAi>;
export type BlocksFromAi = z.infer<typeof blocksFromAi>;
export type BlocksProblem = z.infer<typeof blocksProblem>;
export type BlocksInRun = z.infer<typeof blocksInRun>;
