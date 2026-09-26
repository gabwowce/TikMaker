import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { videoProjectSchema } from "../../src/schema/project.js";
import { getRenderJob, startRender } from "../renderJobs.js";
import { procedure, router } from "./init.js";

// The MP4 itself is downloaded from a plain Express route
// (GET /api/renders/:id/file in app.ts) — tRPC answers with JSON, not files.
export const rendersRouter = router({
  start: procedure
    .input(
      z.object({
        project: videoProjectSchema.refine((p) => p.scenes.length > 0, {
          message: "Project has no scenes",
        }),
      }),
    )
    .mutation(({ input }) => ({ id: startRender(input.project).id })),

  get: procedure.input(z.string()).query(({ input: id }) => {
    const job = getRenderJob(id);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown render job" });
    return job;
  }),
});
