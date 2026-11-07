import { checkBlocks } from "../../../src/agent/rules/checkBlocks.js";
import { checkMotion } from "../../../src/agent/rules/checkMotion.js";
import type {
  BlocksFromAi,
  BlocksProblem,
} from "../../../src/agent/run/4-blocks.js";
import type {
  MotionFromAi,
  MotionProblem,
} from "../../../src/agent/run/4-motion.js";
import type { Job } from "../job.js";
import { blockLibrary, pickBlocks } from "../prompts/pickBlocks.js";
import { pickMotion } from "../prompts/pickMotion.js";
import { askedBefore, askIfNeeded, withoutAsking } from "./ask.js";

// 4 Building (docs/motion-planas.md): every video is made of blocks on stage
// types. The model picks the blocks for every scene of the approved script and
// the code checks them (checkBlocks); problems get one fix with the previous
// answer, as in the script step. What is left goes into blocks.problems for
// the user to see. Then the motion, a call of its own. The editor builds the
// project from both (projectFromBlocks) – the agent never writes it itself.
// "Motion graphics only" only decides whether a block may ask the user for a
// recording of their own (the screen block).
export async function step4Building(job: Job): Promise<void> {
  const { input, script } = job.run;
  if (!script?.approved)
    throw new Error("The video is built only after the script is approved");
  const pick = (previous?: {
    blocks: BlocksFromAi;
    problems: BlocksProblem[];
  }) =>
    job.ai("pickBlocks", () =>
      pickBlocks(
        input,
        job.workspace,
        script.scenes,
        job.knowledge.picturePrinciples,
        previous,
        undefined,
        askedBefore(job.run, "pickBlocks"),
      ),
    );
  let blocks = await pick();
  // the agent asked the creator instead of guessing: nothing saved yet
  if (await askIfNeeded(job, "pickBlocks", blocks)) return;
  let problems = checkBlocks(blocks, script, blockLibrary);
  // Only what is broken goes back to the model; advice (taste) is shown to
  // the user and costs no second call.
  const broken = problems.filter((problem) => !problem.advice);
  if (broken.length) {
    blocks = await pick({ blocks, problems: broken });
    problems = checkBlocks(blocks, script, blockLibrary);
  }
  await job.save({ blocks: { ...withoutAsking(blocks), problems } });
  await step4Motion(job, blocks);
}

// After the blocks: a call of its own for how everything moves
// (docs/motion-planas.md, B), checked by code (checkMotion) with one fix, as
// the blocks are. What is left goes into motion.problems for the user to see.
async function step4Motion(job: Job, blocks: BlocksFromAi): Promise<void> {
  const { script } = job.run;
  if (!script) throw new Error("Motion needs the approved script");
  const pick = (previous?: {
    motion: MotionFromAi;
    problems: MotionProblem[];
  }) =>
    job.ai("pickMotion", () =>
      pickMotion(
        script.scenes,
        blocks,
        job.knowledge.motionPrinciples,
        previous,
      ),
    );
  let motion = await pick();
  let problems = checkMotion(motion, blocks, script);
  if (problems.length) {
    motion = await pick({ motion, problems });
    problems = checkMotion(motion, blocks, script);
  }
  await job.save({ motion: { ...motion, problems } });
}
