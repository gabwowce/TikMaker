import { z } from "zod";
import { customBackgroundSchema, sceneSchema } from "./scene";

// Reusable pieces the editor saves to its library, one db/ folder each.
// Shared by the server (validates every save) and the editor (types).

// db/scenes — a scene saved from "Your Scenes", ready to drop into any project
export const savedSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  scene: sceneSchema,
  savedAt: z.number(),
});
export type SavedScene = z.infer<typeof savedSceneSchema>;

// db/backgrounds — a custom background saved to reuse
export const savedBackgroundSchema = z.object({
  id: z.string(),
  name: z.string(),
  background: customBackgroundSchema,
  savedAt: z.number(),
});
export type SavedBackground = z.infer<typeof savedBackgroundSchema>;

// db/voice-variants — a trimmed cut of a generated voiceover
export const voiceVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sfxId: z.string(),
  startFrom: z.number().min(0).optional(),
  durationInFrames: z.number().min(1).optional(),
  volume: z.number().min(0).max(2).optional(),
  playbackRate: z.number().min(0.25).max(4).optional(),
  savedAt: z.number(),
});
export type VoiceVariant = z.infer<typeof voiceVariantSchema>;
