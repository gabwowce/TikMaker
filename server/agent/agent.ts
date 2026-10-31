import type { AgentRun } from "../../src/agent/agentRun.js";
import { openJob } from "./job.js";
import { getRun, saveRun } from "./runs.js";
import { step2Angle } from "./steps/2-angle.js";

// The whole agent on one page (screens: docs/d-planas.md).
//
//   1 Idea      the user fills the form and presses Start   steps/1-idea.ts
//   2 Angle     template → hooks → WAIT: the user picks one  steps/2-angle.ts
//   3 Script    script → check → WAIT: the user approves     (D6)
//   4 Building  layout → rules → fixes                       (D7–D8)
//   5 Result    voice → report → done                        (D10)

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
      await step2Angle(job);
      // D5: step2Hooks, then "awaiting_hook"
      await job.save({ status: "writing_hooks" });
      return;
    // case "writing_script": the user picked a hook → step3Script (D6)
  }
}
