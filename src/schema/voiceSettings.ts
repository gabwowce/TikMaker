import { z } from "zod";

// db/voice-settings.json — everything about HOW voiceovers are generated, in
// one place. Only the API key stays in .env.local, because it is a secret and
// this file is committed. Every field has a default, so parsing {} gives a
// complete, working set of settings.
export const voiceSettingsSchema = z
  .object({
    voiceId: z.string().min(1).default("qSeXEcewz7tA0Q0qk9fH"),
    modelId: z.string().min(1).default("eleven_multilingual_v2"),
    speed: z.number().min(0.7).max(1.2).default(1.15),
    stability: z.number().min(0).max(1).default(1),
    similarityBoost: z.number().min(0).max(1).default(1),
    style: z.number().min(0).max(1).default(1),
    speakerBoost: z.boolean().default(true),
  })
  .strict();

export type VoiceSettings = z.infer<typeof voiceSettingsSchema>;
