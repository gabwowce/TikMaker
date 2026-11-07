import {
  voiceSettingsSchema,
  type VoiceSettings,
} from "../src/schema/voiceSettings.js";
import type { CaptionWord } from "../src/schema/project.js";
import {
  alignmentToWords,
  type CharacterAlignment,
} from "../src/utils/captionWords.js";
import { readJson, slugify, writeJson } from "./db.js";
import { savePublicFile } from "./uploads.js";
import { readSfxManifest, SFX_MANIFEST, type CustomSfx } from "./trpc/sfx.js";

// Text → an ElevenLabs voiceover: the mp3 saved under public/assets/voice,
// listed in the sound manifest (group "voice"), plus the time each word is
// spoken (for captions). One place for it, because two callers need it: the
// editor's "Generate voiceover" button (trpc/voice.ts) and the agent's voice
// step, which voices every scene of a finished run.

export const VOICE_SETTINGS = "voice-settings.json";
const OUTPUT_FORMAT = "mp3_44100_128";
const FOLDER = "assets/voice";

// Why a voiceover could not be made. `reason` lets the tRPC route pick its
// error code: no key is the user's setup, a refusal is ElevenLabs'.
export class VoiceError extends Error {
  constructor(
    message: string,
    readonly reason: "no-key" | "elevenlabs",
  ) {
    super(message);
  }
}

export type GeneratedVoice = CustomSfx & { words: CaptionWord[] };

// `around`: what is said just before and after this clip (the scenes next to
// it). ElevenLabs reads it to keep the pace and the intonation of one
// continuous voiceover – without it every scene is voiced on its own, and a
// short punchy hook comes out faster and louder than the rest.
export async function generateVoice(
  text: string,
  label?: string,
  overrides: Partial<VoiceSettings> = {},
  around: { previous?: string; next?: string } = {},
): Promise<GeneratedVoice> {
  // Read at call time, not import time, so editing .env.local + restarting
  // is all it takes.
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey)
    throw new VoiceError(
      "ELEVENLABS_API_KEY is missing. Add it to .env.local and restart.",
      "no-key",
    );

  // Any setting given here overrides the saved one for THIS clip.
  const saved = voiceSettingsSchema.parse(await readJson(VOICE_SETTINGS, {}));
  const settings = { ...saved, ...overrides };

  // The /with-timestamps endpoint returns the audio base64-encoded inside
  // JSON, next to a per-character alignment.
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}/with-timestamps?output_format=${OUTPUT_FORMAT}`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: settings.modelId,
        ...(around.previous ? { previous_text: around.previous } : {}),
        ...(around.next ? { next_text: around.next } : {}),
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
    throw new VoiceError(
      `ElevenLabs ${response.status}: ${detail.slice(0, 400)}`,
      "elevenlabs",
    );
  }

  const name = label?.trim() || text.slice(0, 40);
  const id = `vo-${slugify(name)}-${Date.now().toString(36)}`;
  const file = `${id}.mp3`;
  const body = (await response.json()) as {
    audio_base64: string;
    alignment?: CharacterAlignment | null;
  };
  await savePublicFile(FOLDER, file, Buffer.from(body.audio_base64, "base64"));
  // The words are not saved in the manifest: the caller stores them on the
  // project's audio clip, where the render can read them.
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
}
