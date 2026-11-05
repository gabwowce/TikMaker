import { z } from "zod";
import { highlightStyleSchema, richTextFontSchema } from "./capabilities";
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
  // Set when the agent built the video (D): the channel it was made for and
  // the knowledge-base VideoTemplate it followed. Absent for a hand-made video.
  workspaceId: z.string().optional(),
  videoTemplateId: z.string().optional(),
  fps: z.literal(30),
  width: z.literal(1080),
  height: z.literal(1920),
  storyPlan: z
    .object({
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
      // look (B7); every field unset = the original Tanker, white, pill look
      font: richTextFontSchema.optional(),
      size: z.number().min(24).max(200).optional(), // px
      color: z.string().optional(), // the words
      outline: z.boolean().optional(), // dark outline around the letters
      activeStyle: highlightStyleSchema.optional(), // how the spoken word stands out
      activeColor: z.string().optional(), // its box (pill) or text (color) colour
      // "pill" (default) – short chunks, the spoken word in a pill; "kinetic" –
      // longer phrases, every word pops in, key words bold (docs/motion-planas.md)
      style: z.enum(["pill", "kinetic"]).optional(),
      // words drawn bold in the kinetic style – the agent marks them
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
  music: z
    .object({
      sfxId: z.string(),
      volume: z.number().min(0).max(1).optional(),
      duckVolume: z.number().min(0).max(1).optional(),
      startFrom: z.number().min(0).optional(),
      fadeInFrames: z.number().int().min(0).optional(),
      fadeOutFrames: z.number().int().min(0).optional(),
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
