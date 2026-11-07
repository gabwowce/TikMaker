import { MIN_SCENE_SECONDS, voDurationSeconds } from "../../utils/pacing";
import { wordFrame, wordIndex } from "../../utils/voWords";
import {
  coversCaption,
  overlaps,
  STAGE_LAYOUTS,
  zoneBand,
  type ZonePlacement,
} from "../../video/stage/stageTypes";
import { stage } from "../../video/stage/tokens";
import { videoDefaults } from "../../video/typography/tokens";
import { blockTimeline } from "../blockTimeline";
import type { ScriptFromAi } from "../run/3-script";
import type { BlocksFromAi } from "../run/4-blocks";
import type { MotionFromAi, MotionProblem } from "../run/4-motion";

// The motion step (docs/motion-planas.md, B2): the model's motion checked by
// code, no AI. Only what follows from how the frame works – nothing piles up,
// everything stays in the frame, the timings fit – never which move is
// "right": that is the model's call. A problem is sent back once; what is
// still wrong is shown to the user.

const fps = videoDefaults.fps;
const FRAME_HEIGHT = videoDefaults.height;
const FRAME_WIDTH = videoDefaults.width;
// A block is drawn in a box the size of the top zone, full width; its content
// is stage.contentWidth wide.
const MAX_SCALE = videoDefaults.width / stage.contentWidth;
// A block may come with no entrance – already there – only this close to the
// scene's start, on its first word (the hook's first picture): later it would
// be on screen before its word is said.
export const NONE_FRAMES = 3;
// A carried block needs this long in the next scene before that scene's first
// block takes its place – or there is nothing to see of the carry.
export const MIN_CARRY_FRAMES = 12;

// The vertical band (px) a block covers at a pose (stageTypes.ts).
const band = zoneBand;

export function checkMotion(
  motion: MotionFromAi,
  blocks: BlocksFromAi,
  script: ScriptFromAi,
): MotionProblem[] {
  const problems: MotionProblem[] = [];
  if (motion.scenes.length !== blocks.scenes.length)
    problems.push({
      message: `${motion.scenes.length} scenes of motion, there are ${blocks.scenes.length} scenes of blocks`,
    });

  motion.scenes.forEach((scene, sceneIndex) => {
    const picked = blocks.scenes[sceneIndex];
    if (!picked) return;
    const problem = (message: string, blockIndex?: number) =>
      problems.push({
        sceneIndex,
        blockIndex,
        message: `Scene ${sceneIndex + 1}${blockIndex === undefined ? "" : `, block ${blockIndex + 1}`}: ${message}`,
      });
    if (scene.blocks.length !== picked.blocks.length) {
      problem(
        `${scene.blocks.length} blocks of motion, the scene has ${picked.blocks.length} – one entry per block, in order`,
      );
      return;
    }

    const voiceover = script.scenes[sceneIndex]?.voiceover ?? "";
    const layout = STAGE_LAYOUTS[picked.stage ?? "top"];
    const places = layout.visuals;
    // The same frames the editor will use (before a voiceover is made).
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
    const lastScene = sceneIndex === blocks.scenes.length - 1;

    scene.blocks.forEach((block, i) => {
      const slot = slots[i];
      const place = places[slot.zone];
      if (!place) return;
      const last = i === scene.blocks.length - 1;

      // A layer with no entrance is on screen from the scene's first frame:
      // right for a block on the first word, wrong for a later one.
      if (block.entrance === "none" && slot.start > NONE_FRAMES)
        problem(
          `entrance "none" shows it before "${picked.blocks[i].onWord}" is said – "none" is only for a block on the scene's first word`,
          i,
        );
      const window = slot.leaves - slot.start;
      const leaving = block.carry && last ? 0 : block.exitFrames;
      if (block.enterFrames + leaving > window)
        problem(
          `entrance ${block.enterFrames} + exit ${leaving} frames do not fit the ${window} frames it is on screen`,
          i,
        );

      // Moves: on a word said while it is on screen, inside the frame, and
      // not over the picture in the other place of a split.
      let from = slot.word + 1;
      for (const move of block.moves ?? []) {
        const word = wordIndex(voiceover, move.onWord, from);
        if (word === -1) {
          problem(
            `the move on "${move.onWord}" is not on a word said after the block appears`,
            i,
          );
          continue;
        }
        from = word + 1;
        const at = wordFrame(word, fps);
        if (at >= slot.leaves - leaving)
          problem(
            `the move on "${move.onWord}" comes after the block has gone`,
            i,
          );
        if (move.scale > MAX_SCALE)
          problem(
            `scale ${move.scale} is wider than the frame – at most ${MAX_SCALE.toFixed(2)}`,
            i,
          );
        // sideways: the block's content (contentWidth wide) stays in the frame
        if (move.x !== undefined) {
          const half = (stage.contentWidth / 2) * move.scale;
          const centre = (move.x / 100) * FRAME_WIDTH;
          if (centre - half < 0 || centre + half > FRAME_WIDTH)
            problem(
              `the move on "${move.onWord}" takes it out of the frame sideways (x ${move.x}, scale ${move.scale}) – make it smaller to move it aside`,
              i,
            );
        }
        const covers = band((move.y / 100) * FRAME_HEIGHT, move.scale);
        if (covers[0] < 0 || covers[1] > FRAME_HEIGHT)
          problem(
            `the move on "${move.onWord}" takes it out of the frame (y ${move.y}, scale ${move.scale})`,
            i,
          );
        // the spoken words stay readable: a move never lands on them
        if (coversCaption(picked.stage ?? "top", (move.y / 100) * FRAME_HEIGHT, move.scale))
          problem(
            `the move on "${move.onWord}" runs into the spoken words (y ${move.y}, scale ${move.scale}) – keep it above them, or make it smaller`,
            i,
          );
        places.forEach((other: ZonePlacement, zone) => {
          if (zone === slot.zone) return;
          // the other place has a picture at any time from the move on
          const busy = slots.some(
            (s) => s.zone === zone && s.start < slot.leaves && at < s.leaves,
          );
          if (busy && overlaps(covers, band(other.y, other.scale)))
            problem(
              `the move on "${move.onWord}" lands on the picture in the other place`,
              i,
            );
        });
      }

      // A carry: the scene's last block, into a scene with a picture, on a
      // cut, with time to be seen there before the next block takes over.
      if (!block.carry) return;
      if (!last) return problem("only a scene's last block can be carried", i);
      if (lastScene)
        return problem("the last scene has nothing to carry into", i);
      const next = blocks.scenes[sceneIndex + 1];
      if (!STAGE_LAYOUTS[next.stage ?? "top"].visuals.length)
        return problem(
          "the next scene is a statement – it has no place to carry into",
          i,
        );
      if (motion.scenes[sceneIndex + 1]?.transition !== "cut")
        problem(
          "a carried block glides on its own – the next scene's transition must be cut",
          i,
        );
      const nextVoiceover = script.scenes[sceneIndex + 1]?.voiceover ?? "";
      const firstWord = wordIndex(nextVoiceover, next.blocks[0]?.onWord ?? "");
      if (firstWord !== -1 && wordFrame(firstWord, fps) < MIN_CARRY_FRAMES)
        problem(
          "the next scene's first block comes at once – nothing to carry into",
          i,
        );
    });
  });
  return problems;
}
