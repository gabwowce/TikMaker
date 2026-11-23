import fs from "node:fs/promises";
import path from "node:path";
import type { Asking, AskingStep } from "../../../src/agent/run/asking.js";
import type { AgentRun } from "../../../src/agent/run/run.js";
import { KNOWLEDGE_DIR } from "../../config.js";
import type { Job } from "../job.js";
import { agentAsks, agentSays } from "../messages.js";

// The agent asks (docs/pokalbis-planas.md, 3.2). A step that decides what
// the video says – the template, the script – may answer with
// questions instead of guessing a fact. Then:
//
// 1. askIfNeeded: the questions become the agent's message, the run waits in
//    "awaiting_answers" (pausedFrom – the step asking) and the step's answer
//    is NOT saved: it is made again with the answers.
// 2. The questions card (answers.ts): the answers go
//    into the message, the ones marked "remember" into the channel's
//    knowledge (remember, below), and the run goes back to the status the
//    step asked in (pausedFrom) – agent.ts runs that stage again.
// 3. job.ts gives every later prompt the answers as facts from the creator.
//
// A step asks once per run: asked again, it decides and says what it assumed.

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
    await agentAsks(job, step, questions);
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
};

// The fields the steps' schemas carry for asking, taken off before the
// answer is saved in the run.
export function withoutAsking<T extends Asking>(
  answer: T,
): Omit<T, "questions" | "assumptions"> {
  const { questions: _q, assumptions: _a, ...rest } = answer;
  return rest;
}

// "Remember": into knowledge/workspaces/<id>/workspace.json (facts), so it is
// in git and in every later video's prompts.
export async function remember(workspaceId: string, facts: string[]): Promise<void> {
  if (!facts.length) return;
  const file = path.join(KNOWLEDGE_DIR, "workspaces", workspaceId, "workspace.json");
  const workspace = JSON.parse(await fs.readFile(file, "utf-8"));
  const known: string[] = workspace.facts ?? [];
  workspace.facts = [...known, ...facts.filter((fact) => !known.includes(fact))];
  await fs.writeFile(file, JSON.stringify(workspace, null, 2) + "\n", "utf-8");
}
