import type {
  MotionPrinciple,
  Workspace,
} from "../../../src/agent/knowledge.js";
import type { BlockLibrary } from "../../../src/agent/rules/checkBlocks.js";
import type { IdeaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import {
  blocksFromAi,
  type BlockKind,
  type BlocksFromAi,
  type BlocksProblem,
} from "../../../src/agent/run/4-blocks.js";
import {
  generatedLogos,
  generatedProps,
} from "../../../src/registries/assets.generated.js";
import {
  sceneEditFromAi,
  type SceneEditFromAi,
} from "../../../src/agent/run/6-edit.js";
import { VO_WORDS_PER_SECOND } from "../../../src/utils/pacing.js";
import type { StageType } from "../../../src/video/stage/stageTypes.js";
import { productScreens } from "./productScreens.js";
import { callStructured, type StructuredResult } from "../llm.js";

// Stage C, parts 3–4: the approved script → blocks (docs/motion-planas.md).
// The model gets the whole catalogue – the blocks with what goes into them and
// when they fit, and the library's ids – and picks from it only. The code
// checks the answer (checkBlocks); when it finds problems the model writes
// again, seeing its previous answer and the problems.

// The library ids that may be picked.
export const blockLibrary: BlockLibrary = {
  logos: generatedLogos.map((asset) => asset.id),
  props: generatedProps.map((asset) => asset.id),
};

// The catalogue: what goes into a block and when it fits. The same 10 blocks
// as StageCatalog; the field names as in the schema (4-blocks.ts).
const CATALOG: Record<BlockKind, string> = {
  logos:
    "ids: 2–4 logo or prop ids; partWords: the word each one appears on – when tools, apps or companies are named",
  code: 'file, lines: 2–6 lines of code, at most 35 characters each; start the key line with "+ " – when the scene is about code or a setting',
  terminal:
    "lines: the command first, then 1–2 lines of its output – the command types itself, the output follows – when the scene is about a command",
  screen:
    'text: a short label shown in the empty slot (e.g. "Type the idea, click Generate"); record: exactly what the user should record – which app or page, what to click, what has to appear on screen, where to start and stop; seconds: about how long showing that takes – the click, the wait, the result coming up – when a real app has to be shown',
  list: 'items: 2–4 short points, at most 24 characters each; partWords: the word each point appears on; itemIcons (optional): a prop or logo id for each point; shape: rows (one under another), grid (cards 2 by 2, each with its icon – things of the same kind), orbit (around a centre – id: its icon or text: its word – parts of one whole, what surrounds one thing), stack (cards landing on a pile – things piling up, a growing burden). A list of tools appears on their names; a general point ("Side effects") appears when it is named and stays while the voice explains it – benefits, steps, mistakes',
  number:
    "value, prefix (e.g. $), suffix (e.g. %, k), text: what the number means; it counts up to the value – a price, a time, a percentage, something growing",
  compare:
    'before and after: { label, value }, e.g. "Official price" "$49/mo" → "With TikMaker" "$0.016" – the before is crossed out: only when the after REPLACES a worse before (expensive → cheap, slow → fast); never for an input and its output',
  chat: 'items: 2–4 short lines, at most 24 characters each; partWords; shape: messages (chat bubbles – the first is sent, the next comes back as a reply, taking turns – a conversation with a chatbot or a person), comments (comments under a video – "comment below", what viewers say)',
  badge:
    'text: a number or a step label – "01", "Step 2", "Mistake 3" – numbers the next point of a series the video goes through; not a name, a title, a slogan or a call to action',
  object:
    "id: one prop id – a metaphor; rare: a thing that only stands for a word says less than the real thing doing something",
  schema:
    "nodes: 2–4 { label, id? }; partWords: the word each node appears on – the arrows draw themselves to each node; shape: chain (top to bottom – a sequence), zigzag (left and right going down – a process with steps), hub (the first node in the middle, the others around it with arrows out – one thing connected to many), loop (a ring with the way back from the last node to the first – something that repeats: write → check → fix → back) – how something works",
  phone:
    "text: the app's name; items: 2–4 short lines that appear inside the phone like notifications or messages; partWords; itemIcons (optional) – something happening on a phone, an app, a result arriving",
  browser:
    "text: the address (e.g. github.com/user/repo); items: 2–4 short lines that appear on the page; partWords; itemIcons (optional) – a website, a repo, a page and what is on it",
  progress:
    "value: 0–100, text: what fills up – the bar fills and the percent counts – progress, a share, how far something got",
  keys: 'items: 1–4 keys (e.g. "Ctrl", "Shift", "P"), each pressed on its word (partWords); text: what the shortcut does – a keyboard shortcut',
  transform:
    "nodes: exactly 2 { label, id? }; partWords: the word the first shows on, the word it turns into the second – the first card on top, an arrow, the second below: one thing becoming another, an input and what comes out of it (one sentence → one video)",
  picture:
    'text: what it shows in 2–5 words (shown in its place until the creator adds it); find: exactly what picture the creator should put in – the subject and how it looks (e.g. "a robot hand holding a glowing globe, cut out on white"); look: cutout (a thing or person without background, with a shadow – a metaphor, an object, the real person) or card (a photo in a tilted white-bordered card – a real example, a place, a result) – a real picture where it says more than any diagram: a metaphor for the idea, the real thing, the real person. The creator adds it, like a recording; one or two are what make a video feel alive and colourful',
};

// The stage types – what each one looks like, not when to use it: which one
// tells a scene best is the model's call (src/video/stage/stageTypes.ts).
const STAGES: Record<StageType, string> = {
  top: "one picture above, the spoken words below",
  bottom: "the spoken words above, one picture below",
  statement:
    "no picture – only the spoken words, big, over the whole frame; blocks: []",
  full: "one picture over the whole frame, the spoken words over it",
  split:
    "a main picture (4/5 size) and a small one under it (2/5 size), the spoken words below; at least 2 blocks – the 1st, 3rd… go in the main place, the 2nd, 4th… in the small one; the small one is a single simple picture (logos, object, number, progress, badge, keys) that goes with the main one, never a second diagram; no list, chat, code, terminal, browser or phone (their text gets too small)",
};

const SYSTEM = `You turn the approved script of a short vertical motion video into pictures.
Every frame shows a stage: big pictures (blocks) and the spoken words, which the code
draws from the voiceover by itself.

How to work, for every scene in order:
1. happens: one sentence with a verb – what the viewer SEES HAPPENING, so the scene is
   understood with the sound off (an action, a change, a relation – not a list of things).
2. stage: which stage tells it best, from what happens and what comes before and after.
3. blocks: the pictures that show what happens.
   - onWord: the word of THAT scene's voiceover on which the block appears; the blocks go
     in the order their words are said
   - partWords: for a block made of parts, the word each part appears on (from the
     block's word on, in order; two parts may share a word); the first part on or right
     after the block's word, so the block never stands empty
   - fill exactly the fields the catalogue gives that block
4. keywords: 1–4 words of the voiceover to stand out in the spoken text.

The principles below are knowledge of what makes these videos good and why – "must"
ones carry the most weight, "recommended" ones are strong defaults, "optional" ones are
there when they help. They are yours to apply; the code checks only what is technically
broken (a word that is not said, an id not in the library, a missing field).

A scene marked "Recording: yes" was written to be shown with the creator's own screen
recording – give it a screen block unless another block clearly shows it better. A
recording request (record) must be one continuous take a person can reproduce: the
actions in order, where to start and stop, nothing the idea does not mention (no invented
buttons, features or results).

Use only the logo and prop ids given. When you want a logo or an object that is not
there, show the scene another way and write what you wanted in wishes (e.g.
"Notion logo"). Answer with one entry per scene, in the same order.`;

// What every blocks prompt starts with: the channel and the idea, the stages,
// the catalogue, the library, and every scene of the script.
function basePrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  principles: MotionPrinciple[],
): string {
  // "Motion graphics only": no recordings of the user's, so no screen card.
  const kinds = (Object.keys(CATALOG) as BlockKind[]).filter(
    (kind) => !(input.motionOnly && kind === "screen"),
  );
  const catalog = kinds.map((kind) => `- ${kind}: ${CATALOG[kind]}`).join("\n");
  const stages = (Object.keys(STAGES) as StageType[])
    .map((stage) => `- ${stage}: ${STAGES[stage]}`)
    .join("\n");
  const list = scenes
    .map((scene, index) => {
      const words = scene.voiceover.split(/\s+/).filter(Boolean).length;
      const seconds = words / VO_WORDS_PER_SECOND;
      return `Scene ${index + 1} (${scene.role}, ~${seconds.toFixed(1)} s)
  Voiceover: ${scene.voiceover}
  Shows: ${scene.visual}
  Recording: ${scene.needsRecording && !input.motionOnly ? "yes" : "no"}`;
    })
    .join("\n\n");
  const knowledge = principles
    .map(
      (p) =>
        `- [${p.priority}] ${p.principle} Why: ${p.why} In TikMaker: ${p.inTikMaker}`,
    )
    .join("\n");
  return `Principles:
${knowledge}

Channel: ${workspace.name}. ${workspace.brief}${productScreens(workspace)}
Idea: ${input.idea}

Stages:
${stages}

Blocks:
${catalog}

Logos: ${blockLibrary.logos.join(", ")}
Props: ${blockLibrary.props.join(", ")}

${list}`;
}

// "The code found these problems": the previous answer and what to fix.
function fixPrompt(answer: unknown, problems: BlocksProblem[]): string {
  return `

Your previous answer:
${JSON.stringify(answer)}

The code found these problems – fix them, keep the rest:
${problems.map((problem) => `- ${problem.message}`).join("\n")}`;
}

export async function pickBlocks(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  principles: MotionPrinciple[],
  previous?: { blocks: BlocksFromAi; problems: BlocksProblem[] },
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<BlocksFromAi>> {
  const user =
    basePrompt(input, workspace, scenes, principles) +
    (previous ? fixPrompt(previous.blocks, previous.problems) : "");
  // The schema does not fix the number of scenes: Gemini rejects such a
  // schema ("invalid argument"). checkBlocks checks there is one per scene.
  return callStructured(blocksFromAi, { system: SYSTEM, user }, model);
}

// 6 Editing a scene: the same catalogue and the same knowledge, the whole
// video's current pictures (so the new scene does not repeat a look the
// others use), and what the user wants changed in ONE scene. The model
// answers that scene only.
const EDIT = `

The video is built; the user wants ONE scene changed. Answer that scene only, picked
again by everything above, so that it does what the user asks. Keep what the user did not
ask to change (the stage, a block that works) unless changing it is what makes the
scene work. The voiceover stays as it is – the blocks go on its words.`;

export async function editSceneBlocks(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  principles: MotionPrinciple[],
  current: BlocksFromAi,
  sceneIndex: number,
  comment: string,
  previous?: { scene: SceneEditFromAi; problems: BlocksProblem[] },
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<SceneEditFromAi>> {
  const pictures = current.scenes
    .map((scene, n) => `Scene ${n + 1}: ${JSON.stringify(scene)}`)
    .join("\n");
  const user =
    basePrompt(input, workspace, scenes, principles) +
    `

The video's pictures now:
${pictures}

The user wants scene ${sceneIndex + 1} changed: ${comment}` +
    (previous ? fixPrompt(previous.scene, previous.problems) : "");
  return callStructured(
    sceneEditFromAi,
    { system: SYSTEM + EDIT, user },
    model,
  );
}
