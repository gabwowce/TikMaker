import { VO_WORDS_PER_SECOND, voDurationSeconds } from "../../utils/pacing";
import { spokenWords as words } from "../../utils/voWords";
import type { ScriptFromAi } from "../run/3-script";
import type { BlockFromAi, BlocksFromAi, BlocksProblem } from "../run/4-blocks";

// Stage C, part 2: the model's blocks checked by code, no AI. A problem found
// here is sent back to the model once; what is still wrong after that is shown
// to the user.

// The longest one picture may stay on screen (docs/motion-planas.md, "Kaip
// užtikrinamas greitas tempas").
export const MAX_HOLD_SECONDS = 3;
// How soon after the scene starts the first block must appear.
export const FIRST_BLOCK_SECONDS = 1;

// The library ids the model may pick from (logos and props).
export type BlockLibrary = { logos: string[]; props: string[] };

// What a block lacks for its kind (an empty list – nothing).
function missing(block: BlockFromAi, library: BlockLibrary): string[] {
  const all = [...library.logos, ...library.props];
  const notIn = (ids: string[], allowed: string[]) =>
    ids.filter((id) => !allowed.includes(id));
  const out: string[] = [];
  switch (block.kind) {
    case "logos": {
      const ids = block.ids ?? [];
      if (ids.length < 2) out.push("2–4 ids");
      for (const id of notIn(ids, all))
        out.push(`"${id}" is not in the library – put it in wishes`);
      break;
    }
    case "code":
      if (!block.file) out.push("file");
      if ((block.lines?.length ?? 0) < 2) out.push("2–6 lines");
      break;
    case "terminal":
      if (!block.lines?.length) out.push("lines (the command first)");
      break;
    case "screen":
    case "badge":
      if (!block.text) out.push("text");
      break;
    case "list":
      if ((block.items?.length ?? 0) < 2) out.push("2–4 items");
      break;
    case "number":
      if (block.value === undefined) out.push("value");
      if (!block.text) out.push("text (what the number means)");
      break;
    case "compare":
      if (!block.before) out.push("before");
      if (!block.after) out.push("after");
      break;
    case "object":
      if (!block.id) out.push("id");
      else if (!library.props.includes(block.id))
        out.push(`"${block.id}" is not in the library – put it in wishes`);
      break;
    case "schema": {
      const nodes = block.nodes ?? [];
      if (nodes.length < 2) out.push("2–4 nodes");
      const ids = nodes.flatMap((node) => (node.id ? [node.id] : []));
      for (const id of notIn(ids, all))
        out.push(`"${id}" is not in the library – put it in wishes`);
      break;
    }
  }
  return out;
}

export function checkBlocks(
  plan: BlocksFromAi,
  script: ScriptFromAi,
  library: BlockLibrary,
): BlocksProblem[] {
  const problems: BlocksProblem[] = [];

  if (plan.scenes.length !== script.scenes.length)
    problems.push({
      message: `${plan.scenes.length} scenes of blocks, the script has ${script.scenes.length}`,
    });

  plan.scenes.forEach((scene, sceneIndex) => {
    const voiceover = script.scenes[sceneIndex]?.voiceover ?? "";
    const spoken = words(voiceover);
    const problem = (message: string) =>
      problems.push({
        sceneIndex,
        message: `Scene ${sceneIndex + 1}: ${message}`,
      });

    // The stage type fits what the scene shows (src/video/stage/stageTypes.ts).
    const stage = scene.stage ?? "top";
    if (!scene.stage)
      problem("pick a stage: top, bottom, statement, full or split");
    if (stage === "statement" && scene.blocks.length)
      problem("a statement shows no picture – leave its blocks empty");
    if (stage !== "statement" && !scene.blocks.length)
      problem(`a ${stage} scene needs at least one block`);
    if (stage === "split" && scene.blocks.length < 2)
      problem("a split shows two pictures – give it at least 2 blocks");

    // Every block on a word that is really said, in the order it is said.
    const starts: number[] = [];
    let from = 0;
    scene.blocks.forEach((block, i) => {
      const what = `block ${i + 1} (${block.kind})`;
      const target = words(block.onWord)[0] ?? "";
      const at = spoken.indexOf(target, from);
      if (at === -1)
        problem(
          spoken.includes(target)
            ? `${what} on "${block.onWord}" is out of order`
            : `${what}: "${block.onWord}" is not in the voiceover`,
        );
      else {
        starts.push(at / VO_WORDS_PER_SECOND);
        from = at + 1;
      }
      const lacking = missing(block, library);
      if (lacking.length) problem(`${what} needs ${lacking.join(", ")}`);
    });

    // Pace: the first block at once, then a new one at least every 3 s.
    if (starts.length) {
      if (starts[0] > FIRST_BLOCK_SECONDS)
        problem(
          `the first block comes at ${starts[0].toFixed(1)} s – start it within ${FIRST_BLOCK_SECONDS} s`,
        );
      const ends = [...starts.slice(1), voDurationSeconds(voiceover)];
      starts.forEach((start, i) => {
        const hold = ends[i] - start;
        if (hold > MAX_HOLD_SECONDS)
          problem(
            `block ${i + 1} stays ${hold.toFixed(1)} s – change the picture at least every ${MAX_HOLD_SECONDS} s`,
          );
      });
    }

    for (const keyword of scene.keywords)
      if (!spoken.includes(words(keyword)[0] ?? ""))
        problem(`the keyword "${keyword}" is not in the voiceover`);
  });

  return problems;
}
