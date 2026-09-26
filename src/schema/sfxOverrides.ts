import { z } from "zod";
import { entrancePresetSchema, exitPresetSchema } from "./scene";

// Which sound plays when an animation happens, e.g. { slideUp: "d-word" }.
// The KEYS are the real animation names from scene.ts, so renaming a preset
// there makes a stale key in db/sfx-overrides.json a validation error instead
// of a sound that silently stops playing. Values are sfx ids, or "none".
const soundsByAnimationSchema = z
  .object({
    entrance: z.record(entrancePresetSchema, z.string()).optional(),
    exit: z.record(exitPresetSchema, z.string()).optional(),
  })
  .strict();

// db/sfx-overrides.json. Shared by the server (validates every PUT) and the
// editor + Remotion render (sfxDefaults.ts parses the file with it).
export const sfxOverridesSchema = z
  .object({
    content: soundsByAnimationSchema.optional(), // headlines and other text
    visual: soundsByAnimationSchema.optional(), // visual layers
  })
  .strict();

export type SfxOverrides = z.infer<typeof sfxOverridesSchema>;
