import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  agentRunStartSchema,
  changeTemplateInputSchema,
} from "../../src/agent/agentRun.js";
import { continueRun } from "../agent/agent.js";
import { loadKnowledge } from "../agent/knowledge.js";
import { getRun, listRuns } from "../agent/runs.js";
import { step1Idea } from "../agent/steps/1-idea.js";
import { step2ChangeTemplate } from "../agent/steps/2-angle.js";
import { KNOWLEDGE_DIR } from "../config.js";
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

  // Every template the user can pick: in the form and behind "Change".
  templates: procedure.query(async () => {
    const { knowledge } = await loadKnowledge(KNOWLEDGE_DIR);
    return knowledge.videoTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      oneLine: t.oneLine,
    }));
  }),

  // Screen 2: the user goes on with another template (FR-04).
  changeTemplate: procedure
    .input(changeTemplateInputSchema)
    .mutation(async ({ input }) => {
      const run = await getRun(input.runId);
      if (!run)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unknown agent run",
        });
      try {
        await step2ChangeTemplate(run, input.videoTemplateId);
      } catch (error) {
        // Too late, or no such template: the request was wrong, not the server.
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
});
