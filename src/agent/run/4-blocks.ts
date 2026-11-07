import { z } from "zod";
import { stageTypeIds } from "../../video/stage/stageTypes";

// 4 Building (motion) – blocks (docs/motion-planas.md, stage C). The model
// turns the approved script into pictures: for every scene 1–4 blocks that
// replace one another in the top zone, and the key words for the spoken text
// at the bottom. Where a block stands, how big it is and how it moves is up to
// the code – the model only picks the block and writes what goes into it.

// The blocks – the same as StageCatalog (src/video/stage/).
export const blockKind = z.enum([
  "logos", // a chain of logos: ids – 2–4 logos from the library, each on its word
  "code", // a code card: file, lines – 2–6 lines ("+ " marks the key one)
  "terminal", // a terminal: lines – the command and 1–2 lines of output
  "screen", // a screen card: text, record, seconds – the user's recording
  "list", // a big list: items – 2–4 points, each on its word
  "number", // a number: value, prefix, suffix, text – what it means
  "compare", // a comparison: before and after – { label, value }
  "badge", // a "01" strip: text – a number or a short label
  "object", // one big object: id – a prop from the library
  "schema", // a diagram A → B → C: nodes – { label, id? }, each on its word
  "phone", // a phone: text – the app on it; items appear inside, each on its word
  "browser", // a browser window: text – the address; items appear on the page
  "progress", // a bar filling up: value – 0–100 %, text – what fills up
  "keys", // keyboard keys: items – the keys, each pressed on its word; text – what it does
  "transform", // one thing turns into another: nodes – exactly 2 { label, id? }
  "chat", // a conversation: items – messages taking turns, or comments
  "picture", // a real picture the creator adds: text, find, look
]);

// How a picture sits in the frame: "cutout" – a thing or a person without a
// background, with a soft shadow (a metaphor, an object, the real person);
// "card" – a photo in a tilted white-bordered card (a real example, a place,
// a result).
export const pictureLooks = ["cutout", "card"] as const;

// How a list or a schema is drawn – the same content in different shapes, so
// two lists in one video need not look alike. A list: "rows" (one under the
// other), "grid" (cards, 2 by 2), "orbit" (around a centre – `text` / `id`),
// "stack" (cards landing on a pile). A schema: "chain" (top to bottom),
// "zigzag" (left and right, going down), "hub" (the first node in the
// middle, the others around it), "loop" (a ring, with the way back from the
// last to the first). A chat: "messages" (bubbles, sent and replied) or
// "comments" (comments under a video).
export const listShapes = ["rows", "grid", "orbit", "stack"] as const;
export const schemaShapes = ["chain", "zigzag", "hub", "loop"] as const;
export const chatShapes = ["messages", "comments"] as const;
export const blockShape = z.enum([
  ...listShapes,
  ...schemaShapes,
  ...chatShapes,
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
  // A list: a library icon for every item (grid, orbit and stack show them).
  itemIcons: z.array(z.string()).max(4).optional(),
  // A list or a schema: how it is drawn (unset – rows / chain).
  shape: blockShape.optional(),
  // A block built of parts (a list's items, a chain's logos, a schema's
  // nodes): for every part, the voiceover word it appears on. The picture
  // stays and builds itself up as the voice goes – something happens in it
  // without a new picture (docs/motion-stilius.md).
  partWords: z.array(z.string().trim().min(1)).max(4).optional(),
  // A screen: what exactly to record (the app, the clicks, what appears) and
  // about how long showing it takes.
  record: z.string().trim().max(200).optional(),
  seconds: z.number().min(1).max(60).optional(),
  // A picture: what exactly the creator should put in – the subject and how it
  // looks ("a robot hand holding a glowing globe, cut out") – and how it sits.
  find: z.string().trim().max(200).optional(),
  look: z.enum(pictureLooks).optional(),
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

// How many parts a block is built of – each appears on its own word
// (partWords). Blocks drawn whole have none.
export function blockParts(block: BlockFromAi): number {
  switch (block.kind) {
    case "list":
    case "phone":
    case "browser":
    case "keys":
    case "chat":
      return block.items?.length ?? 0;
    case "logos":
      return block.ids?.length ?? 0;
    case "schema":
    case "transform":
      return block.nodes?.length ?? 0;
    default:
      return 0;
  }
}

export const sceneBlocksFromAi = z.object({
  // What the viewer sees happening in the scene, in one sentence with a verb
  // – understandable with the sound off ("the idea drops into TikMaker and a
  // phone with the finished video slides out"). Written first; the blocks
  // show it. Unset only in runs made before it existed.
  happens: z.string().trim().min(10).max(200).optional(),
  // Where the scene's picture and captions go (src/video/stage/stageTypes.ts).
  // The agent picks it; checkBlocks asks for it. Unset (older runs) – "top".
  stage: z.enum(stageTypeIds).optional(),
  // None only in a "statement" – a scene of words with no picture. Usually one
  // main picture for the thought; a new one when the thought changes.
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
  // A note on taste (pace, variety, rhythm) rather than something broken:
  // shown to the user, not sent back to the model – the model knows the
  // principle behind it and may have had a reason (docs/motion-planas.md).
  advice: z.boolean().optional(),
});

// In the run's file: what the model sent, and the problems it did not fix.
export const blocksInRun = blocksFromAi.extend({
  problems: z.array(blocksProblem),
});

export type BlockKind = z.infer<typeof blockKind>;
export type BlockFromAi = z.infer<typeof blockFromAi>;
export type BlockShape = z.infer<typeof blockShape>;
export type SceneBlocksFromAi = z.infer<typeof sceneBlocksFromAi>;
export type BlocksFromAi = z.infer<typeof blocksFromAi>;
export type BlocksProblem = z.infer<typeof blocksProblem>;
export type BlocksInRun = z.infer<typeof blocksInRun>;
