import { checkBlocks } from "../../../src/agent/rules/checkBlocks.js";
import { checkMotion } from "../../../src/agent/rules/checkMotion.js";
import type {
  BlocksFromAi,
  BlocksProblem,
} from "../../../src/agent/run/4-blocks.js";
import type { SceneEditFromAi } from "../../../src/agent/run/6-edit.js";
import type { Job } from "../job.js";
import { blockLibrary, editSceneBlocks } from "../prompts/pickBlocks.js";
import { pickMotion } from "../prompts/pickMotion.js";

// 6 Changing one scene's pictures, asked for with a message about that scene
// (steps/7-chat.ts): the scene's blocks again with the user's comment –
// seeing the whole video, so it does not repeat a look – checked by code with
// one fix as in step 4, then the motion again, of which only this scene's
// part is taken so the other scenes move as they did. Returns what the code
// still found in the new scene.
export async function changeScenePictures(
  job: Job,
  n: number,
  comment: string,
): Promise<BlocksProblem[]> {
  const { input, script, blocks, motion } = job.run;
  if (!script || !blocks) throw new Error("The video is not built yet");
  if (!script.scenes[n]) throw new Error(`There is no scene ${n + 1}`);

  // The video's blocks with this scene replaced, and what the code finds in
  // it: this scene's problems, and the video-wide ones (a look repeated)
  // which the new scene may have caused.
  const withScene = (scene: SceneEditFromAi): BlocksFromAi => ({
    scenes: blocks.scenes.map((s, i) => {
      if (i !== n) return s;
      const { wishes: _, ...picked } = scene;
      return picked;
    }),
    wishes: [...new Set([...blocks.wishes, ...scene.wishes])],
  });
  const check = (plan: BlocksFromAi) =>
    checkBlocks(plan, script, blockLibrary).filter(
      (problem) => problem.sceneIndex === n || problem.sceneIndex === undefined,
    );
  const pick = (previous?: {
    scene: SceneEditFromAi;
    problems: BlocksProblem[];
  }) =>
    job.ai("editScene", () =>
      editSceneBlocks(
        input,
        job.workspace,
        script.scenes,
        job.knowledge.picturePrinciples,
        blocks,
        n,
        comment,
        previous,
      ),
    );
  let scene = await pick();
  let problems = check(withScene(scene));
  // as in step 4: only what is broken is sent back; advice is shown
  const broken = problems.filter((problem) => !problem.advice);
  if (broken.length) {
    scene = await pick({ scene, problems: broken });
    problems = check(withScene(scene));
  }
  const plan = withScene(scene);
  // The rest of the video keeps the problems it had; this scene's are new.
  const kept = blocks.problems.filter(
    (problem) => problem.sceneIndex !== n && problem.sceneIndex !== undefined,
  );
  await job.save({ blocks: { ...plan, problems: [...kept, ...problems] } });

  // The motion: planned again for the whole video (it reads as one flow), but
  // only this scene's part replaces the old one.
  const planned = await job.ai("pickMotion", () =>
    pickMotion(script.scenes, plan, job.knowledge.motionPrinciples),
  );
  const fresh = planned.scenes[n];
  if (motion && fresh) {
    const scenes = motion.scenes.map((s, i) => (i === n ? fresh : s));
    const merged = { idea: motion.idea, scenes };
    await job.save({
      motion: { ...merged, problems: checkMotion(merged, plan, script) },
    });
  }
  return problems;
}
