import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
const DEFAULT_VOICE_ID = "qSeXEcewz7tA0Q0qk9fH";
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";
type VoiceRequest = {
  text: string;
  label?: string;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
};
const SPEED_MIN = 0.7;
const SPEED_MAX = 1.2;
const DEFAULT_SETTINGS = {
  speed: 1.15,
  stability: 1,
  similarityBoost: 1,
  style: 1,
  speakerBoost: true,
} as const;
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
type ManifestEntry = {
  id: string;
  label: string;
  file: string;
  src: string;
  group: string;
};
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "voice";
}
function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
export function voiceApiPlugin(root: string): Plugin {
  const voiceDir = path.resolve(root, "public/assets/voice");
  const manifestPath = path.resolve(root, "src/config/customSfx.json");
  function readManifest(): ManifestEntry[] {
    if (!fs.existsSync(manifestPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      return [];
    }
  }
  function writeManifest(entries: ManifestEntry[]) {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
  }
  function json(
    res: import("http").ServerResponse,
    status: number,
    body: unknown,
  ) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }
  return {
    name: "voice-api",
    configureServer(server) {
      server.middlewares.use("/api/voice/status", (_req, res) => {
        json(res, 200, {
          configured: Boolean(process.env.ELEVENLABS_API_KEY),
          voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
          model: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID,
          defaults: DEFAULT_SETTINGS,
        });
      });
      server.middlewares.use("/api/voice/generate", (req, res) => {
        if (req.method !== "POST")
          return json(res, 405, { error: "POST only" });
        readBody(req)
          .then(async (raw) => {
            const apiKey = process.env.ELEVENLABS_API_KEY;
            if (!apiKey) {
              throw new Error(
                "ELEVENLABS_API_KEY is missing. Add it to .env.local and restart the dev server.",
              );
            }
            const request = JSON.parse(raw) as VoiceRequest;
            const { text, label } = request;
            if (!text?.trim())
              throw new Error("No text to generate voiceover from.");
            const speed = request.speed ?? DEFAULT_SETTINGS.speed;
            const stability = request.stability ?? DEFAULT_SETTINGS.stability;
            const similarityBoost =
              request.similarityBoost ?? DEFAULT_SETTINGS.similarityBoost;
            const style = request.style ?? DEFAULT_SETTINGS.style;
            const speakerBoost =
              request.speakerBoost ?? DEFAULT_SETTINGS.speakerBoost;
            const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
            const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;
            const response = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`,
              {
                method: "POST",
                headers: {
                  "xi-api-key": apiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  text: text.trim(),
                  model_id: modelId,
                  voice_settings: {
                    stability: clamp(stability, 0, 1),
                    similarity_boost: clamp(similarityBoost, 0, 1),
                    style: clamp(style, 0, 1),
                    use_speaker_boost: speakerBoost,
                    speed: clamp(speed, SPEED_MIN, SPEED_MAX),
                  },
                }),
              },
            );
            if (!response.ok) {
              const detail = await response.text().catch(() => "");
              throw new Error(
                `ElevenLabs ${response.status}: ${detail.slice(0, 400)}`,
              );
            }
            const audio = Buffer.from(await response.arrayBuffer());
            const name = label?.trim() || text.trim().slice(0, 40);
            const id = `vo-${slugify(name)}-${Date.now().toString(36)}`;
            const file = `${id}.mp3`;
            fs.mkdirSync(voiceDir, { recursive: true });
            fs.writeFileSync(path.join(voiceDir, file), audio);
            const entry: ManifestEntry = {
              id,
              label: name,
              file,
              src: `/assets/voice/${file}`,
              group: "voice",
            };
            const manifest = readManifest();
            manifest.push(entry);
            writeManifest(manifest);
            json(res, 200, entry);
          })
          .catch((err) =>
            json(res, 500, {
              error: err instanceof Error ? err.message : String(err),
            }),
          );
      });
    },
  };
}
