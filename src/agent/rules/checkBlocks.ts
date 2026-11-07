import { VO_WORDS_PER_SECOND, voDurationSeconds } from "../../utils/pacing";
import { spokenWords as words } from "../../utils/voWords";
import { STAGE_LAYOUTS } from "../../video/stage/stageTypes";
import type { ScriptFromAi } from "../run/3-script";
import {
  blockParts,
  listShapes,
  schemaShapes,
  chatShapes,
  type BlockFromAi,
  type BlocksFromAi,
  type BlocksProblem,
} from "../run/4-blocks";

// Stage C, part 2: the model's blocks checked by code, no AI. Two kinds of
// finding: a problem (something is broken – a word that is not said, an id
// not in the library, a field missing, an empty block) goes back to the model
// once; advice (taste – pace, variety, rhythm) is only shown to the user,
// since the model knows the principle behind it (picture-principles.json).
// What is still broken after the one fix is shown to the user too.

// The longest the screen may stay without anything happening: a new picture
// or a part of the current one appearing (docs/motion-stilius.md – in good
// videos one picture holds a whole thought, ~5 s, and keeps building).
export const MAX_HOLD_SECONDS = 3;
// The shortest a picture may stay: shorter flickers past before it is read,
// which is what made a picture per word feel random.
export const MIN_PICTURE_SECONDS = 2;
// How long a block of parts may stand before its first part appears: longer
// is an empty frame (test 8: a list waited 2.4 s for its first item).
export const FIRST_PART_SECONDS = 0.6;
// How soon after the scene starts the first block must appear.
export const FIRST_BLOCK_SECONDS = 1;
// The hook's picture is there from its first or second word: the first two
// seconds decide whether people stay, and words on an empty frame are the
// weakest opening (docs/bd/analizes/: first frames are almost never text alone).
export const HOOK_PICTURE_SECONDS = 0.4;
// How many scenes in a row may share one stage type before the video reads as
// one frame repeated (docs/motion-planas.md, "Kartojimasis").
export const MAX_SAME_STAGE_IN_A_ROW = 2;
// How many times one look (a block and its shape) may come in a video: test 8
// had five lists drawn the same way and read as one slide repeated.
export const MAX_SAME_LOOK = 2;
// Blocks that are mostly text: a split draws its pictures smaller (80 % and
// 40 %), and their words become too small to read on a phone (test 10: the
// chat and the comments in a split).
export const TEXT_BLOCKS: BlockFromAi["kind"][] = [
  "list",
  "chat",
  "code",
  "terminal",
  "browser",
  "phone",
];
// What may stand in a split's small place (40 %): one picture read at a
// glance – no labels to read, no diagram (test 10 put a second schema there).
export const ASIDE_BLOCKS: BlockFromAi["kind"][] = [
  "logos",
  "object",
  "number",
  "progress",
  "badge",
  "keys",
];
// How many recordings a video may ask the creator for before it becomes a
// chore (test 10 asked for six).
export const MAX_RECORDINGS = 4;

// A block's look: its kind, and for a list or a schema its shape.
export function blockLook(block: BlockFromAi): string {
  if (block.kind === "list") return `list ${block.shape ?? "rows"}`;
  if (block.kind === "schema") return `schema ${block.shape ?? "chain"}`;
  return block.kind;
}

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
      if (!block.text) out.push("text");
      if (!block.record) out.push("record (what exactly to record)");
      if (block.seconds === undefined)
        out.push("seconds (how long showing it takes)");
      break;
    case "badge":
      if (!block.text) out.push("text");
      break;
    case "picture":
      if (!block.text) out.push("text (what it shows, in a few words)");
      if (!block.find) out.push("find (what picture exactly to put in)");
      if (!block.look) out.push("look (cutout or card)");
      break;
    case "list":
      if ((block.items?.length ?? 0) < 2) out.push("2–4 items");
      if (
        block.shape &&
        !(listShapes as readonly string[]).includes(block.shape)
      )
        out.push(`a list shape (${listShapes.join(", ")})`);
      if (block.shape === "orbit" && !block.id && !block.text)
        out.push("a centre for the orbit (id or text)");
      break;
    case "phone":
    case "browser":
      if (!block.text)
        out.push(
          block.kind === "phone" ? "text (the app)" : "text (the address)",
        );
      if ((block.items?.length ?? 0) < 2) out.push("2–4 items");
      break;
    case "keys":
      if (!block.items?.length) out.push("items (the keys)");
      break;
    case "chat":
      if ((block.items?.length ?? 0) < 2) out.push("2–4 items");
      if (
        block.shape &&
        !(chatShapes as readonly string[]).includes(block.shape)
      )
        out.push(`a chat shape (${chatShapes.join(", ")})`);
      break;
    case "progress":
      if (block.value === undefined || block.value < 0 || block.value > 100)
        out.push("value (0–100)");
      if (!block.text) out.push("text (what fills up)");
      break;
    case "transform":
      if ((block.nodes?.length ?? 0) !== 2) out.push("exactly 2 nodes");
      for (const id of notIn(
        (block.nodes ?? []).flatMap((node) => (node.id ? [node.id] : [])),
        all,
      ))
        out.push(`"${id}" is not in the library – put it in wishes`);
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
      if (
        block.shape &&
        !(schemaShapes as readonly string[]).includes(block.shape)
      )
        out.push(`a schema shape (${schemaShapes.join(", ")})`);
      const ids = nodes.flatMap((node) => (node.id ? [node.id] : []));
      for (const id of notIn(ids, all))
        out.push(`"${id}" is not in the library – put it in wishes`);
      break;
    }
  }
  for (const id of notIn(block.itemIcons ?? [], all))
    out.push(`"${id}" is not in the library – put it in wishes`);
  if (
    block.itemIcons?.length &&
    block.itemIcons.length !== (block.items?.length ?? 0)
  )
    out.push("itemIcons – one for every item");
  if (
    block.kind === "list" &&
    block.shape === "orbit" &&
    block.id &&
    !all.includes(block.id)
  )
    out.push(`"${block.id}" is not in the library – put it in wishes`);
  const parts = blockParts(block);
  if (parts && (block.partWords?.length ?? 0) !== parts)
    out.push(`partWords – one spoken word for each of its ${parts} parts`);
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
    // A note on taste: the model's call, shown to the user only.
    const advice = (message: string) =>
      problems.push({
        sceneIndex,
        message: `Scene ${sceneIndex + 1}: ${message}`,
        advice: true,
      });

    // The stage type fits what the scene shows (src/video/stage/stageTypes.ts).
    const stage = scene.stage ?? "top";
    if (!scene.stage)
      problem("pick a stage: top, bottom, statement, full or split");
    const hook = script.scenes[sceneIndex]?.role === "hook";
    const screens = scene.blocks.filter((block) => block.kind === "screen");
    // A recording in the hook fills the frame: a vertical video in a small
    // card is lost on a phone screen.
    if (hook && screens.length && stage !== "full")
      problem(
        "the hook shows a recording – put it on the full stage, over the whole frame, not in a small card",
      );
    if (hook && stage === "statement")
      problem(
        "the hook needs a picture from its first word – words on an empty frame are the weakest opening; show its first frame",
      );
    if (stage === "statement" && scene.blocks.length)
      problem("a statement shows no picture – leave its blocks empty");
    if (stage !== "statement" && !scene.blocks.length)
      problem(`a ${stage} scene needs at least one block`);
    if (stage === "split" && scene.blocks.length < 2)
      problem("a split shows two pictures – give it at least 2 blocks");
    if (stage === "split")
      scene.blocks.forEach((block, i) => {
        if (TEXT_BLOCKS.includes(block.kind))
          problem(
            `a ${block.kind} is mostly text and too small to read in a split – use another stage, or a picture block here`,
          );
        // blocks take turns: the 1st, 3rd… in the main place, the 2nd, 4th…
        // in the small one (blockTimeline)
        else if (i % 2 === 1 && !ASIDE_BLOCKS.includes(block.kind))
          problem(
            `block ${i + 1} goes into the split's small place, where a ${block.kind} is too small to read – put one simple picture there (${ASIDE_BLOCKS.join(", ")}), or use top/bottom with one main picture`,
          );
      });
    // One recording per scene: one action (type, then send) is one take –
    // two slots made the user record the same moment twice.
    if (screens.length > 1)
      problem(
        `${screens.length} recordings in one scene – one action is one recording; merge them into one screen block`,
      );

    if (stage !== "statement" && !scene.happens)
      problem(
        "write happens: one sentence of what the viewer sees happening, understandable with the sound off",
      );

    // Every block on a word that is really said, in the order it is said.
    const starts: number[] = [];
    // When each block's parts appear (seconds), by block.
    const parts: number[][] = [];
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
      // Its parts appear on their own words, from the block's word on, in
      // order (two parts may share a word): the picture builds up as the
      // voice names each one.
      const own: number[] = [];
      if (at !== -1) {
        let partFrom = at;
        (block.partWords ?? []).forEach((partWord, part) => {
          const target = words(partWord)[0] ?? "";
          const said = spoken.indexOf(target, partFrom);
          if (said === -1) {
            problem(
              spoken.includes(target)
                ? `${what}, part ${part + 1} on "${partWord}" is out of order`
                : `${what}, part ${part + 1}: "${partWord}" is not in the voiceover – a block of parts fits when the voice names every part`,
            );
            return;
          }
          own.push(said / VO_WORDS_PER_SECOND);
          partFrom = said;
        });
      }
      parts.push(own);
      const lacking = missing(block, library);
      if (lacking.length) problem(`${what} needs ${lacking.join(", ")}`);
    });

    // Pace: the first block at once; then something happens at least every
    // 3 s – a new picture or a part of this one – and no picture flickers.
    if (starts.length === scene.blocks.length && starts.length) {
      const first = hook ? HOOK_PICTURE_SECONDS : FIRST_BLOCK_SECONDS;
      if (starts[0] > first)
        advice(
          hook
            ? `the hook's picture comes at ${starts[0].toFixed(1)} s – put it on the first or second word`
            : `the first block comes at ${starts[0].toFixed(1)} s – start it within ${FIRST_BLOCK_SECONDS} s`,
        );
      // A block leaves when the next block in ITS place arrives – on a split
      // the blocks take turns between two places (blockTimeline).
      const places = Math.max(1, STAGE_LAYOUTS[stage].visuals.length);
      const end = voDurationSeconds(voiceover);
      const ends = starts.map((_, i) => starts[i + places] ?? end);
      starts.forEach((start, i) => {
        const shown = ends[i] - start;
        if (i < starts.length - 1 && shown < MIN_PICTURE_SECONDS)
          advice(
            `block ${i + 1} is on screen only ${shown.toFixed(1)} s – it flickers past; keep one picture for the thought and let it build up (partWords) instead of swapping it`,
          );
        if (parts[i].length && parts[i][0] - start > FIRST_PART_SECONDS)
          problem(
            `block ${i + 1} stands empty ${(parts[i][0] - start).toFixed(1)} s before its first part – put the block on its first part's word, or that part on the block's word`,
          );
        const late = parts[i].find((t) => t >= ends[i]);
        if (late !== undefined)
          problem(
            `block ${i + 1} has a part on a word said after the next block replaced it`,
          );
        // a recording moves by itself – it never "stands still"
        if (scene.blocks[i].kind === "screen") return;
        const inside = parts[i].filter((t) => t > start && t < ends[i]);
        const marks = [start, ...inside, ends[i]];
        const hold = Math.max(
          ...marks.slice(1).map((end, m) => end - marks[m]),
        );
        if (hold > MAX_HOLD_SECONDS)
          advice(
            `block ${i + 1}: nothing happens for ${hold.toFixed(1)} s – let a part appear on a word (partWords) or change the picture, at least every ${MAX_HOLD_SECONDS} s`,
          );
      });
    }

    for (const keyword of scene.keywords)
      if (!spoken.includes(words(keyword)[0] ?? ""))
        problem(`the keyword "${keyword}" is not in the voiceover`);
  });

  // Variety: one look (block + shape) at most MAX_SAME_LOOK times in the
  // video – recordings aside, they are the user's own footage. The model
  // sees its own sequence of looks, so it can see what repeats.
  const looks = plan.scenes.map((scene) => scene.blocks.map(blockLook));
  const counts = new Map<string, number>();
  for (const look of looks.flat())
    if (look !== "screen") counts.set(look, (counts.get(look) ?? 0) + 1);
  for (const [look, count] of counts)
    if (count > MAX_SAME_LOOK)
      problems.push({
        advice: true,
        message: `"${look}" is used ${count} times (your pictures: ${looks.map((scene, n) => `${n + 1}: ${scene.join(" + ") || "words"}`).join("; ")}) – the same look again and again reads as one slide repeated; at most ${MAX_SAME_LOOK} times – use another block or shape where it fits what happens`,
      });

  // Recordings are the creator's work: a few, where the real screen proves it.
  const recordings = plan.scenes.filter((scene) =>
    scene.blocks.some((block) => block.kind === "screen"),
  ).length;
  if (recordings > MAX_RECORDINGS)
    problems.push({
      advice: true,
      message: `${recordings} scenes ask for a recording – that is a lot to record; about ${MAX_RECORDINGS} at most, the rest shown with blocks`,
    });

  // Rhythm: the same stage type scene after scene reads as one frame
  // repeated. The model sees its own sequence, so it can see the run.
  const stages = plan.scenes.map((scene) => scene.stage ?? "top");
  let run = 1;
  stages.forEach((stage, i) => {
    run = i > 0 && stages[i - 1] === stage ? run + 1 : 1;
    if (run === MAX_SAME_STAGE_IN_A_ROW + 1)
      problems.push({
        sceneIndex: i,
        advice: true,
        message: `Scenes ${i - MAX_SAME_STAGE_IN_A_ROW + 1}–${i + 1} are all "${stage}" (your stages: ${stages.join(", ")}) – the same frame again and again gets dull; change the stage where the story changes`,
      });
  });

  return problems;
}
