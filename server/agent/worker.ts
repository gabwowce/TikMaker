import type { AgentRun } from "../../src/agent/run/run.js";
import { RESTING_STATUSES } from "../../src/agent/run/status.js";
import { isLimitError } from "./limits.js";
import { allRuns, getRun, saveRun } from "./runs.js";

// A usage limit pauses the run ("Continue" goes on later); any other error
// stops it, with the reason on the panel.
export async function stopRun(runId: string, error: unknown): Promise<void> {
  const run = await getRun(runId);
  if (!run) return;
  const message = error instanceof Error ? error.message : String(error);
  if (isLimitError(error))
    await saveRun({ ...run, status: "paused", pausedFrom: run.status, error: message });
  else await saveRun({ ...run, status: "error", error: message });
}

// At server start: a run that was working when the server stopped has no
// worker any more. It is paused, and a message it was on goes back in line,
// so "Continue" picks both up.
export async function pauseInterruptedRuns(): Promise<void> {
  for (const run of await allRuns()) {
    const messages = run.messages ?? [];
    const messageCutOff = messages.some((m) => m.status === "working");
    const runCutOff = !RESTING_STATUSES.includes(run.status);
    if (!runCutOff && !messageCutOff) continue;
    await saveRun({
      ...run,
      messages: messages.map((m) =>
        m.status === "working" ? { ...m, status: "waiting" } : m,
      ),
      ...(run.status === "paused"
        ? {}
        : {
            status: "paused",
            pausedFrom: runCutOff ? run.status : ("answering" satisfies AgentRun["status"]),
            error: "The server restarted while the agent was working.",
          }),
    });
  }
}
