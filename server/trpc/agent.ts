import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { agentRunStartSchema } from "../../src/agent/agentRun.js";
import { continueRun } from "../agent/agent.js";
import { getRun, listRuns } from "../agent/runs.js";
import { step1Idea } from "../agent/steps/1-idea.js";
import { procedure, router } from "./init.js";

// The agent as the editor sees it: start a run, then keep asking how it is
// going. The same start → poll pattern as renders.ts; the run itself lives in
// db/agent-runs/<id>.json (server/agent/runs.ts).
export const agentRouter = router({
  start: procedure.input(agentRunStartSchema).mutation(async ({ input }) => {
    const run = await step1Idea(input.projectId, input.input);
    continueRun(run); // the agent works in the background; the panel polls get
    return { id: run.id };
  }),

  get: procedure.input(z.string()).query(async ({ input: id }) => {
    const run = await getRun(id);
    if (!run)
      throw new TRPCError({ code: "NOT_FOUND", message: "Unknown agent run" });
    return run;
  }),

  list: procedure
    .input(z.string())
    .query(({ input: projectId }) => listRuns(projectId)),
});
