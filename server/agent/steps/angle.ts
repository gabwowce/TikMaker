import type { VideoTemplate } from "../../../src/agent/knowledge.js";
import type { ValueInRun } from "../../../src/agent/run/2-angle.js";
import type { Job } from "../job.js";
import { checkValue } from "../prompts/checkValue.js";
import { pickTemplate } from "../prompts/pickTemplate.js";
import { agentSays } from "../messages.js";
import { writeHooks } from "../prompts/writeHooks.js";
import { askedBefore, askIfNeeded, withoutAsking } from "./ask.js";

// 2 Angle: is the idea worth a video, which template it follows, and three
// opening lines for the user to pick from. (The user's answers on that
// screen – another template, a hook picked – are saved in agent.ts.)

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
  const template = await job.ai(
    pickTemplate(
      job.run.input,
      job.workspace,
      job.knowledge.videoTemplates,
      undefined,
      askedBefore(job.run, "pickTemplate"),
    ),
  );
  // the agent asked the creator instead of guessing: nothing saved yet
  await askIfNeeded(job, "pickTemplate", template);
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
  const value = await job.ai(
    checkValue(
      job.run.input,
      job.workspace,
      undefined,
      askedBefore(job.run, "checkValue"),
    ),
  );
  await askIfNeeded(job, "checkValue", value);
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
  const hooks = await job.ai(
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

// Only a template from the knowledge base (FR-04).
export function findTemplate(job: Job, videoTemplateId: string): VideoTemplate {
  const template = job.knowledge.videoTemplates.find(
    (t) => t.id === videoTemplateId,
  );
  if (!template) throw new Error(`Unknown template "${videoTemplateId}"`);
  return template;
}
