// The channel's own sound kit, made with ElevenLabs Sound Effects (yours to
// use on a paid plan – no stock licence that forbids putting the sounds in
// TikMaker for other people). For every kind of moment the agent marks
// (src/agent/run/5-pictures.ts → soundKind) it makes 3 variants, evens out their
// loudness, and saves them as sfx/tm-<kind>-<n>.mp3 – the Sound tab and the
// "SoundKit" composition (npm run sfx:listen) play them. Pick the best one per
// kind in knowledge/shared/sound-kit.json.
//
//   npm run sfx:generate                 every kind, 3 variants
//   npm run sfx:generate -- pop whoosh   only these kinds
//   npm run sfx:generate -- --variants=5
import { spawnSync } from "node:child_process";
import { config as loadEnv } from "dotenv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

loadEnv({ path: path.resolve(".env.local") });

// One sound per kind of moment: what to ask for and how long it is. All of
// them one family – clean, modern, soft, short, for a tech explainer.
const FAMILY =
  "clean modern UI sound design for a tech explainer video, soft and premium, no music, no voice, dry, no reverb tail";
const KINDS: Record<string, { prompt: string; seconds: number }> = {
  whoosh: { prompt: "a short smooth airy whoosh as a card flies past the camera", seconds: 0.7 },
  slide: { prompt: "a quick soft swipe as a glass card slides sideways into place", seconds: 0.5 },
  pop: { prompt: "a small round bubbly pop as an icon appears", seconds: 0.3 },
  enter: { prompt: "a soft low thump as a card lands on a table", seconds: 0.4 },
  ping: { prompt: "a bright gentle single ping to draw attention", seconds: 0.6 },
  tick: { prompt: "one tiny crisp click tick of a toggle", seconds: 0.2 },
  count: { prompt: "a fast rising digital counter ticking up and stopping", seconds: 0.9 },
  success: { prompt: "a warm rising two-note success chime", seconds: 0.9 },
  fix: { prompt: "a satisfying soft click of a piece snapping into place", seconds: 0.35 },
  break: { prompt: "a short dull error thud with a tiny glitch", seconds: 0.5 },
  type: { prompt: "a short burst of soft laptop keyboard typing, five keys", seconds: 0.8 },
  message: { prompt: "a soft modern chat message arriving swoosh bloop", seconds: 0.5 },
  reveal: { prompt: "a short airy riser building up to a reveal", seconds: 1.6 },
  check: { prompt: "a light positive blip for a check mark", seconds: 0.3 },
};

const args = process.argv.slice(2);
const variants = Number(args.find((a) => a.startsWith("--variants="))?.split("=")[1] ?? 3);
const only = args.filter((a) => !a.startsWith("--"));
const kinds = only.length ? only : Object.keys(KINDS);
const outDir = path.resolve(process.env.TIKMAKER_SFX_PATH ?? "sfx");

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is missing in .env.local");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

for (const kind of kinds) {
  const spec = KINDS[kind];
  if (!spec) {
    console.error(`Unknown kind "${kind}" – one of: ${Object.keys(KINDS).join(", ")}`);
    continue;
  }
  for (let n = 1; n <= variants; n++) {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${spec.prompt}. ${FAMILY}`,
          duration_seconds: Math.max(0.5, spec.seconds),
          prompt_influence: 0.6,
        }),
      },
    );
    if (!response.ok) {
      console.error(`${kind} ${n}: ElevenLabs ${response.status} ${(await response.text()).slice(0, 200)}`);
      continue;
    }
    const raw = path.join(os.tmpdir(), `tm-${kind}-${n}-raw.mp3`);
    fs.writeFileSync(raw, Buffer.from(await response.arrayBuffer()));
    const file = path.join(outDir, `tm-${kind}-${n}.mp3`);
    normalise(raw, file, spec.seconds);
    fs.rmSync(raw, { force: true });
    console.log(`✓ ${path.relative(process.cwd(), file)}`);
  }
}
console.log(
  "\nListen: npm run sfx:listen (renders out/sound-kit.mp4) or the Sound tab.\n" +
    "Pick: knowledge/shared/sound-kit.json → \"sfx\": \"tm-<kind>-<n>\". Then npm run assets:sync.",
);

// Every effect equally loud (EBU R128, -18 LUFS), trimmed to its length.
// (Remotion's own ffmpeg, so nothing else to install: it has atrim and
// loudnorm, not every filter.)
function normalise(input: string, output: string, seconds: number) {
  const run = spawnSync(
    "npx",
    [
      "remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", input,
      "-af",
      `atrim=0:${(seconds + 0.25).toFixed(2)},loudnorm=I=-18:TP=-2:LRA=7`,
      "-ar", "44100", "-b:a", "192k", output,
    ],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (run.status !== 0) fs.copyFileSync(input, output);
}
