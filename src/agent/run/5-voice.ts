import { z } from "zod";
import { captionWordSchema } from "../../schema/project";

// 5 Result: one voiceover per scene, made by the code (ElevenLabs), not by the
// AI. `words` – when each word is spoken, in seconds from the clip's start;
// the editor puts each clip under its scene and the blocks onto these words.
export const sceneVoice = z.object({
  sfxId: z.string(), // the clip in the sound manifest (group "voice")
  words: z.array(captionWordSchema),
});

export type SceneVoice = z.infer<typeof sceneVoice>;

export const voiceInRun = z.object({ scenes: z.array(sceneVoice) });

export type VoiceInRun = z.infer<typeof voiceInRun>;
