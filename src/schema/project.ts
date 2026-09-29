import { z } from "zod";
import { sceneSchema } from "./scene";
// One spoken word and when it is said, in seconds of the SOURCE audio file
// (before the clip's startFrom/playbackRate). Written by voice.generate from
// ElevenLabs' alignment; captions are derived from it at render time.
export const captionWordSchema = z.object({
  text: z.string(),
  start: z.number().min(0),
  end: z.number().min(0),
});
export type CaptionWord = z.infer<typeof captionWordSchema>;
export const videoProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  collection: z.string().optional(),
  fps: z.literal(30),
  width: z.literal(1080),
  height: z.literal(1920),
  storyPlan: z
    .object({
      targetDuration: z.number().positive().max(600).optional(),
      premise: z.string().optional(),
      audience: z.string().optional(),
    })
    .optional(),
  storyboardId: z.string().optional(),
  scenes: z.array(sceneSchema),
  // Captions are drawn from every audio clip that carries `words`. Unset =
  // on, at the default height; `enabled: false` hides them for the video.
  captions: z
    .object({
      enabled: z.boolean().optional(),
      y: z.number().min(0).max(100).optional(),
    })
    .optional(),
  savedAt: z.number().optional(),
  audioClips: z
    .array(
      z.object({
        id: z.string(),
        sfxId: z.string(),
        from: z.number().min(0),
        startFrom: z.number().min(0).optional(),
        durationInFrames: z.number().min(1).optional(),
        lane: z.number().int().min(0).max(24).optional(),
        volume: z.number().min(0).max(2).optional(),
        voiceText: z.string().optional(),
        words: z.array(captionWordSchema).optional(),
        playbackRate: z.number().min(0.25).max(4).optional(),
      }),
    )
    .optional(),
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
    savedAt: Date.now(),
  };
}
