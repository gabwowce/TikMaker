import type { AgentRun, AgentRunStatus } from "../../src/agent/agentRun.js";
import type { Workspace } from "../../src/agent/knowledge.js";
import { KNOWLEDGE_DIR } from "../config.js";
import { loadKnowledge, type Knowledge } from "./knowledge.js";
import type { StructuredResult } from "./llm.js";
import { saveRun } from "./runs.js";

// What every step (steps/*.ts) works with: the run, the knowledge base and the
// user's channel, plus two helpers that keep the run's file up to date, so the
// panel (asking agent.get) sees each change as it happens.
export type Job = {
  run: AgentRun;
  knowledge: Knowledge;
  workspace: Workspace;
  // Writes these fields into the run's file straight away.
  save(changes: Partial<AgentRun>): Promise<void>;
  // One question to the model: shows `status`, asks, and logs the call in
  // steps[] with its time and tokens (FR-21), a failed one too. Returns the answer.
  ai<T>(
    status: AgentRunStatus,
    name: string,
    call: () => Promise<StructuredResult<T>>,
  ): Promise<T>;
};

export async function openJob(run: AgentRun): Promise<Job> {
  const { knowledge } = await loadKnowledge(KNOWLEDGE_DIR);
  const workspace = knowledge.workspaces.find(
    (entry) => entry.workspace.id === run.input.workspaceId,
  )?.workspace;
  if (!workspace) throw new Error(`Unknown channel "${run.input.workspaceId}"`);

  const job: Job = {
    run,
    knowledge,
    workspace,

    async save(changes) {
      job.run = { ...job.run, ...changes };
      await saveRun(job.run);
    },

    async ai(status, name, call) {
      await job.save({ status });
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
        await job.save({ steps: [...job.run.steps, step] });
        return result.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const step = { name, startedAt, ms: Date.now() - startedAt, error: message };
        await job.save({ steps: [...job.run.steps, step] });
        throw error;
      }
    },
  };
  return job;
}
