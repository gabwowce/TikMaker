import fs from "node:fs/promises";
import path from "node:path";
import type { Asking, AskingStep } from "../../../src/agent/run/asking.js";
import type {
  AnswerFromUser,
  ChatMessage,
} from "../../../src/agent/run/7-chat.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import { KNOWLEDGE_DIR } from "../../config.js";
import { openJob, type Job } from "../job.js";
import { agentSays } from "./7-chat.js";

// 3 The agent asks (docs/pokalbis-planas.md, 3.2). A step that decides what
// the video says – the template, the script, the blocks – may answer with
// questions instead of guessing a fact. Then:
//
// 1. askIfNeeded: the questions become the agent's message, the run waits in
//    "awaiting_answers" (pausedFrom – the step asking) and the step's answer
//    is NOT saved: it is made again with the answers.
// 2. step3Answer (the questions card): the answers go into the message, the
//    ones marked "remember" into the channel's knowledge, and the run goes
//    back to the status the step asked in (pausedFrom) – agent.ts runs that
//    stage again.
// 3. job.ts gives every later prompt the answers as facts from the creator.
//
// A step asks once per run: asked again, it decides and says what it assumed.

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Did this step ask already in this run?
export function askedBefore(run: AgentRun, step: AskingStep): boolean {
  return (run.messages ?? []).some((message) => message.askedBy === step);
}

// After a step's answer: true when the agent stopped to ask (the caller then
// saves nothing and returns); false – go on. Assumptions made instead of
// asking are said in the conversation, so the creator sees what was guessed.
export async function askIfNeeded(
  job: Job,
  step: AskingStep,
  answer: Asking,
): Promise<boolean> {
  const questions = answer.questions ?? [];
  if (questions.length && !askedBefore(job.run, step)) {
    const message: ChatMessage = {
      id: newId("msg"),
      at: Date.now(),
      from: "agent",
      text:
        questions.length === 1
          ? "One thing I need to know before I go on:"
          : `${questions.length} things I need to know before I go on:`,
      questions: questions.map((question, i) => ({
        ...question,
        id: `${step}-${i + 1}`,
      })),
      askedBy: step,
    };
    await job.save({
      messages: [...(job.run.messages ?? []), message],
      status: "awaiting_answers",
      pausedFrom: job.run.status,
    });
    return true;
  }
  if (answer.assumptions?.length)
    await agentSays(
      job,
      `What I assumed (${stepName[step]}): ${answer.assumptions.join(" · ")}`,
    );
  return false;
}

const stepName: Record<AskingStep, string> = {
  checkValue: "the idea's value",
  pickTemplate: "template",
  writeScript: "script",
  pickBlocks: "pictures",
};

// The fields the steps' schemas carry for asking, taken off before the
// answer is saved in the run.
export function withoutAsking<T extends Asking>(
  answer: T,
): Omit<T, "questions" | "assumptions"> {
  const { questions: _q, assumptions: _a, ...rest } = answer;
  return rest;
}

// The questions card: the answers saved, "remember" ones written into the
// channel's knowledge, and the run goes on from where the asking step starts.
export async function step3Answer(
  run: AgentRun,
  input: AnswerFromUser,
): Promise<void> {
  if (run.status !== "awaiting_answers")
    throw new Error(`The agent is not waiting for answers (${run.status})`);
  const asked = run.messages?.find(
    (message) => message.id === input.messageId && message.questions,
  );
  if (!asked?.questions) throw new Error("There are no such questions");
  const answers = new Map(input.answers.map((a) => [a.id, a]));
  const questions = asked.questions.map((question) => {
    const given = answers.get(question.id);
    if (!given) return { ...question, skipped: true };
    const answer = given.answer?.trim();
    return {
      ...question,
      ...(answer && !given.skipped ? { answer } : { skipped: true }),
      ...(given.remember && answer ? { remember: true } : {}),
    };
  });
  await remember(
    run.input.workspaceId,
    questions.flatMap((q) =>
      q.remember && q.answer ? [`${q.question} – ${q.answer}`] : [],
    ),
  );
  const job = await openJob(run);
  await job.save({
    messages: (job.run.messages ?? []).map((message) =>
      message.id === asked.id ? { ...message, questions } : message,
    ),
    status: run.pausedFrom ?? "created",
    pausedFrom: undefined,
  });
}

// A typed message while the agent waits for answers: it answers every
// question not answered yet.
export async function answerFromMessage(
  run: AgentRun,
  text: string,
): Promise<void> {
  const asked = [...(run.messages ?? [])]
    .reverse()
    .find((message) => message.questions?.some((q) => !q.answer && !q.skipped));
  if (!asked?.questions) throw new Error("There are no open questions");
  await step3Answer(run, {
    runId: run.id,
    messageId: asked.id,
    answers: asked.questions.map((q) => ({ id: q.id, answer: text })),
  });
}

// "Remember": into knowledge/workspaces/<id>/workspace.json (facts), so it is
// in git and in every later video's prompts.
async function remember(workspaceId: string, facts: string[]): Promise<void> {
  if (!facts.length) return;
  const file = path.join(KNOWLEDGE_DIR, "workspaces", workspaceId, "workspace.json");
  const workspace = JSON.parse(await fs.readFile(file, "utf-8"));
  const known: string[] = workspace.facts ?? [];
  workspace.facts = [...known, ...facts.filter((fact) => !known.includes(fact))];
  await fs.writeFile(file, JSON.stringify(workspace, null, 2) + "\n", "utf-8");
}
