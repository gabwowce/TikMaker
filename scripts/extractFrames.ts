import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Usage: npm run videos:frames [-- --per-video 2]
//
// Cuts frames for manual review (docs/bd/analizes-planas.md, "Kadrai"):
// from every analysis it takes N random beats (seeded by the video id, so
// re-running gives the same picks), downloads the video once with yt-dlp and
// cuts the beat's keyFrameSeconds with ffmpeg into docs/bd/kadrai/.
// index.json maps each frame to its beat so good frames can become
// composition examples. Needs yt-dlp and ffmpeg on PATH.

const analysesDir = "docs/bd/analizes";
const framesDir = "docs/bd/kadrai";
const cacheDir = ".cache/videos"; // gitignored, delete when done
const perVideo = Number(argValue("--per-video") ?? 2);

for (const tool of ["yt-dlp", "ffmpeg"]) {
  try {
    execFileSync(tool, ["--version"], { stdio: "ignore" });
  } catch {
    console.error(`${tool} not found. Install it first (see docs/bd/analizes-planas.md).`);
    process.exit(1);
  }
}
mkdirSync(framesDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });

type Beat = { role?: string; startSeconds?: number; endSeconds?: number; keyFrameSeconds?: number; composition?: { type?: string } };
const indexFile = join(framesDir, "index.json");
const index: Record<string, { videoId: string; url: string; beat: number; role?: string; compositionType?: string; seconds: number }> =
  existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : {};

const failed: string[] = [];
for (const file of readdirSync(analysesDir).filter((f) => f.endsWith(".json")).sort()) {
  const id = file.replace(".json", "");
  const analysis = JSON.parse(readFileSync(join(analysesDir, file), "utf8"));
  const beats: Beat[] = analysis.beats ?? [];
  const candidates = beats
    .map((beat, i) => ({ beat, i, seconds: beat.keyFrameSeconds ?? mid(beat) }))
    .filter((c) => Number.isFinite(c.seconds));
  const picks = shuffle(candidates, id).slice(0, perVideo);
  if (picks.every((p) => existsSync(join(framesDir, frameName(id, p.seconds))))) continue;

  try {
    const video = download(id, analysis.url);
    for (const pick of picks) {
      const name = frameName(id, pick.seconds);
      const out = join(framesDir, name);
      if (!existsSync(out))
        execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(pick.seconds), "-i", video, "-frames:v", "1", "-q:v", "2", out]);
      index[name] = { videoId: id, url: analysis.url, beat: pick.i, role: pick.beat.role, compositionType: pick.beat.composition?.type, seconds: pick.seconds };
    }
    console.log(`${id}: ${picks.length} frames`);
  } catch (error) {
    failed.push(`${id}: ${(error as Error).message.split("\n")[0]}`);
  }
}
writeFileSync(indexFile, JSON.stringify(index, null, 2) + "\n");
console.log(`\n${Object.keys(index).length} frames in ${framesDir}, ${failed.length} videos failed`);
if (failed.length) console.log(failed.join("\n"));
console.log("Review: move good frames to docs/bd/kadrai/geri/, bad to docs/bd/kadrai/blogi/, delete the rest.");

function download(id: string, url: string): string {
  const existing = readdirSync(cacheDir).find((f) => f.startsWith(`${id}.`));
  if (existing) return join(cacheDir, existing);
  execFileSync("yt-dlp", ["-q", "-f", "mp4/best", "-o", join(cacheDir, `${id}.%(ext)s`), url], { stdio: "inherit" });
  const saved = readdirSync(cacheDir).find((f) => f.startsWith(`${id}.`));
  if (!saved) throw new Error("download failed");
  return join(cacheDir, saved);
}

function frameName(id: string, seconds: number) {
  return `${id}-${seconds.toFixed(1)}.jpg`;
}

function mid(beat: Beat) {
  return ((beat.startSeconds ?? NaN) + (beat.endSeconds ?? NaN)) / 2;
}

// deterministic shuffle: same video id → same picks
function shuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}
