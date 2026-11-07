import type { AgentRun } from "../../src/agent/run/run.js";
import type { Workspace } from "../../src/agent/knowledge.js";
import { KNOWLEDGE_DIR } from "../config.js";
import { loadKnowledge, type Knowledge } from "./knowledge.js";
import { inStep } from "./models.js";
import {
  StructuredCallError,
  type CallLog,
  type StructuredResult,
} from "./llm.js";
import { updateRun } from "./runs.js";

// What every step (steps/*.ts) works with: the run, the knowledge base and the
// user's channel, plus two helpers that keep the run's file up to date, so the
// panel (asking agent.get) sees each change as it happens.
export type Job = {
  run: AgentRun;
  knowledge: Knowledge;
  workspace: Workspace;
  // Writes these fields into the run's file straight away.
  save(changes: Partial<AgentRun>): Promise<void>;
  // One question to the model, logged in steps[] with its time and tokens
  // (FR-21), a failed one too. Returns the answer.
  ai<T>(name: string, call: () => Promise<StructuredResult<T>>): Promise<T>;
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
      // The conversation is written from two places: the agent working here,
      // and the endpoints taking the user's message or answer while it works
      // (agent.message, agent.decide). Writing only the copy held here would
      // drop what they added meanwhile, so the messages on disk are merged
      // in first.
      job.run = await updateRun(job.run.id, (onDisk) => {
        const messages = mergeMessages(
          changes.messages ?? job.run.messages,
          onDisk?.messages,
        );
        return {
          ...job.run,
          ...changes,
          ...(messages ? { messages } : {}),
        };
      });
    },

    async ai(name, call) {
      const startedAt = Date.now();
      try {
        const result = await inStep(name, call);
        const step = {
          ...logged(name, startedAt, result),
          output: result.data,
        };
        await job.save({ steps: [...job.run.steps, step] });
        return result.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // A call that gave up still says what it sent and what it cost.
        const step =
          error instanceof StructuredCallError
            ? { ...logged(name, startedAt, error.log), error: message }
            : { name, startedAt, ms: Date.now() - startedAt, error: message };
        await job.save({ steps: [...job.run.steps, step] });
        throw error;
      }
    },
  };
  return job;
}
// One call as the run's log keeps it: the same fields whether it answered or
// gave up (FR-21).
function logged(name: string, startedAt: number, log: CallLog) {
  return {
    name,
    startedAt,
    ms: log.ms,
    model: log.model,
    attempts: log.attempts,
    prompt: log.prompt,
    inputTokens: log.usage.inputTokens,
    cachedInputTokens: log.usage.cachedInputTokens,
    outputTokens: log.usage.outputTokens,
    thinkingTokens: log.usage.thinkingTokens,
    ...(log.usage.turns ? { turns: log.usage.turns } : {}),
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

// The messages this job holds, with what was written to disk meanwhile: a
// message only on disk (the user's, sent while the agent worked) is kept, in
// time order; for a message in both, this job's copy wins – except a
// proposal answered on disk (the buttons) that this copy has not seen yet.
export function mergeMessages(
  mine: AgentRun["messages"],
  disk: AgentRun["messages"],
): AgentRun["messages"] {
  if (!disk?.length) return mine;
  if (!mine?.length) return disk;
  const byId = new Map(disk.map((message) => [message.id, message]));
  const merged = mine.map((message) => {
    const there = byId.get(message.id);
    if (there?.proposal?.decision && !message.proposal?.decision)
      return { ...message, proposal: there.proposal, status: there.status };
    return message;
  });
  const known = new Set(mine.map((message) => message.id));
  const added = disk.filter((message) => !known.has(message.id));
  return [...merged, ...added].sort((a, b) => a.at - b.at);
}
