import { z } from "zod";
import { sceneSchema } from "./scene";

export const videoProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  fps: z.literal(30),
  width: z.literal(1080),
  height: z.literal(1920),
  scenes: z.array(sceneSchema),
  /** Project-level audio clips live on the global timeline and are not clipped
   * by scene boundaries. `sfxId` resolves through the shared SFX registry. */
  audioClips: z.array(z.object({
    id: z.string(),
    sfxId: z.string(),
    from: z.number().min(0),
    /** Source offset and visible timeline length, both in project frames. */
    startFrom: z.number().min(0).optional(),
    durationInFrames: z.number().min(1).optional(),
    lane: z.number().int().min(0).max(24).optional(),
    volume: z.number().min(0).max(2).optional(),
  })).optional(),
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
    audioClips: [],
  };
}
