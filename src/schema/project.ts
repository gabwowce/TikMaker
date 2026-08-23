import { z } from "zod";
import { sceneSchema } from "./scene";

export const videoProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  fps: z.literal(30),
  width: z.literal(1080),
  height: z.literal(1920),
  scenes: z.array(sceneSchema),
});

export type VideoProject = z.infer<typeof videoProjectSchema>;

export function createEmptyProject(id: string, title: string): VideoProject {
  return {
    id,
    title,
    fps: 30,
    width: 1080,
    height: 1920,
    scenes: [],
  };
}
