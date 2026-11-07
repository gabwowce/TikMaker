import { z } from "zod";
import { sceneBlocksFromAi } from "./4-blocks";

// 6 Changing one scene's pictures (docs/scenos-taisymas-kodas.md): asked for
// with a message in the conversation (7-chat.ts) that is about one scene. The
// model answers that scene again – the same shape as one scene of the blocks
// step – and what it wanted but the library lacks.
export const sceneEditFromAi = sceneBlocksFromAi.extend({
  wishes: z.array(z.string().trim().min(3)).max(10),
});

export type SceneEditFromAi = z.infer<typeof sceneEditFromAi>;
