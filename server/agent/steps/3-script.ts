import { checkScript } from "../../../src/agent/rules/checkScript.js";
import type { ScriptInRun } from "../../../src/agent/run/3-script.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import { openJob, type Job } from "../job.js";
import { research } from "../prompts/research.js";
import { writeScript, type ScriptChange } from "../prompts/writeScript.js";
import { findTemplate } from "./2-angle.js";
import { askedBefore, askIfNeeded, withoutAsking } from "../tools/ask.js";

// 3 Script: the model writes the script for the template and the hook; the
// code checks it and, if anything is wrong, the model fixes it once.
// What is still wrong after that stays in script.problems for the user to see.
// Written again with the user's comment when they leave one.
export async function step3Script(job: Job): Promise<void> {
  const { input, template: chosen, hook, script: previous } = job.run;
  if (!chosen || !hook)
    throw new Error("The script needs a template and a hook first");
  const template = findTemplate(job, chosen.videoTemplateId);
  const write = (revise?: ScriptChange) =>
    job.ai("writeScript", () =>
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

  // Looked up once per run; a rewrite after a comment reuses the facts. A
  // search that fails (no search quota on the key, the network) is logged and
  // the script is written from the idea alone, as before.
  // Only when the template step said the video needs outside facts.
  if (!job.run.research && job.run.template?.needsFacts !== false) {
    try {
      const found = await job.ai("research", () =>
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
  if (await askIfNeeded(job, "writeScript", script)) return;
  let problems = check(script);
  if (problems.length) {
    script = await write({
      previous: script,
      change: problems.map((problem) => problem.message),
    });
    problems = check(script);
  }
  await job.save({ script: { ...withoutAsking(script), problems } });
}

// "Approve" on screen 3: agent.ts then goes on to building the video.
export async function step3Approve(run: AgentRun): Promise<void> {
  const script = scriptAwaitingAnswer(run);
  const job = await openJob(run);
  await job.save({ script: { ...script, approved: true } });
}

// A comment on screen 3: agent.ts then has the script written again with it.
// The user answers only while the agent waits for them.
function scriptAwaitingAnswer(run: AgentRun): ScriptInRun {
  if (run.status !== "awaiting_approval" || !run.script)
    throw new Error(`The script can't be answered now (${run.status})`);
  return run.script;
}

// The script as the model wrote it, without what the run added to it.
function asWritten(script: ScriptInRun): ScriptChange["previous"] {
  return {
    scenes: script.scenes,
    skipped: script.skipped,
  };
}
