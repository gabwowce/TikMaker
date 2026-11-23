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
import * as agent from "../agent/agent.js";
import { loadKnowledge } from "../agent/knowledge.js";
import { getRun, listRuns } from "../agent/runs.js";
import { KNOWLEDGE_DIR } from "../config.js";
import { procedure, router } from "./init.js";

// The agent as the editor sees it: start a run, then keep asking how it is
// going. The same start → poll pattern as renders.ts; the run itself lives in
// db/agent-runs/<id>.json (server/agent/runs.ts). Every button is one of the
// user's actions in server/agent/agent.ts (part 1) – this file only finds the
// run and turns a refusal into a bad request.
export const agentRouter = router({
  start: procedure.input(startFromUser).mutation(async ({ input }) => {
    const run = await agent.start(input.projectId, input.input);
    return { id: run.id }; // the agent works in the background; the panel polls get
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
      await asBadRequest(() => agent.changeTemplate(run, input.videoTemplateId));
    }),

  // Screen 2: the user picks one of the three hooks, or writes their own
  // The agent then goes on to the script.
  chooseHook: procedure
    .input(chooseHookFromUser)
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      await asBadRequest(() => agent.chooseHook(run, input));
    }),

  // Screen 3: "Approve" – the agent goes on to building the video.
  approveScript: procedure
    .input(approveScriptFromUser)
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      await asBadRequest(() => agent.approveScript(run));
    }),

  // The conversation: a message at any time. It waits until the agent stops
  // where it can take it up, then the agent works on it and answers.
  message: procedure.input(sendMessageFromUser).mutation(async ({ input }) => {
    const run = await findRun(input.runId);
    await asBadRequest(() => agent.sendMessage(run, input));
  }),

  // The answers to the agent's questions (the questions card): the asking
  // step runs again with them.
  answer: procedure.input(answerFromUser).mutation(async ({ input }) => {
    const run = await findRun(input.runId);
    await asBadRequest(() => agent.answerQuestions(run, input));
  }),
  // "Continue" on a run paused at the model's usage limit.
  resume: procedure
    .input(z.object({ runId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await agent.resumeRun(await findRun(input.runId));
    }),
  // Undo on a code scene: its code goes back to the version before the
  // agent's last change (server/agent/codeVersions.ts). Returns the run.
  undoScene: procedure
    .input(z.object({ runId: z.string().min(1), sceneIndex: z.number().int().min(0) }))
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      await asBadRequest(() => agent.undoScene(run, input.sceneIndex));
      return findRun(run.id);
    }),
  // The answer to the agent's proposal – the "Do it" / "No" buttons.
  decide: procedure.input(decideFromUser).mutation(async ({ input }) => {
    const run = await findRun(input.runId);
    await asBadRequest(() => agent.decide(run, input));
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
