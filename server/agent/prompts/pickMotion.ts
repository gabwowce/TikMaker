import type { MotionPrinciple } from "../../../src/agent/knowledge.js";
import { blockTimeline } from "../../../src/agent/blockTimeline.js";
import { MIN_CARRY_FRAMES } from "../../../src/agent/rules/checkMotion.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import type { BlocksFromAi } from "../../../src/agent/run/4-blocks.js";
import {
  motionFromAi,
  type MotionFromAi,
  type MotionProblem,
} from "../../../src/agent/run/4-motion.js";
import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
} from "../../../src/schema/scene.js";
import {
  MIN_SCENE_SECONDS,
  voDurationSeconds,
} from "../../../src/utils/pacing.js";
import { wordFrame } from "../../../src/utils/voWords.js";
import { STAGE_LAYOUTS } from "../../../src/video/stage/stageTypes.js";
import { videoDefaults } from "../../../src/video/typography/tokens.js";
import { callStructured, type StructuredResult } from "../llm.js";

// The motion step (docs/motion-planas.md, B4): the picked blocks → how they
// move. A call of its own, so the model's only job is the motion of the whole
// video. It gets the timeline (every scene, every block, when and where), the
// moves the code can draw, and the motion principles from the knowledge base
// – knowledge, not rules: which move fits is its call. The code checks the
// answer (checkMotion); with problems the model answers again, seeing its
// previous answer and the problems.

const fps = videoDefaults.fps;

// What every preset looks like (src/video/motion/entrances.ts, exits.ts,
// kenBurns.ts). "Slides" travel in from / out past the frame's edge.
const ENTRANCES: Record<EntrancePreset, string> = {
  none: "no entrance – already there on the first frame; only for a block on the scene's first word (the hook's first picture), never just to skip animating",
  fade: "appears softly in place",
  slideUp: "travels in from below, moving up",
  slideDown: "travels in from above, moving down",
  slideLeft: "travels in from the right, moving left",
  slideRight: "travels in from the left, moving right",
  scaleIn: "grows in from slightly smaller",
  pop: "pops in with a small bounce",
  zoomSettleRight:
    "flies in from the right, overshoots its size, settles – strong",
  zoomSettleLeft:
    "flies in from the left, overshoots its size, settles – strong",
  zoomSettleTop: "flies in from above, overshoots its size, settles – strong",
  zoomSettleBottom:
    "flies in from below, overshoots its size, settles – strong",
  zoomIn: "comes in from bigger, shrinking into place",
  blurIn: "comes into focus from a blur",
  spinIn: "spins in",
  flipIn: "flips in around its vertical axis (3D)",
  bounceIn: "bounces in",
  dropIn: "falls in from above the frame",
  rollIn: "rolls in from the left",
};
const EXITS: Record<ExitPreset, string> = {
  none: "no exit – cut away on its last frame",
  fade: "fades out in place",
  slideUp: "speeds away upwards, out of the frame",
  slideDown: "speeds away downwards, out of the frame",
  slideLeft: "speeds away to the left, out of the frame",
  slideRight: "speeds away to the right, out of the frame",
  scaleOut: "shrinks a little as it fades",
  burstOut: "punches up in size and turns as it fades – strong",
  zoomOut: "grows past the viewer as it fades",
  blurOut: "blurs away",
  spinOut: "spins away, shrinking",
  flipOut: "flips away around its vertical axis (3D)",
  dropOut: "falls out of the bottom of the frame",
  rollOut: "rolls away to the right",
};
const DRIFTS: Record<KenBurnsPreset, string> = {
  zoomIn: "slowly grows",
  zoomOut: "slowly shrinks",
  panLeft: "slowly moves left",
  panRight: "slowly moves right",
  panUp: "slowly moves up",
  panDown: "slowly moves down",
  float: "drifts and tilts gently around its place",
  rotateCW: "turns slowly clockwise",
  rotateCCW: "turns slowly anticlockwise",
};
const TRANSITIONS = {
  cut: "a hard cut – the next scene is simply there",
  slideLeft: "the next scene pushes in from the right, moving left",
  slideRight: "the next scene pushes in from the left, moving right",
  slideUp: "the next scene pushes in from below, moving up",
  slideDown: "the next scene pushes in from above, moving down",
  zoomThrough:
    "the camera flies forward into the next scene: it starts huge and blurred and settles – spatial, strong",
  fromDepth:
    "the next scene rises from far behind the frame, tipped back, and stands up – spatial",
  flip: "the next scene turns in like a card around its vertical axis – spatial",
};

const list = (entries: Record<string, string>) =>
  Object.entries(entries)
    .map(([id, what]) => `- ${id}: ${what}`)
    .join("\n");

const SYSTEM = `You are the motion designer of a short vertical motion video (1080x1920, 30 fps).
The script and the pictures (blocks) are decided; your only job is how everything moves,
so the whole video reads as one flow instead of a row of separate slides.

For every scene pick the transition into it. For every block, in order, pick:
- entrance and enterFrames: how it arrives on its word
- exit and exitFrames: how it leaves when the next block takes its place (or the scene ends)
- drift (optional): slow motion while it holds the screen
- moves (optional): on a later word of the voiceover its centre moves to x (% of the
  frame's width; leave it out to stay where it is) and y (% of the height) at scale – a
  deliberate change of composition (the diagram shrinks and slides left so the next thing
  has room), never a nudge; to move a block sideways, make it smaller so it stays in frame;
  never onto the spoken words (below the picture on top/split, above it on bottom)
- carry (optional, only the scene's last block): it stays into the next scene and glides
  to that scene's first place instead of leaving; the next transition is then "cut"
And in "idea", say in a sentence or two what your motion is: the main direction, which
move marks which kind of moment.

Each block already animates its own content inside itself (list items, nodes, numbers
counting); you decide how the block as a whole arrives, moves and leaves.
Read the video as one flow: look at how each scene ends before choosing how the next one
begins – direction, position and what carries over are choices, not accidents. Not every
element needs an animation just because one is available.
Use the principles below as knowledge of what works and why – "must" ones carry the most
weight, "recommended" ones are strong defaults, "optional" ones help when they fit; the
numbers in them are TikMaker's starting values, not laws. The choices are yours.
Answer with one entry per scene and one per block, in the same order as given.`;

function userPrompt(
  scenes: SceneFromAi[],
  blocks: BlocksFromAi,
  principles: MotionPrinciple[],
  previous?: { motion: MotionFromAi; problems: MotionProblem[] },
): string {
  const seconds = (frames: number) => (frames / fps).toFixed(1);
  const timeline = blocks.scenes
    .map((picked, n) => {
      const voiceover = scenes[n]?.voiceover ?? "";
      const stage = picked.stage ?? "top";
      const places = STAGE_LAYOUTS[stage].visuals;
      const end = Math.round(
        Math.max(MIN_SCENE_SECONDS, voDurationSeconds(voiceover)) * fps,
      );
      const slots = blockTimeline(
        voiceover,
        picked.blocks.map((block) => block.onWord),
        places.length,
        end,
        (word) => wordFrame(word, fps),
      );
      const where = places
        .map(
          (place, zone) =>
            `place ${zone + 1} at y ${((place.y / videoDefaults.height) * 100).toFixed(0)}% scale ${place.scale}`,
        )
        .join(", ");
      const shown = picked.blocks
        .map((block, i) => {
          const { onWord: _, ...content } = block;
          const slot = slots[i];
          return `  ${i + 1}. on "${block.onWord}", ${seconds(slot.start)}–${seconds(slot.leaves)} s, place ${slot.zone + 1}: ${JSON.stringify(content)}`;
        })
        .join("\n");
      // Whether the previous scene's last block may be carried in: there is a
      // place for it and time to see it before this scene's first block takes
      // over – the same rule checkMotion applies, told up front so the model
      // does not plan a carry that is then sent back (test 10).
      const landing =
        places.length > 0 && (slots[0]?.start ?? end) >= MIN_CARRY_FRAMES;
      return `Scene ${n + 1} – ${stage} (${where || "no picture, words only"}), ${seconds(end)} s
  A carry from the previous scene can land here: ${landing ? "yes" : "no"}
  Voiceover: ${voiceover}
  Shows: ${scenes[n]?.visual ?? ""}${
    picked.happens
      ? `
  Happens: ${picked.happens}`
      : ""
  }
${shown || "  (no blocks)"}`;
    })
    .join("\n\n");

  const knowledge = principles
    .map(
      (p) =>
        // "why" stays in the knowledge base (and the thesis); the call gets
        // the rule and how it applies here – the prompt is about a third
        // shorter, and this call runs once per video and again per scene edit
        `- [${p.priority}] ${p.principle} In TikMaker: ${p.inTikMaker}`,
    )
    .join("\n");

  const prompt = `Principles:
${knowledge}

Entrances:
${list(ENTRANCES)}

Exits:
${list(EXITS)}

Drifts:
${list(DRIFTS)}

Transitions into a scene:
${list(TRANSITIONS)}

The video:
${timeline}`;
  if (!previous) return prompt;
  return `${prompt}

Your previous answer:
${JSON.stringify(previous.motion)}

The code found these problems – fix them, keep the rest:
${previous.problems.map((problem) => `- ${problem.message}`).join("\n")}`;
}

export async function pickMotion(
  scenes: SceneFromAi[],
  blocks: BlocksFromAi,
  principles: MotionPrinciple[],
  previous?: { motion: MotionFromAi; problems: MotionProblem[] },
  model?: Parameters<typeof callStructured>[2],
  // the conversation: what the creator wants changed in the motion
  request?: string,
): Promise<StructuredResult<MotionFromAi>> {
  const user =
    userPrompt(scenes, blocks, principles, previous) +
    (request
      ? `

The creator asks about the motion: ${request}`
      : "");
  return callStructured(motionFromAi, { system: SYSTEM, user }, model);
}
