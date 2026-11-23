import type { ChooseHookFromUser } from "../../src/agent/run/2-angle.js";
import {
  MESSAGE_STATUSES,
  type AnswerFromUser,
  type DecideFromUser,
  type SendMessageFromUser,
} from "../../src/agent/run/7-chat.js";
import type { RunStatus } from "../../src/agent/run/status.js";
import type { Job } from "./job.js";
import { agentSays, updateMessage, userWrites } from "./messages.js";
import { findTemplate } from "./steps/angle.js";
import { remember } from "./steps/ask.js";

// What each button of the agent's panel writes into the run.

export type UserAnswer =
  | { kind: "template"; videoTemplateId: string }
  | { kind: "hook"; choice: ChooseHookFromUser }
  | { kind: "approve" }
  | { kind: "answers"; input: AnswerFromUser }
  | { kind: "continue" }
  | { kind: "message"; input: SendMessageFromUser }
  | { kind: "decision"; input: DecideFromUser };

// Each button works only while the agent waits for it; while the agent
// works, the panel's buttons and its message box are locked.
const ACCEPTED_IN: Record<UserAnswer["kind"], RunStatus[]> = {
  template: ["awaiting_hook"],
  hook: ["awaiting_hook"],
  approve: ["awaiting_approval"],
  answers: ["awaiting_answers"],
  continue: ["paused"],
  message: MESSAGE_STATUSES,
  decision: ["awaiting_hook", "awaiting_approval", "done"],
};

export async function saveAnswer(job: Job, answer: UserAnswer): Promise<void> {
  const { status } = job.run;
  if (!ACCEPTED_IN[answer.kind].includes(status))
    throw new Error(`Not now: the run is "${status}"`);

  switch (answer.kind) {
    case "template":
      findTemplate(job, answer.videoTemplateId);
      return job.save({
        template: { videoTemplateId: answer.videoTemplateId, pickedBy: "user" },
      });

    case "hook":
      return saveHook(job, answer.choice);

    case "approve":
      if (!job.run.script) throw new Error("There is no script to approve");
      return job.save({ script: { ...job.run.script, approved: true } });

    case "answers":
      return saveQuestionAnswers(job, answer.input.messageId, answer.input.answers);

    case "continue":
      return job.save({
        status: job.run.pausedFrom ?? "created",
        pausedFrom: undefined,
        error: undefined,
      });

    case "message":
      if (status === "awaiting_answers") return answerOpenQuestions(job, answer.input.text);
      return userWrites(
        job,
        answer.input.text,
        answer.input.attachments?.length ? { attachments: answer.input.attachments } : {},
      );

    case "decision":
      return saveDecision(job, answer.input);
  }
}

async function saveHook(job: Job, choice: ChooseHookFromUser): Promise<void> {
  if ("text" in choice) return job.save({ hook: { text: choice.text, pickedBy: "user" } });
  const picked = job.run.hooks?.[choice.hookIndex];
  if (!picked) throw new Error(`There is no hook number ${choice.hookIndex + 1}`);
  await job.save({
    hook: {
      text: picked.text,
      formulaId: picked.formulaId,
      firstFrame: picked.firstFrame,
      pickedBy: "agent",
    },
  });
}

// The answers go into the agent's question message; "remember" ones into the
// channel's knowledge; the run goes back to the status the step asked in.
async function saveQuestionAnswers(
  job: Job,
  messageId: string,
  given: AnswerFromUser["answers"],
): Promise<void> {
  const asked = job.run.messages?.find((m) => m.id === messageId && m.questions);
  if (!asked?.questions) throw new Error("There are no such questions");
  const byId = new Map(given.map((a) => [a.id, a]));
  const questions = asked.questions.map((question) => {
    const a = byId.get(question.id);
    const text = a?.answer?.trim();
    if (!a || !text || a.skipped) return { ...question, skipped: true };
    return { ...question, answer: text, ...(a.remember ? { remember: true } : {}) };
  });
  await remember(
    job.run.input.workspaceId,
    questions.flatMap((q) => (q.remember ? [`${q.question} – ${q.answer}`] : [])),
  );
  await job.save({
    messages: (job.run.messages ?? []).map((m) => (m.id === asked.id ? { ...m, questions } : m)),
    status: job.run.pausedFrom ?? "created",
    pausedFrom: undefined,
  });
}

// A message typed while the agent waits for answers answers every open question.
async function answerOpenQuestions(job: Job, text: string): Promise<void> {
  const asked = [...(job.run.messages ?? [])]
    .reverse()
    .find((m) => m.questions?.some((q) => !q.answer && !q.skipped));
  if (!asked?.questions) throw new Error("There are no open questions");
  await saveQuestionAnswers(job, asked.id, asked.questions.map((q) => ({ id: q.id, answer: text })));
}

async function saveDecision(job: Job, { messageId, accept }: DecideFromUser): Promise<void> {
  const proposed = job.run.messages?.find((m) => m.id === messageId && m.proposal);
  if (!proposed?.proposal) throw new Error("There is no such proposal");
  if (proposed.proposal.decision) throw new Error("This proposal has been answered already");
  await updateMessage(job, messageId, {
    proposal: { ...proposed.proposal, decision: accept ? "yes" : "no" },
    ...(accept ? { status: "waiting" as const } : {}),
  });
  if (!accept) await agentSays(job, "OK, I left it as it is.");
}
