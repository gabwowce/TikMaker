import type {
  MotionPrinciple,
  ReferenceSheet,
  ReviewCheck,
} from "../../../src/agent/knowledge.js";
import type { BlocksFromAi } from "../../../src/agent/run/4-blocks.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import {
  reviewFromAi,
  type ReviewFromAi,
} from "../../../src/agent/run/7-chat.js";
import type { Still } from "../stills.js";
import { callWithImages, type StructuredResult } from "../llm.js";

// 7 Review: the agent looks at its own video. Every other step writes JSON
// and never sees what the code draws from it, so "one dominant element" or
// "readable on a phone" stayed words in a prompt (test 10: two diagrams of the
// same weight with labels too small to read). Here the model gets real
// frames, rendered by Remotion, and judges them by:
// - the rubric (knowledge/shared/review-rubric.json): what to check, and
//   which failures are fixed ("fix") and which only said ("note");
// - example frames (knowledge/shared/reference-frames.json + the sheet image):
//   what good looks like, so taste is compared with real frames, not words;
// - the picture principles the blocks were picked with.

const SYSTEM = `You are the motion designer who checks a short vertical video (TikTok, Reels,
Shorts) before it is posted. You get frames of every scene, rendered exactly as the
viewer will see them on a phone, with what is said in that scene.

First read the example sheet(s) with the Read tool: frames of a channel whose videos
work – that is the level to reach. Then read every frame of the video.

For every scene, look as a viewer scrolling with the sound off, and go through the
rubric:
- sees: in one sentence, what you take from the frame in one second
- verdict "fix" only when a "fix" check of the rubric fails – the viewer would be lost,
  the eye has nowhere to land, text cannot be read, something is covered. Then give
  at most 3 problems as you see them and ONE change:
  - pictures: the scene's pictures are picked again – say concretely what it should
    show instead (one main picture of what, which block or stage, what to drop)
  - words: the voiceover says too much for one picture – say how to say it shorter or
    simpler (its voice and pictures are then made again)
  - motion: the pictures are right but sit or move badly (too small, too low, over the
    caption) – say where they should be and how big
- A dashed "● REC" or "▣ PICTURE" slot is a place the creator fills with their own
  recording or picture later: judge where it sits and what it asks for, not that it is
  empty.
- verdict "good" otherwise. A "note" check that fails goes into problems of a "good"
  scene and is NOT changed – it is said to the creator. Do not invent problems.`;

export type ReviewGuide = {
  rubric: ReviewCheck[];
  // the sheets, with where their image is on disk now (for the Read tool)
  references: { sheet: ReferenceSheet; file: string }[];
  principles: MotionPrinciple[];
};

export async function reviewFrames(
  scenes: SceneFromAi[],
  blocks: BlocksFromAi,
  stills: Still[],
  guide: ReviewGuide,
  model?: Parameters<typeof callWithImages>[3],
): Promise<StructuredResult<ReviewFromAi>> {
  const rubric = guide.rubric
    .map((c) => `- [${c.level}] ${c.check} Fails when: ${c.fails}`)
    .join("\n");
  const examples = guide.references
    .map(
      ({ sheet, file }) => `- ${file}
  ${sheet.source}
  Tiles: ${sheet.tiles.join(" | ")}
  What makes them work: ${sheet.takeaways.join(" ")}`,
    )
    .join("\n");
  const knowledge = guide.principles
    .map((p) => `- [${p.priority}] ${p.principle} Why: ${p.why}`)
    .join("\n");
  const list = scenes
    .map((scene, n) => {
      const picked = blocks.scenes[n];
      const pictures = picked
        ? `${picked.stage ?? "top"} – ${picked.blocks.map((b) => b.kind + ("shape" in b && b.shape ? ` (${b.shape})` : "")).join(", ") || "words only"}`
        : "–";
      const frames = stills
        .filter((still) => still.sceneIndex === n)
        .map((still) => `  - ${still.file} (at ${still.seconds.toFixed(1)} s)`)
        .join("\n");
      return `Scene ${n + 1} (${scene.role}) – sceneIndex ${n}
  Voiceover: ${scene.voiceover}
  Pictures: ${pictures}
  Frames:
${frames || "  - (none)"}`;
    })
    .join("\n\n");
  const user = `Rubric:
${rubric}

Example frames:
${examples || "- (none)"}

Principles the pictures were picked by:
${knowledge}

${list}

Answer with one entry per scene, in order.`;
  return callWithImages(
    reviewFromAi,
    { system: SYSTEM, user },
    [...guide.references.map((r) => r.file), ...stills.map((s) => s.file)],
    model,
  );
}
