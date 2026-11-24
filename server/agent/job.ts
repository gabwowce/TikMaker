import type { AgentRun } from "../../src/agent/run/run.js";
import type { Workspace } from "../../src/agent/knowledge.js";
import { KNOWLEDGE_DIR } from "../config.js";
import { loadKnowledge, type Knowledge } from "./knowledge.js";
import {
  StructuredCallError,
  type CallLog,
  type StructuredResult,
} from "./llm.js";
import { saveRun } from "./runs.js";

// What every step works with: the run, the knowledge base, the channel, and
// two helpers – save (into the run's file) and ai (a model call, logged).
export type Job = {
  run: AgentRun;
  knowledge: Knowledge;
  workspace: Workspace;
  // Writes these fields into the run's file straight away.
  save(changes: Partial<AgentRun>): Promise<void>;
  // Waits for an AI call, writes it into steps[] (a failed one too) and
  // returns just the answer: job.ai(checkValue(...)). The entry is named
  // by the prompt's step.
  ai<T>(asking: Promise<StructuredResult<T>>): Promise<T>;
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
    // what the creator told the agent – remembered for the channel and
    // answered in this run – goes into every prompt as facts
    get workspace() {
      const facts = [...(workspace.facts ?? []), ...answeredFacts(job.run)];
      return facts.length ? { ...workspace, facts } : workspace;
    },

    async save(changes) {
      const moved = changes.status !== undefined && changes.status !== job.run.status;
      job.run = { ...job.run, ...changes, ...(moved ? { statusAt: Date.now() } : {}) };
      await saveRun(job.run);
    },

    async ai(asking) {
      try {
        const answer = await asking;
        const name = answer.prompt.step ?? "ai";
        await job.save({ steps: [...job.run.steps, logEntry(name, answer, { output: answer.data })] });
        return answer.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const log = error instanceof StructuredCallError ? error.log : undefined;
        const name = log?.prompt.step ?? "ai";
        await job.save({ steps: [...job.run.steps, logEntry(name, log, { error: message })] });
        throw error;
      }
    },
  };
  return job;
}
// One AI call as steps[] keeps it: what was sent, which model, how many
// tries, how long, what it cost – and the answer or the error.
function logEntry(name: string, log: CallLog | undefined, result: { output?: unknown; error?: string }) {
  return {
    name,
    startedAt: Date.now() - (log?.ms ?? 0),
    ...(log
      ? {
          ms: log.ms,
          model: log.model,
          attempts: log.attempts,
          prompt: log.prompt,
          inputTokens: log.usage.inputTokens,
          cachedInputTokens: log.usage.cachedInputTokens,
          outputTokens: log.usage.outputTokens,
          thinkingTokens: log.usage.thinkingTokens,
          ...(log.usage.turns ? { turns: log.usage.turns } : {}),
        }
      : {}),
    ...result,
  };
}

// What the creator answered in this run (the agent's questions), as facts.
export function answeredFacts(run: AgentRun): string[] {
  return (run.messages ?? []).flatMap((message) =>
    (message.questions ?? []).flatMap((q) =>
      q.answer ? [`${q.question} – ${q.answer}`] : [],
    ),
  );
}
