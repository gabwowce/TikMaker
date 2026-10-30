import type { AgentRun, AgentRunStatus } from "../../src/agent/agentRun.js";
import { KNOWLEDGE_DIR } from "../config.js";
import { loadKnowledge } from "./knowledge.js";
import type { StructuredResult } from "./llm.js";
import { getRun, saveRun } from "./runs.js";
import { pickTemplate } from "./steps/pickTemplate.js";

// Moves a run forward in the background, one step at a time. Every status
// change is written to the run's file straight away, so the panel (which keeps
// asking agent.get) shows each step as it happens. A failure stops the run in
// "error" with the reason, instead of leaving it stuck mid-step.
export function continueRun(run: AgentRun): void {
  void advance(run).catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    // The file is newer than `run` (steps logged since), so build on it.
    const latest = (await getRun(run.id)) ?? run;
    await saveRun({ ...latest, status: "error", error: message });
  });
}

async function advance(run: AgentRun): Promise<void> {
  const { knowledge } = await loadKnowledge(KNOWLEDGE_DIR);
  const workspace = knowledge.workspaces.find(
    (entry) => entry.workspace.id === run.input.workspaceId,
  )?.workspace;
  if (!workspace) throw new Error(`Unknown channel "${run.input.workspaceId}"`);

  if (run.status === "created") {
    const { run: next, data } = await aiStep(
      run,
      "picking_template",
      "pickTemplate",
      () => pickTemplate(run.input, workspace, knowledge.videoTemplates),
    );
    // Hooks come next (D5); until that step exists the run waits here.
    run = { ...next, template: data, status: "writing_hooks" };
    await saveRun(run);
  }
}

// One call to the model, logged in steps[] with its time and tokens (FR-21).
// The status is saved before the call, so the panel shows what is running.
async function aiStep<T>(
  run: AgentRun,
  status: AgentRunStatus,
  name: string,
  call: () => Promise<StructuredResult<T>>,
): Promise<{ run: AgentRun; data: T }> {
  run = { ...run, status };
  await saveRun(run);
  const startedAt = Date.now();
  try {
    const result = await call();
    const step = {
      name,
      startedAt,
      ms: result.ms,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      output: result.data,
    };
    return { run: { ...run, steps: [...run.steps, step] }, data: result.data };
  } catch (error) {
    // The failed call stays in the log too, with how long it took.
    const message = error instanceof Error ? error.message : String(error);
    const step = {
      name,
      startedAt,
      ms: Date.now() - startedAt,
      error: message,
    };
    await saveRun({ ...run, steps: [...run.steps, step] });
    throw error;
  }
}
