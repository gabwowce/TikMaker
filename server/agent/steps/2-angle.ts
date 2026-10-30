import type { Job } from "../job.js";
import { pickTemplate } from "../prompts/pickTemplate.js";

// 2 Angle: the agent picks a template, then writes hooks (D5) and waits for
// the user to pick one.
export async function step2Angle(job: Job): Promise<void> {
  const template = await job.ai("picking_template", "pickTemplate", () =>
    pickTemplate(job.run.input, job.workspace, job.knowledge.videoTemplates),
  );
  // Hooks come next (D5); until that exists the run waits here.
  await job.save({ template, status: "writing_hooks" });
}
