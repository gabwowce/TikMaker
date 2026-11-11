// Records "City Flight" (game.html) frame by frame into a 9:16 MP4: the page
// runs with ?capture=1, so it has no clock of its own – each window.__step()
// advances the game exactly 1/30 s and draws it, and every frame is a
// screenshot. Perfectly smooth whatever the machine's speed.
//
//   npx tsx scripts/recordGame.ts [out.mp4] [--seconds=14] [--url=http://localhost:5173/game.html?autopilot=1]
//
// The editor's dev server must be running (npm run dev).
import { ensureBrowser } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
const out = path.resolve(args.find((a) => !a.startsWith("--")) ?? "out/city-flight.mp4");
const seconds = Number(flag("seconds", "14"));
const base = flag("url", "http://localhost:5173/game.html?autopilot=1");
const url = `${base}${base.includes("?") ? "&" : "?"}capture=1`;

async function browserPath(): Promise<string> {
  if (process.env.REMOTION_BROWSER_EXECUTABLE) return process.env.REMOTION_BROWSER_EXECUTABLE;
  await ensureBrowser();
  const root = path.resolve("node_modules", ".remotion", "chrome-headless-shell");
  const find = (dir: string): string | undefined => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = find(full);
        if (found) return found;
      } else if (/^chrome-headless-shell(\.exe)?$/.test(entry.name)) return full;
    }
    return undefined;
  };
  const found = fs.existsSync(root) ? find(root) : undefined;
  if (!found) throw new Error("No Chrome found – run a Remotion render once");
  return found;
}

const browser = await chromium.launch({
  executablePath: await browserPath(),
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(url);
await page.waitForFunction(() => typeof (window as unknown as { __step?: unknown }).__step === "function", null, {
  timeout: 60000,
});
// textures, fonts and the environment settle
for (let i = 0; i < 20; i++) await page.evaluate(() => (window as unknown as { __step: () => void }).__step());
await page.waitForTimeout(1500);

const frames = fs.mkdtempSync(path.join(os.tmpdir(), "city-flight-"));
const total = Math.round(seconds * 30);
for (let i = 0; i < total; i++) {
  await page.evaluate(() => (window as unknown as { __step: () => void }).__step());
  await page.screenshot({ path: path.join(frames, `f${String(i).padStart(5, "0")}.png`) });
  if (i % 60 === 0) console.log(`frame ${i}/${total}`);
}
await browser.close();

fs.mkdirSync(path.dirname(out), { recursive: true });
const ff = spawnSync(
  "ffmpeg",
  ["-y", "-loglevel", "error", "-framerate", "30", "-i", path.join(frames, "f%05d.png"), "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", out],
  { stdio: "inherit" },
);
fs.rmSync(frames, { recursive: true, force: true });
if (ff.status !== 0) throw new Error("ffmpeg failed");
console.log(out);
