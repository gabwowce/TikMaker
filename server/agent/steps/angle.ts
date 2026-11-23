import type { VideoTemplate } from "../../../src/agent/knowledge.js";
import {
  TEMPLATE_CHANGEABLE,
  type ChooseHookFromUser,
} from "../../../src/agent/run/2-angle.js";
import type { ValueInRun } from "../../../src/agent/run/2-angle.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import { openJob, type Job } from "../job.js";
import { checkValue } from "../prompts/checkValue.js";
import { pickTemplate } from "../prompts/pickTemplate.js";
import { agentSays } from "../messages.js";
import { writeHooks } from "../prompts/writeHooks.js";
import { askedBefore, askIfNeeded, withoutAsking } from "./ask.js";

// 2 Angle: is the idea worth a video, which template it follows, and three
// opening lines for the user to pick from. Plus the user's two answers on
// that screen (another template, a hook picked).

// Which template the video follows – the one chosen in the form, or else the
// model picks one (it may ask the creator instead of guessing).
export async function chooseTemplate(job: Job): Promise<void> {
  const chosen = job.run.input.videoTemplateId;
  if (chosen) {
    // Chosen in the form: no need to ask the model.
    findTemplate(job, chosen);
    await job.save({ template: { videoTemplateId: chosen, pickedBy: "user" } });
    return;
  }
  const template = await job.ai("pickTemplate", () =>
    pickTemplate(
      job.run.input,
      job.workspace,
      job.knowledge.videoTemplates,
      undefined,
      askedBefore(job.run, "pickTemplate"),
    ),
  );
  // the agent asked the creator instead of guessing: nothing saved yet
  if (await askIfNeeded(job, "pickTemplate", template)) return;
  await job.save({
    template: { ...withoutAsking(template), pickedBy: "agent" },
  });
}

// The value check (prompts/checkValue.ts): judged against the channel's
// direction before anything is written. A weak or off-channel idea asks the
// creator for what would carry it; once answered (or kept as it is), the
// verdict is saved (and said, when it is not strong), and the run goes on – the
// creator decides, the agent only makes the gap visible.
export async function judgeValue(job: Job): Promise<void> {
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
  // A strong idea goes on quietly; a weak one the creator kept is said, so
  // the gap stays visible.
  if (saved.verdict !== "strong") await agentSays(job, valueMessage(saved));
}

function valueMessage(value: ValueInRun): string {
  const label =
    value.verdict === "weak" ? "a weak idea" : "not what this channel makes";
  return (
    `Value check – ${label}: ${value.reason}` +
    (value.betterAngle ? ` A stronger angle: ${value.betterAngle}` : "")
  );
}

// The opening line. Written in the form – used as it is; else the model
// proposes three for the template (FR-06) and the user picks.
export async function offerHooks(job: Job): Promise<void> {
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
      undefined,
      undefined,
      job.run.value,
    ),
  );
  await job.save({ hooks, hooksFor: template.id });
}

// The user's answer on screen 2: go on with another template instead of the
// agent's pick ("Change"). agent.ts then writes hooks for it.
export async function saveTemplate(
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
export async function saveHook(
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
