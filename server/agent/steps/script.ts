import { checkScript } from "../../../src/agent/rules/checkScript.js";
import type {
  ScriptInRun,
  StoryFromAi,
} from "../../../src/agent/run/3-script.js";
import type { Job } from "../job.js";
import { isLimitError } from "../limits.js";
import { checkStory, storyProblems } from "../prompts/checkStory.js";
import { research } from "../prompts/research.js";
import { writeScript, type ScriptChange } from "../prompts/writeScript.js";
import { findTemplate } from "./angle.js";
import { askedBefore, askIfNeeded, withoutAsking } from "./ask.js";

// 3 Script: the model writes the script for the template and the hook; the
// code checks it (seconds, words) and the story check reads it back as a
// viewer would (does it hang together, is it clear); if anything is wrong,
// the model fixes it once. What is still wrong after that stays in
// script.problems for the user to see. Written again with the user's comment
// when they leave one.
export async function writeAndCheck(job: Job): Promise<void> {
  const { input, template: chosen, hook, script: previous } = job.run;
  if (!chosen || !hook)
    throw new Error("The script needs a template and a hook first");
  const template = findTemplate(job, chosen.videoTemplateId);
  const write = (revise?: ScriptChange) =>
    job.ai(
      writeScript(
        input,
        job.workspace,
        template,
        hook,
        job.knowledge,
        revise,
        undefined,
        job.run.research?.facts,
        askedBefore(job.run, "writeScript"),
        job.run.value,
      ),
    );
  const check = (script: ScriptChange["previous"]) =>
    checkScript(script, input.targetSeconds, job.knowledge.designRules);
  // The story check. A call that fails (other than the usage limit, which
  // pauses the run) is in the run's log; the script goes on without it.
  const read = async (
    script: ScriptChange["previous"],
  ): Promise<StoryFromAi | undefined> => {
    try {
      return await job.ai(checkStory(input, hook, script.scenes));
    } catch (error) {
      if (isLimitError(error)) throw error;
      return undefined;
    }
  };

  // Looked up once per run; a rewrite after a comment reuses the facts. A
  // search that fails (no search quota on the key, the network) is logged and
  // the script is written from the idea alone, as before.
  // Only when the template step said the video needs outside facts.
  if (!job.run.research && job.run.template?.needsFacts !== false) {
    try {
      const found = await job.ai(
        research(input, job.workspace, undefined, job.run.value),
      );
      await job.save({
        research: { facts: found.text, sources: found.sources },
      });
    } catch {
      // job.ai has already put the failed call in the run's log.
    }
  }

  let script = await write(
    previous?.comment
      ? { previous: asWritten(previous), change: [previous.comment] }
      : undefined,
  );
  // the agent asked the creator instead of guessing: nothing saved yet
  await askIfNeeded(job, "writeScript", script);
  let story = await read(script);
  let problems = [...check(script), ...storyProblems(story)];
  if (problems.length) {
    script = await write({
      previous: script,
      change: problems.map((problem) => problem.message),
    });
    story = await read(script);
    problems = [...check(script), ...storyProblems(story)];
  }
  await job.save({ script: { ...withoutAsking(script), problems, story } });
}

// The script as the model wrote it, without what the run added to it.
function asWritten(script: ScriptInRun): ScriptChange["previous"] {
  return {
    scenes: script.scenes,
    skipped: script.skipped,
  };
}
