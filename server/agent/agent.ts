import type { AgentRun } from "../../src/agent/run/run.js";
import { Job, openJob } from "./job.js";
import { getRun, saveRun } from "./runs.js";
import { step2Hooks, step2Template } from "./steps/2-angle.js";
import { step3Script } from "./steps/3-script.js";
import { step4Building } from "./steps/4-building.js";

// The whole agent on one page (screens: docs/d-planas.md).

//   1 Idea      the user fills the form and presses Start
//   2 Angle     template → hooks → WAIT: the user picks one
//   3 Script    script → check → WAIT: the user approves
//   4 Building  layout → rules → fixes
//   5 Result    voice → report → done

// Called by agent.start (and later by every "the user answered" endpoint).
// Works in the background; the panel keeps asking agent.get. Something fails →
// the run stops in "error" with the reason.
export function continueRun(run: AgentRun): void {
  void runAgent(run).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // The file is newer than `run` (steps logged since), so build on it.
    const latest = (await getRun(run.id)) ?? run;
    await saveRun({ ...latest, status: "error", error: message });
  });
}

// Which step comes next depends on where the run stopped. Statuses change
// only here; a step does its work and saves what it made.
async function runAgent(run: AgentRun): Promise<void> {
  const job = await openJob(run);
  switch (run.status) {
    case "created": // Start was pressed
      await job.save({ status: "picking_template" });
      await step2Template(job);
      await job.save({ status: "writing_hooks" });
      await step2Hooks(job);
      // A hook written in the form: nothing to wait for.
      if (job.run.hook) return toScript(job);
      await job.save({ status: "awaiting_hook" });
      return;

    case "awaiting_hook": // the user answered on screen 2
      if (job.run.hook) return toScript(job);
      if (job.run.hooksFor !== job.run.template?.videoTemplateId) {
        // "Change": the hooks were for another template – write new ones.
        await job.save({ status: "writing_hooks" });
        await step2Hooks(job);
        await job.save({ status: "awaiting_hook" });
      }
      return;
    case "awaiting_approval": // the user answered on screen 3
      // "Approve": on to building the video (D7: step4Building).
      if (job.run.script?.approved) {
        await job.save({ status: "laying_out" });
        await step4Building(job);
        await job.save({ status: "done" });
        return;
      }
      // A comment: the script is written again with it.
      if (job.run.script?.comment) return toScript(job);
      return;
  }
}

// 3 Script: written, checked, then the agent waits for the user's approval.
async function toScript(job: Job): Promise<void> {
  await job.save({ status: "writing_script" });
  await step3Script(job);
  await job.save({ status: "awaiting_approval" });
}
