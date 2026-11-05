import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { voiceSettingsSchema } from "../../src/schema/voiceSettings.js";
import { generateVoice, VOICE_SETTINGS, VoiceError } from "../voice.js";
import { procedure, router } from "./init.js";
import { jsonFileRouter } from "./jsonFile.js";

export const voiceRouter = router({
  // Is the ElevenLabs key set up? Read at call time, not import time, so
  // editing .env.local + restarting is all it takes.
  status: procedure.query(() => ({
    configured: Boolean(process.env.ELEVENLABS_API_KEY),
  })),

  // voice.settings.get / voice.settings.save — db/voice-settings.json
  settings: jsonFileRouter(VOICE_SETTINGS, voiceSettingsSchema),

  // Text → mp3 + the time each word is spoken (for captions); the work is in
  // server/voice.ts, shared with the agent's voice step.
  generate: procedure
    .input(
      voiceSettingsSchema.partial().extend({
        text: z.string().trim().min(1, "No text to generate voiceover from."),
        label: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { text, label, ...overrides } = input;
      try {
        return await generateVoice(text, label, overrides);
      } catch (error) {
        if (!(error instanceof VoiceError)) throw error;
        throw new TRPCError({
          code:
            error.reason === "no-key" ? "SERVICE_UNAVAILABLE" : "BAD_GATEWAY",
          message: error.message,
        });
      }
    }),
});
