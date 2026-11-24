import type {
  ChatMessage,
  ChatTarget,
  AgentQuestion,
} from "../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../src/agent/run/run.js";
import type { RunStatus } from "../../src/agent/run/status.js";
import { newId } from "../ids.js";
import type { Job } from "./job.js";

// The conversation in run.messages: everything that writes a message is
// here. A user's message is accepted only while the agent waits
// (MESSAGE_STATUSES) and is taken up at once (agent.ts → talk); the agent's
// own messages are what it says, asks and proposes.

const message = (
  from: ChatMessage["from"],
  text: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage => ({ id: newId("msg"), at: Date.now(), from, text, ...extra });

// ── The user ───────────────────────────────────────────────────────────────

// A message from the user: saved as "waiting", taken up by agent.ts → talk.
export async function userWrites(
  job: Job,
  text: string,
  extra: Partial<ChatMessage> = {},
): Promise<void> {
  await job.save({
    messages: [
      ...(job.run.messages ?? []),
      message("user", text, { ...extra, status: "waiting" }),
    ],
  });
}

// The next piece of work: a user's message not taken up yet, or a proposal
// the user accepted. Oldest first.
export function nextWork(run: AgentRun): ChatMessage | undefined {
  return run.messages?.find(
    (m) =>
      m.status === "waiting" &&
      (m.from === "user" || m.proposal?.decision === "yes"),
  );
}

// ── The agent ──────────────────────────────────────────────────────────────

// `extra`: what else the message carries (a proposal, a review).
export async function agentSays(
  job: Job,
  text: string,
  extra: Partial<ChatMessage> = {},
): Promise<void> {
  await job.save({
    messages: [...(job.run.messages ?? []), message("agent", text, extra)],
  });
}

// The agent proposes changes (the router, the review): done only on "Do it".
export async function agentProposes(
  job: Job,
  text: string,
  targets: ChatTarget[],
  extra: Partial<ChatMessage> = {},
): Promise<void> {
  await agentSays(job, text, { ...extra, proposal: { targets } });
}

// The agent asks the creator (steps/ask.ts): the questions card. The run
// waits in "awaiting_answers"; askedIn – the status the step asked in.
export async function agentAsks(
  job: Job,
  askedBy: ChatMessage["askedBy"],
  questions: Omit<AgentQuestion, "id">[],
): Promise<void> {
  const text =
    questions.length === 1
      ? "One thing I need to know before I go on:"
      : `${questions.length} things I need to know before I go on:`;
  await job.save({
    messages: [
      ...(job.run.messages ?? []),
      message("agent", text, {
        askedBy,
        questions: questions.map((q, i) => ({ ...q, id: `${askedBy}-${i + 1}` })),
      }),
    ],
    status: "awaiting_answers",
    askedIn: job.run.status,
  });
}

// ── A message's work ───────────────────────────────────────────────────────

export async function updateMessage(
  job: Job,
  id: string,
  changes: Partial<ChatMessage>,
): Promise<void> {
  await job.save({
    messages: (job.run.messages ?? []).map((m) =>
      m.id === id ? { ...m, ...changes } : m,
    ),
  });
}

// The work is done: its message "done" and the agent's answer, in one write –
// the panel never sees the one without the other.
export async function finishWork(
  job: Job,
  id: string,
  targets: ChatTarget[],
  reply: string,
  notes: string[],
  status?: RunStatus,
): Promise<void> {
  await closeWork(job, id, { status: "done", targets }, ["✓ " + reply, ...notes].join(" "), {}, status);
}

// It failed: the message is marked, the run is not – the user can write again.
export async function failWork(
  job: Job,
  id: string,
  error: unknown,
  status?: RunStatus,
): Promise<void> {
  const text = error instanceof Error ? error.message : String(error);
  await closeWork(job, id, { status: "error", error: text }, `That didn't work: ${text}`, {}, status);
}

// The work's message changed and the agent's answer (with a proposal, when
// it proposes) added, in one write.
export async function closeWork(
  job: Job,
  id: string,
  changes: Partial<ChatMessage>,
  answer: string,
  extra: Partial<ChatMessage> = {},
  status?: RunStatus, // where the agent waits again – in the same write as the answer
): Promise<void> {
  await job.save({
    ...(status ? { status } : {}),
    messages: [
      ...(job.run.messages ?? []).map((m) =>
        m.id === id ? { ...m, ...changes } : m,
      ),
      message("agent", answer, extra),
    ],
  });
}
