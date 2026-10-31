import type { AgentRun } from "../../src/agent/run/run.js";
import { openJob } from "./job.js";
import { getRun, saveRun } from "./runs.js";
import { step2Hooks, step2Template } from "./steps/2-angle.js";
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
      await job.save({
        status: job.run.hook ? "writing_script" : "awaiting_hook",
      });
      return;

    case "awaiting_hook": // the user answered on screen 2
      if (job.run.hook) {
        // A hook was picked: on to the script (D6: step3Script).
        await job.save({ status: "writing_script" });
        return;
      }
      if (job.run.hooksFor !== job.run.template?.videoTemplateId) {
        // "Change": the hooks were for another template – write new ones.
        await job.save({ status: "writing_hooks" });
        await step2Hooks(job);
        await job.save({ status: "awaiting_hook" });
      }
      return;
  }
}
