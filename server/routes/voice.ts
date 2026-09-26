import express from "express";
import { z } from "zod";
import { voiceSettingsSchema } from "../../src/schema/voiceSettings.js";
import { readJson, slugify, writeJson } from "../db.js";
import { savePublicFile } from "../uploads.js";
import { readSfxManifest, SFX_MANIFEST, type CustomSfx } from "./sfx.js";

export const VOICE_SETTINGS = "voice-settings.json";
const OUTPUT_FORMAT = "mp3_44100_128";
const FOLDER = "assets/voice";

// POST body: the text, plus any setting to override for THIS clip only
// (the editor's sliders). Anything not sent comes from voice-settings.json.
const voiceRequestSchema = voiceSettingsSchema.partial().extend({
  text: z.string().trim().min(1, "No text to generate voiceover from."),
  label: z.string().optional(),
});

export const voiceRouter = express.Router();

// GET /api/voice/status — is the ElevenLabs key set up
voiceRouter.get("/status", (request, response) => {
  response.json({ configured: Boolean(process.env.ELEVENLABS_API_KEY) });
});

// POST /api/voice — turn { text, label?, speed?, ... } into an mp3
voiceRouter.post("/", async (request, response) => {
  // Read at request time, not import time: editing .env.local + restarting
  // is all it takes, and tests can set it per case.
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    response.status(503).json({
      error: "ELEVENLABS_API_KEY is missing. Add it to .env.local and restart.",
    });
    return;
  }

  const parsed = voiceRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid request",
      issues: parsed.error.issues,
    });
    return;
  }
  const { text, label, ...overrides } = parsed.data;
  const saved = voiceSettingsSchema.parse(await readJson(VOICE_SETTINGS, {}));
  const settings = { ...saved, ...overrides };

  const elevenLabs = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}?output_format=${OUTPUT_FORMAT}`,
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
  if (!elevenLabs.ok) {
    const detail = await elevenLabs.text().catch(() => "");
    response
      .status(502)
      .json({ error: `ElevenLabs ${elevenLabs.status}: ${detail.slice(0, 400)}` });
    return;
  }

  const audio = Buffer.from(await elevenLabs.arrayBuffer());
  const name = label?.trim() || text.slice(0, 40);
  const id = `vo-${slugify(name)}-${Date.now().toString(36)}`;
  const file = `${id}.mp3`;
  await savePublicFile(FOLDER, file, audio);

  const clip: CustomSfx = {
    id,
    label: name,
    file,
    src: `/${FOLDER}/${file}`,
    group: "voice",
  };
  await writeJson(SFX_MANIFEST, [...(await readSfxManifest()), clip]);
  response.status(201).json(clip);
});
