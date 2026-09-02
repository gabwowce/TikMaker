import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * ElevenLabs text-to-speech, wired into the sound system rather than beside it.
 *
 * A generated line is written into the SAME manifest as an uploaded sound
 * effect (`src/config/customSfx.json`), just with `group: "voice"`. That one
 * decision is what gives voiceover a timeline row, a waveform, trimming,
 * splitting, volume and drag-to-move without a line of new timeline code: the
 * SFX registry already feeds all of it, and an audio clip only ever refers to
 * a registry id. A parallel "voice" pipeline would have had to re-implement
 * every one of those, and then drift from them.
 *
 * The API key stays on the server. The editor has no backend of its own, so
 * this middleware is the only place it exists — the browser never sees it, and
 * it is read from `.env.local`, which is gitignored.
 */

/** The one voice for now. Overridable so trying another does not need a code
 * change, but deliberately not a per-scene setting yet — one consistent
 * narrator is what a channel sounds like. */
const DEFAULT_VOICE_ID = "qSeXEcewz7tA0Q0qk9fH";

/** Multilingual, because the scripts in this repo are Lithuanian. */
const DEFAULT_MODEL_ID = "eleven_multilingual_v2";

const OUTPUT_FORMAT = "mp3_44100_128";

/**
 * The generation knobs, named as ElevenLabs names them in its own UI so the
 * two can be compared side by side.
 *
 * `speed` is the one that matters most here: short-form narration has to move,
 * and a line generated at 1.15 sounds like someone talking quickly, while the
 * same line sped up afterwards sounds like a recording being played fast. The
 * API caps it at 0.7–1.2 — past that it refuses the request, so the editor
 * clamps rather than letting a slider produce a 422.
 */
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

/**
 * The starting point for every generated line, defined HERE rather than in the
 * editor's sliders.
 *
 * The server is what actually talks to ElevenLabs, so it is the only place that
 * can promise a request has these values whether it came from a slider, a
 * script or curl. The editor reads them back from `/api/voice/status` to
 * position its sliders, which is why there is one copy of the numbers instead
 * of two that drift.
 *
 * Speed 1.15 because these are shorts: the default pace reads as slow against
 * fast cuts, and generating quickly is not the same as playing a slow take
 * fast.
 */
const DEFAULT_SETTINGS = {
  speed: 1.15,
  stability: 1,
  similarityBoost: 1,
  style: 1,
  speakerBoost: true,
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type ManifestEntry = { id: string; label: string; file: string; src: string; group: string };

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

  const readManifest = (): ManifestEntry[] => {
    if (!fs.existsSync(manifestPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {
      return [];
    }
  };

  const writeManifest = (entries: ManifestEntry[]) => {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
  };

  const json = (res: import("http").ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  };

  return {
    name: "voice-api",
    configureServer(server) {
      /** Whether generation is even possible, so the editor can say "add your
       * key to .env.local" instead of failing at the moment you press the
       * button with nothing but a 401 to show for it. */
      server.middlewares.use("/api/voice/status", (_req, res) => {
        json(res, 200, {
          configured: Boolean(process.env.ELEVENLABS_API_KEY),
          voiceId: process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID,
          model: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID,
          defaults: DEFAULT_SETTINGS,
        });
      });

      server.middlewares.use("/api/voice/generate", (req, res) => {
        if (req.method !== "POST") return json(res, 405, { error: "POST only" });

        readBody(req)
          .then(async (raw) => {
            const apiKey = process.env.ELEVENLABS_API_KEY;
            if (!apiKey) {
              throw new Error(
                "Trūksta ELEVENLABS_API_KEY. Įrašyk jį į .env.local ir perkrauk dev serverį."
              );
            }

            const request = JSON.parse(raw) as VoiceRequest;
            const { text, label } = request;
            if (!text?.trim()) throw new Error("Nėra teksto įgarsinimui.");

            // A field the caller did not send falls back to the default rather
            // than to ElevenLabs' own, so "what does this app sound like" has
            // one answer no matter who made the request.
            const speed = request.speed ?? DEFAULT_SETTINGS.speed;
            const stability = request.stability ?? DEFAULT_SETTINGS.stability;
            const similarityBoost = request.similarityBoost ?? DEFAULT_SETTINGS.similarityBoost;
            const style = request.style ?? DEFAULT_SETTINGS.style;
            const speakerBoost = request.speakerBoost ?? DEFAULT_SETTINGS.speakerBoost;

            const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
            const modelId = process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

            const response = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`,
              {
                method: "POST",
                headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
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
              }
            );

            if (!response.ok) {
              // ElevenLabs answers with a JSON body describing the problem
              // (quota, bad voice id, invalid key); passing it through is the
              // difference between a fixable message and "generation failed".
              const detail = await response.text().catch(() => "");
              throw new Error(`ElevenLabs ${response.status}: ${detail.slice(0, 400)}`);
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
          .catch((err) => json(res, 500, { error: err instanceof Error ? err.message : String(err) }));
      });
    },
  };
}
