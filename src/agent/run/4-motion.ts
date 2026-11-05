import { z } from "zod";
import {
  entrancePresetSchema,
  exitPresetSchema,
  kenBurnsPresetSchema,
} from "../../schema/capabilities";

// 4 Building, motion video – the motion step (docs/motion-planas.md, B): after
// the blocks are picked, a separate call whose only job is how everything
// moves. The model answers in the same order as the blocks: one entry per
// scene, one per block in it. What it may pick is the code's own list of
// presets; checkMotion checks the rest (nothing piles up, all in frame).

// The cut into a scene. ("push" is an old alias of slideLeft – not offered.)
export const motionTransition = z.enum([
  "cut",
  "slideLeft",
  "slideRight",
  "slideUp",
  "slideDown",
]);

// A move while the block is on screen (becomes a keyframe): from the word
// `onWord` on, its centre is at `y` (% of the frame's height) at `scale`.
export const blockMove = z.object({
  onWord: z.string().trim().min(1),
  y: z.number().min(0).max(100),
  scale: z.number().min(0.3).max(1.2),
});

export const blockMotionFromAi = z.object({
  // How it arrives on its word and leaves when the next one takes its place;
  // frames at 30 fps.
  entrance: entrancePresetSchema,
  enterFrames: z.number().int().min(4).max(30),
  exit: exitPresetSchema,
  exitFrames: z.number().int().min(4).max(30),
  // Slow continuous motion while it holds the screen (objects, screenshots).
  drift: kenBurnsPresetSchema.optional(),
  moves: z.array(blockMove).max(3).optional(),
  // Only a scene's last block: instead of leaving, it stays into the next
  // scene and glides to that scene's first place.
  carry: z.boolean().optional(),
});

export const sceneMotionFromAi = z.object({
  transition: motionTransition,
  blocks: z.array(blockMotionFromAi).max(4),
});

export const motionFromAi = z.object({
  // The video's motion in a sentence or two – the main direction, which move
  // marks which kind of moment. Shown to the user in the panel.
  idea: z.string().trim().min(10).max(400),
  scenes: z.array(sceneMotionFromAi).min(1),
});

// One problem the code found: where, and what is wrong.
export const motionProblem = z.object({
  sceneIndex: z.number().int().min(0).optional(),
  blockIndex: z.number().int().min(0).optional(),
  message: z.string().min(1),
});

// In the run's file: what the model sent, and the problems it did not fix.
export const motionInRun = motionFromAi.extend({
  problems: z.array(motionProblem),
});

export type MotionTransition = z.infer<typeof motionTransition>;
export type BlockMove = z.infer<typeof blockMove>;
export type BlockMotionFromAi = z.infer<typeof blockMotionFromAi>;
export type SceneMotionFromAi = z.infer<typeof sceneMotionFromAi>;
export type MotionFromAi = z.infer<typeof motionFromAi>;
export type MotionProblem = z.infer<typeof motionProblem>;
export type MotionInRun = z.infer<typeof motionInRun>;
