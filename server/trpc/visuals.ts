import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { videoProjectSchema } from "../../src/schema/project.js";
import { parseProject } from "../../src/utils/normalizeProject.js";
import { deleteVisual, listVisuals, saveVisual } from "../agent/visuals.js";
import { procedure, router } from "./init.js";

// "Mano vizualai": the channel's saved code scenes (server/agent/visuals.ts).
// The frame is a file: GET /api/visuals/<workspace>/<id>/frame.png (app.ts).
export const visualsRouter = router({
  list: procedure
    .input(z.string().min(1))
    .query(({ input: workspaceId }) => listVisuals(workspaceId)),

  // "Save as my visual" on a code scene: the project as the editor has it
  // (the creator's fields included) and which scene.
  save: procedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        project: videoProjectSchema,
        sceneId: z.string().min(1),
        title: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Remotion is loaded only when a frame is made
      const { renderFrame } = await import("../agent/stills.js");
      try {
        return await saveVisual(
          { ...input, project: parseProject(input.project) },
          renderFrame,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  remove: procedure
    .input(z.object({ workspaceId: z.string().min(1), id: z.string().min(1) }))
    .mutation(({ input }) => deleteVisual(input.workspaceId, input.id)),
});
