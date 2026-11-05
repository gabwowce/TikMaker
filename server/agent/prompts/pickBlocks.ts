import type { Workspace } from "../../../src/agent/knowledge.js";
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
import { VO_WORDS_PER_SECOND } from "../../../src/utils/pacing.js";
import type { StageType } from "../../../src/video/stage/stageTypes.js";
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
  logos: "ids: 2–4 logo or prop ids – when tools, apps or companies are named",
  code: 'file, lines: 2–6 lines of code, at most 35 characters each; start the key line with "+ " – when the scene is about code or a setting',
  terminal:
    "lines: the command first, then 1–2 lines of its output – when the scene is about a command",
  screen:
    "text: one sentence telling the user what to record – when a real app has to be shown",
  list: "items: 2–4 short points, at most 24 characters each – benefits, steps, mistakes",
  number:
    "value, prefix (e.g. $), suffix (e.g. %, k), text: what the number means – a price, a time, a percentage",
  compare:
    'before and after: { label, value }, e.g. "Official price" "$49/mo" → "With TikMaker" "$0.016" – before / after, expensive / cheap',
  badge: 'text: "01" or two words – a new point in a numbered list',
  object:
    "id: one prop id – a metaphor or a feeling (a padlock, a clock, a robot)",
  schema: "nodes: 2–4 { label, id? } – how something works, A → B → C",
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
    "two pictures at once, one above the other, the spoken words below; at least 2 blocks",
};

const SYSTEM = `You turn the approved script of a short vertical motion video into pictures.
Every frame shows a stage: big pictures (blocks) and the spoken words, which the code
draws from the voiceover by itself.

For every scene, decide which stage tells it best – your call, from what the scene says
and what comes before and after it.
Then pick 1–4 blocks from the catalogue and fill them (none for a statement):
- onWord: the word of THAT scene's voiceover on which the block appears; the blocks go in
  the order their words are said
- the first block appears on the scene's first or second word
- a new block at least every 3 seconds – about every 8 spoken words; one picture standing
  longer feels slow
- the block shows what is being said at that moment, concretely: the tool that is named,
  the command, the number, the steps – never a decoration
- fill exactly the fields the catalogue gives that block
- keywords: 1–4 words of the voiceover to stand out in the spoken text (the names, the
  numbers, the one word that carries the scene)

Use only the logo and prop ids given. When you want a logo or an object that is not
there, show the scene with another block and write what you wanted in wishes (e.g.
"Notion logo"). Answer with one entry per scene, in the same order.`;

function userPrompt(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  previous?: { blocks: BlocksFromAi; problems: BlocksProblem[] },
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
      return `Scene ${index + 1} (${scene.role}, ~${seconds.toFixed(1)} s, so about ${Math.max(1, Math.ceil(seconds / 3))} blocks)
  Voiceover: ${scene.voiceover}
  Shows: ${scene.visual}`;
    })
    .join("\n\n");
  const prompt = `Channel: ${workspace.name}. ${workspace.brief}
Idea: ${input.idea}

Stages:
${stages}

Blocks:
${catalog}

Logos: ${blockLibrary.logos.join(", ")}
Props: ${blockLibrary.props.join(", ")}

${list}`;
  if (!previous) return prompt;
  return `${prompt}

Your previous answer:
${JSON.stringify(previous.blocks)}

The code found these problems – fix them, keep the rest:
${previous.problems.map((problem) => `- ${problem.message}`).join("\n")}`;
}

export async function pickBlocks(
  input: IdeaFromUser,
  workspace: Workspace,
  scenes: SceneFromAi[],
  previous?: { blocks: BlocksFromAi; problems: BlocksProblem[] },
  model?: Parameters<typeof callStructured>[2],
): Promise<StructuredResult<BlocksFromAi>> {
  // The schema does not fix the number of scenes: Gemini rejects such a
  // schema ("invalid argument"). checkBlocks checks there is one per scene.
  return callStructured(
    blocksFromAi,
    { system: SYSTEM, user: userPrompt(input, workspace, scenes, previous) },
    model,
  );
}
