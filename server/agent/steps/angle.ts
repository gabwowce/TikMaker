import type { VideoTemplate } from "../../../src/agent/knowledge.js";
import type { ValueFromAi } from "../../../src/agent/run/2-angle.js";
import type { Job } from "../job.js";
import { checkValue } from "../prompts/checkValue.js";
import { pickTemplate } from "../prompts/pickTemplate.js";
import { agentSays } from "../messages.js";
import { writeHooks } from "../prompts/writeHooks.js";
import { askedBefore, askIfNeeded, withoutAsking } from "./ask.js";

// 2 Angle: is the idea worth a video (and the idea written as the video will
// tell it), which template it follows, and three opening lines for the user
// to pick from. Only the value check may stop to ask the creator. (The user's answers on that
// screen – another template, a hook picked – are saved in agent.ts.)

// Which template the video follows – the one chosen in the form, or else the
// model picks one. It never asks: the questions belong to the value check.
export async function chooseTemplate(job: Job): Promise<void> {
  const chosen = job.run.input.videoTemplateId;
  if (chosen) {
    // Chosen in the form: no need to ask the model.
    findTemplate(job, chosen);
    await job.save({ template: { videoTemplateId: chosen, pickedBy: "user" } });
    return;
  }
  const template = await job.ai(
    pickTemplate(job.input, job.workspace, job.knowledge.videoTemplates),
  );
  await job.save({ template: { ...template, pickedBy: "agent" } });
}

// The value check (prompts/checkValue.ts): judged against the channel's
// direction before anything is written, from the creator's own words
// (run.input). A weak or off-channel idea asks the creator for what would
// carry it; any idea may ask for a fact only the creator knows. Once
// answered (or kept as it is), the verdict and the checked idea are saved,
// and the agent says which idea it goes on with.
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
      job.input,
      job.workspace,
      template,
      job.knowledge.hookFormulas,
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
