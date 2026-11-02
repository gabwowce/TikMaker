import type { VideoTemplate } from "../../../src/agent/knowledge.js";
import {
  TEMPLATE_CHANGEABLE,
  type ChooseHookFromUser,
} from "../../../src/agent/run/2-angle.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import { openJob, type Job } from "../job.js";
import { pickTemplate } from "../prompts/pickTemplate.js";
import { writeHooks } from "../prompts/writeHooks.js";

// 2 Angle, part one: which template the video follows – the one chosen in the
// form, or else the model picks one.
export async function step2Template(job: Job): Promise<void> {
  const chosen = job.run.input.videoTemplateId;
  if (chosen) {
    // Chosen in the form: no need to ask the model.
    findTemplate(job, chosen);
    await job.save({ template: { videoTemplateId: chosen, pickedBy: "user" } });
    return;
  }
  const template = await job.ai("pickTemplate", () =>
    pickTemplate(job.run.input, job.workspace, job.knowledge.videoTemplates),
  );
  await job.save({ template: { ...template, pickedBy: "agent" } });
}

// 2 Angle, part two: the opening line. Written in the form – used as it is;
// else the model proposes three for the template (FR-06) and the user picks.
export async function step2Hooks(job: Job): Promise<void> {
  const own = job.run.input.hook;
  if (own) {
    await job.save({ hook: { text: own, pickedBy: "user" } });
    return;
  }
  if (!job.run.template) throw new Error("Hooks need a template first");
  const template = findTemplate(job, job.run.template.videoTemplateId);
  const hooks = await job.ai("writeHooks", () =>
    writeHooks(
      job.run.input,
      job.workspace,
      template,
      job.knowledge.hookFormulas,
    ),
  );
  await job.save({ hooks, hooksFor: template.id });
}

// The user's answer on screen 2: go on with another template instead of the
// agent's pick ("Change"). agent.ts then writes hooks for it.
export async function step2ChangeTemplate(
  run: AgentRun,
  videoTemplateId: string,
): Promise<void> {
  if (!TEMPLATE_CHANGEABLE.includes(run.status))
    throw new Error(`The template can't be changed now (${run.status})`);
  const job = await openJob(run);
  findTemplate(job, videoTemplateId);
  await job.save({ template: { videoTemplateId, pickedBy: "user" } });
}

// The user's other answer on screen 2: one of the three hooks, or their own
// text (FR-07). agent.ts then goes on to the script.
export async function step2ChooseHook(
  run: AgentRun,
  choice: ChooseHookFromUser,
): Promise<void> {
  if (run.status !== "awaiting_hook")
    throw new Error(`A hook can't be chosen now (${run.status})`);
  const job = await openJob(run);
  if ("text" in choice) {
    await job.save({ hook: { text: choice.text, pickedBy: "user" } });
    return;
  }
  const option = run.hooks?.[choice.hookIndex];
  if (!option)
    throw new Error(`There is no hook number ${choice.hookIndex + 1}`);
  await job.save({
    hook: { text: option.text, formulaId: option.formulaId, pickedBy: "agent" },
  });
}

// Only a template from the knowledge base (FR-04).
export function findTemplate(job: Job, videoTemplateId: string): VideoTemplate {
  const template = job.knowledge.videoTemplates.find(
    (t) => t.id === videoTemplateId,
  );
  if (!template) throw new Error(`Unknown template "${videoTemplateId}"`);
  return template;
}
