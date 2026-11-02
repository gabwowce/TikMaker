import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { startFromUser } from "../../src/agent/run/1-idea.js";
import {
  changeTemplateFromUser,
  chooseHookFromUser,
} from "../../src/agent/run/2-angle.js";
import {
  approveScriptFromUser,
  reviseScriptFromUser,
} from "../../src/agent/run/3-script.js";
import { continueRun } from "../agent/agent.js";
import { loadKnowledge } from "../agent/knowledge.js";
import { getRun, listRuns } from "../agent/runs.js";
import { step1Idea } from "../agent/steps/1-idea.js";
import {
  step2ChangeTemplate,
  step2ChooseHook,
} from "../agent/steps/2-angle.js";
import {
  step3Approve,
  step3Revise,
} from "../agent/steps/3-script.js";
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

  // Screen 3: a comment – the agent writes the script again with it.
  reviseScript: procedure
    .input(reviseScriptFromUser)
    .mutation(async ({ input }) => {
      const run = await findRun(input.runId);
      await asBadRequest(() => step3Revise(run, input.comment));
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
