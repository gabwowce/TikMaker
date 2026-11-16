import type { VideoTemplate } from "../../../src/agent/knowledge.js";
import {
  TEMPLATE_CHANGEABLE,
  type ChooseHookFromUser,
  type ValueFromAi,
} from "../../../src/agent/run/2-angle.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import { openJob, type Job } from "../job.js";
import { checkValue } from "../prompts/checkValue.js";
import { pickTemplate } from "../prompts/pickTemplate.js";
import { agentSays } from "./7-chat.js";
import { writeHooks } from "../prompts/writeHooks.js";
import { askedBefore, askIfNeeded, withoutAsking } from "../tools/ask.js";

// 2 Angle, part one: is the idea worth a video (and the idea written as the
// video will tell it), then which template the video follows – the one
// chosen in the form, or else the model picks one. Only the value check may
// stop to ask the creator; the template never does.
export async function step2Template(job: Job): Promise<void> {
  if (!job.run.value) {
    await step2Value(job);
    if (job.run.status === "awaiting_answers") return;
  }
  const chosen = job.run.input.videoTemplateId;
  if (chosen) {
    // Chosen in the form: no need to ask the model.
    findTemplate(job, chosen);
    await job.save({ template: { videoTemplateId: chosen, pickedBy: "user" } });
    return;
  }
  const template = await job.ai("pickTemplate", () =>
    pickTemplate(job.input, job.workspace, job.knowledge.videoTemplates),
  );
  await job.save({ template: { ...template, pickedBy: "agent" } });
}

// The value check (prompts/checkValue.ts): judged against the channel's
// direction before anything is written, from the creator's own words
// (run.input). A weak or off-channel idea asks the creator for what would
// carry it; any idea may ask for a fact only the creator knows. Once
// answered (or kept as it is), the verdict and the checked idea are saved,
// and the agent says which idea it goes on with – the creator sees it before
// anything is written from it.
async function step2Value(job: Job): Promise<void> {
  const value = await job.ai("checkValue", () =>
    checkValue(
      job.run.input,
      job.workspace,
      undefined,
      askedBefore(job.run, "checkValue"),
    ),
  );
  if (await askIfNeeded(job, "checkValue", value)) return;
  const saved = withoutAsking(value);
  await job.save({ value: saved });
  await agentSays(job, valueMessage(saved));
}

function valueMessage(value: Omit<ValueFromAi, "questions" | "assumptions">): string {
  // a weak idea the creator kept is said, so the gap stays visible
  const verdict =
    value.verdict === "strong"
      ? ""
      : `Value check – ${value.verdict === "weak" ? "a weak idea" : "not what this channel makes"}: ${value.reason}\n`;
  return `${verdict}The idea I'm making the video from: ${value.idea}`;
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
      job.input,
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
    hook: {
      text: option.text,
      formulaId: option.formulaId,
      firstFrame: option.firstFrame,
      pickedBy: "agent",
    },
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
