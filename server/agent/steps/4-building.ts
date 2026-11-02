import type { Job } from "../job.js";
import { pickLayouts } from "../prompts/pickLayouts.js";

// 4 Building: the model picks a layout example for every scene of the
// approved script and says what goes into its pictures; the code has already
// checked the answer (pickLayouts). The editor then lays the scenes out with
// compileProject – the agent never writes the project itself.
export async function step4Building(job: Job): Promise<void> {
  const { input, script } = job.run;
  if (!script?.approved)
    throw new Error("The video is laid out only after the script is approved");
  const layout = await job.ai("pickLayouts", () =>
    pickLayouts(
      input,
      job.workspace,
      script.scenes,
      job.knowledge.layoutExamples,
    ),
  );
  await job.save({ layout });
}
