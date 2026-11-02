import { z } from "zod";

// 4 Building — how each scene looks. The model only CHOOSES: which layout
// example (knowledge/shared/layout-examples) a scene follows, and what goes
// into the example's pictures. Where things go and how big they are is
// worked out by code (compileProject), never by the model.

// ── From the model ───────────────────────────────────────────────────────

// One scene: the example it follows, and one fill per picture of that
// example, in the example's order. For a logo or a prop the fill is a file
// from the library, by its id (FR-24); for anything else (a recording, a
// screenshot) it says what the user should put there.
export const sceneLayoutFromAi = z.object({
  layoutExampleId: z.string().min(1),
  fills: z.array(z.string().trim().min(1)),
});

// The whole video: one entry per scene of the script, in the same order.
export const layoutFromAi = z.object({
  scenes: z.array(sceneLayoutFromAi).min(1),
});

// ── In the run's file ────────────────────────────────────────────────────

// Kept as the model sent it, once the code has checked it.
export const layoutInRun = layoutFromAi;

export type SceneLayoutFromAi = z.infer<typeof sceneLayoutFromAi>;
export type LayoutFromAi = z.infer<typeof layoutFromAi>;
export type LayoutInRun = z.infer<typeof layoutInRun>;
