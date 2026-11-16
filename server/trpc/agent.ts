import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { startFromUser } from "../../src/agent/run/1-idea.js";
import {
  changeTemplateFromUser,
  chooseHookFromUser,
} from "../../src/agent/run/2-angle.js";
import { approveScriptFromUser } from "../../src/agent/run/3-script.js";
import {
  answerFromUser,
  decideFromUser,
  sendMessageFromUser,
} from "../../src/agent/run/7-chat.js";
import { continueRun, resumeRun } from "../agent/agent.js";
import { undoCodeScene } from "../agent/steps/5-pictures.js";
import { openJob } from "../agent/job.js";
import { loadKnowledge } from "../agent/knowledge.js";
import { getRun, listRuns } from "../agent/runs.js";
import { step1Idea } from "../agent/steps/1-idea.js";
import {
  step2ChangeTemplate,
  step2ChooseHook,
} from "../agent/steps/2-angle.js";
import { step3Approve } from "../agent/steps/3-script.js";
import { step7Decide, step7Message } from "../agent/steps/7-chat.js";
import { answerFromMessage, answerQuestions } from "../agent/tools/ask.js";
import { KNOWLEDGE_DIR } from "../config.js";
import { procedure, router } from "./init.js";

// The agent as the editor sees it: start a run, then keep asking how it is
// going. The same start → poll pattern as renders.ts; the run itself lives in
// db/agent-runs/<id>.json (server/agent/runs.ts). Every answer the user gives
// is saved by its step and then hands the run back to the agent (continueRun).
export const agentRouter = router({
  start: procedure.input(startFromUser).mutation(async ({ input }) => {
    const run = await step1Idea(input.projectId, input.input);
    continueRun(run); // the agent works in the background; the panel polls get
    return { id: run.id };
  }),

  get: procedure.input(z.string()).query(({ input: id }) => findRun(id)),

  list: procedure
    .input(z.string())
    .query(({ input: projectId }) => listRuns(projectId)),

  // Every template the user can pick: in the form and behind "Change".
  templates: procedure.query(async () => {
    const { knowledge } = await loadKnowledge(KNOWLEDGE_DIR);
    return knowledge.videoTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      oneLine: t.oneLine,
    }));
  }),
  // Screen 2: the card shows the agent's pick; the user swaps it for another
  // one from the list. The agent then writes new hooks.
  changeTemplate: procedure
    .input(changeTemplateFromUser)
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      await asBadRequest(() => step2ChangeTemplate(run, input.videoTemplateId));
      continueRun(await findRun(run.id));
    }),

  // Screen 2: the user picks one of the three hooks, or writes their own
  // The agent then goes on to the script.
  chooseHook: procedure
    .input(chooseHookFromUser)
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      await asBadRequest(() => step2ChooseHook(run, input));
      continueRun(await findRun(run.id));
    }),

  // Screen 3: "Approve" – the agent goes on to building the video.
  approveScript: procedure
    .input(approveScriptFromUser)
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      await asBadRequest(() => step3Approve(run));
      continueRun(await findRun(run.id));
    }),

  // The conversation: a message at any time. It waits until the agent stops
  // where it can take it up, then the agent works on it and answers.
  message: procedure.input(sendMessageFromUser).mutation(async ({ input }) => {
    const run = await findRun(input.runId);
    try {
      // while the agent waits for answers, a typed message is the answer
      if (run.status === "awaiting_answers")
        await asBadRequest(() => answerFromMessage(run, input.text));
      else await asBadRequest(() => step7Message(run, input));
    } finally {
      // even when the message is refused: after a server restart nothing is
      // working on the ones already waiting, and this wakes the agent up for
      // them (continueRun never starts a second worker)
      continueRun(await findRun(run.id));
    }
  }),

  // The answers to the agent's questions (the questions card): the asking
  // step runs again with them.
  answer: procedure.input(answerFromUser).mutation(async ({ input }) => {
    const run = await findRun(input.runId);
    await asBadRequest(() => answerQuestions(run, input));
    continueRun(await findRun(run.id));
  }),
  // "Continue" on a run paused at the model's usage limit.
  resume: procedure
    .input(z.object({ runId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await resumeRun(await findRun(input.runId));
    }),
  // Undo on a code scene: its code goes back to the version before the
  // agent's last change (server/agent/codeVersions.ts). Returns the run.
  undoScene: procedure
    .input(z.object({ runId: z.string().min(1), sceneIndex: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      if (!["done", "error", "paused"].includes(run.status))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The agent is working on the video – undo when it stops",
        });
      const job = await openJob(run);
      await asBadRequest(() => undoCodeScene(job, input.sceneIndex));
      return findRun(run.id);
    }),
  // The answer to the agent's proposal – the "Do it" / "No" buttons.
  decide: procedure.input(decideFromUser).mutation(async ({ input }) => {
    const run = await findRun(input.runId);
    await asBadRequest(() => step7Decide(run, input));
    continueRun(await findRun(run.id));
  }),
});

async function findRun(id: string) {
  const run = await getRun(id);
  if (!run)
    throw new TRPCError({ code: "NOT_FOUND", message: "Unknown agent run" });
  return run;
}

// A step that refuses (too late, no such template or hook) means the request
// was wrong, not the server.
async function asBadRequest(step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }
}
