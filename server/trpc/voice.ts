import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { voiceSettingsSchema } from "../../src/schema/voiceSettings.js";
import {
  alignmentToWords,
  type CharacterAlignment,
} from "../../src/utils/captionWords.js";
import { readJson, slugify, writeJson } from "../db.js";
import { savePublicFile } from "../uploads.js";
import { procedure, router } from "./init.js";
import { jsonFileRouter } from "./jsonFile.js";
import { readSfxManifest, SFX_MANIFEST, type CustomSfx } from "./sfx.js";

const VOICE_SETTINGS = "voice-settings.json";
const OUTPUT_FORMAT = "mp3_44100_128";
const FOLDER = "assets/voice";

export const voiceRouter = router({
  // Is the ElevenLabs key set up? Read at call time, not import time, so
  // editing .env.local + restarting is all it takes.
  status: procedure.query(() => ({
    configured: Boolean(process.env.ELEVENLABS_API_KEY),
  })),

  // voice.settings.get / voice.settings.save — db/voice-settings.json
  settings: jsonFileRouter(VOICE_SETTINGS, voiceSettingsSchema),

  // Text → mp3 + the time each word is spoken (for captions). Any setting
  // sent here overrides the saved one for THIS clip. The /with-timestamps
  // endpoint returns the audio base64-encoded inside JSON, next to a
  // per-character alignment; the words are not saved in the manifest but
  // returned for the editor to store on the project's audio clip, where the
  // render can read them.
  generate: procedure
    .input(
      voiceSettingsSchema.partial().extend({
        text: z.string().trim().min(1, "No text to generate voiceover from."),
        label: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "ELEVENLABS_API_KEY is missing. Add it to .env.local and restart.",
        });
      }

      const { text, label, ...overrides } = input;
      const saved = voiceSettingsSchema.parse(await readJson(VOICE_SETTINGS, {}));
      const settings = { ...saved, ...overrides };

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}/with-timestamps?output_format=${OUTPUT_FORMAT}`,
        {
          method: "POST",
          headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            model_id: settings.modelId,
            voice_settings: {
              stability: settings.stability,
              similarity_boost: settings.similarityBoost,
              style: settings.style,
              use_speaker_boost: settings.speakerBoost,
              speed: settings.speed,
            },
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `ElevenLabs ${response.status}: ${detail.slice(0, 400)}`,
        });
      }

      const name = label?.trim() || text.slice(0, 40);
      const id = `vo-${slugify(name)}-${Date.now().toString(36)}`;
      const file = `${id}.mp3`;
      const body = (await response.json()) as {
        audio_base64: string;
        alignment?: CharacterAlignment | null;
      };
      await savePublicFile(FOLDER, file, Buffer.from(body.audio_base64, "base64"));
      const words = body.alignment ? alignmentToWords(body.alignment) : [];

      const clip: CustomSfx = {
        id,
        label: name,
        file,
        src: `/${FOLDER}/${file}`,
        group: "voice",
      };
      await writeJson(SFX_MANIFEST, [...(await readSfxManifest()), clip]);
      return { ...clip, words };
    }),
});
