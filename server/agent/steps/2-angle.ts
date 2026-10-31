import {
  TEMPLATE_CHANGEABLE,
  type AgentRun,
} from "../../../src/agent/agentRun.js";
import { openJob, type Job } from "../job.js";
import { pickTemplate } from "../prompts/pickTemplate.js";

// 2 Angle: which template the video follows – the one chosen in the form, or
// else the model picks one. (Hooks come in D5.)
export async function step2Angle(job: Job): Promise<void> {
  const chosen = job.run.input.videoTemplateId;
  if (chosen) {
    // Chosen in the form: no need to ask the model.
    checkTemplate(job, chosen);
    await job.save({ template: { videoTemplateId: chosen, pickedBy: "user" } });
    return;
  }
  const template = await job.ai("pickTemplate", () =>
    pickTemplate(job.run.input, job.workspace, job.knowledge.videoTemplates),
  );
  await job.save({ template: { ...template, pickedBy: "agent" } });
}

// The user's answer on screen 2: go on with another template instead of the
// agent's pick ("Change").
export async function step2ChangeTemplate(
  run: AgentRun,
  videoTemplateId: string,
): Promise<void> {
  if (!TEMPLATE_CHANGEABLE.includes(run.status))
    throw new Error(`The template can't be changed now (${run.status})`);
  const job = await openJob(run);
  checkTemplate(job, videoTemplateId);
  await job.save({ template: { videoTemplateId, pickedBy: "user" } });
}

// Only a template from the knowledge base (FR-04).
function checkTemplate(job: Job, videoTemplateId: string): void {
  if (!job.knowledge.videoTemplates.some((t) => t.id === videoTemplateId))
    throw new Error(`Unknown template "${videoTemplateId}"`);
}
