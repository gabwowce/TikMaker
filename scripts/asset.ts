// Real pictures for the agent's code scenes (docs/tikmaker-kryptis.md):
// instead of drawing a website, a logo or a screen, the agent fetches the real
// thing. Every file lands in public/assets/agent/<folder>/ and the command
// prints the path a scene uses (`<Img src={staticFile(...)}>` – or through
// a field.photo / field.recording default, so the creator can swap it).
//
//   npx tsx scripts/asset.ts screenshot <folder> <name> <url> [--full] [--width=1280] [--height=800] [--dark]
//   npx tsx scripts/asset.ts scroll     <folder> <name> <url> [--seconds=6]      (a video scrolling down the page)
//   npx tsx scripts/asset.ts logo       <folder> <name> <brand>                  (Simple Icons, CC0)
//   npx tsx scripts/asset.ts photo      <folder> <name> "<what>"                 (Pexels, needs PEXELS_API_KEY)
//   npx tsx scripts/asset.ts tikmaker   <folder> <name> <steps.json>              (records TikMaker itself)
//
// tikmaker steps: [{ "project": "<project id>" }, { "click": "Visuals" },
//                  { "type": "text", "into": "Video idea" }, { "select": "Visual style", "option": "Depth" },
//                  { "wait": 1000 }, { "scroll": 400 },
//                  { "still": "panel", "of": "AI agent", "mark": ["Start"] }] – a sharp 2x PNG
//                  (<name>-panel.png) of the whole screen, or cropped to the box around the
//                  text in "of"; "mark": where those texts are in it (fractions of its size)
//                  – the editor must be running (npm run dev).
import { ensureBrowser } from "@remotion/renderer";
import { config as loadEnv } from "dotenv";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright-core";
import * as icons from "simple-icons";

loadEnv({ path: path.resolve(".env.local") });

const [command, folder, name, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(
  rest
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, value] = arg.slice(2).split("=");
      return [key, value ?? "true"];
    }),
);
const target = rest.find((arg) => !arg.startsWith("--")) ?? "";

if (!command || !folder || !name || !/^[\w-]+$/.test(folder) || !/^[\w-]+$/.test(name)) {
  fail("usage: asset.ts <screenshot|scroll|logo|photo|tikmaker> <folder> <name> <url|brand|query|steps.json>");
}
const outDir = path.resolve("public", "assets", "agent", folder);
fs.mkdirSync(outDir, { recursive: true });
const publicPath = (file: string) => `/assets/agent/${folder}/${file}`;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// The Chrome Remotion already uses for renders – no second browser to install.
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
  if (!found) fail("No Chrome found – run a Remotion render once, or set REMOTION_BROWSER_EXECUTABLE");
  return found;
}

async function withPage<T>(
  options: { width: number; height: number; dark?: boolean; video?: string },
  work: (page: Page) => Promise<T>,
): Promise<T> {
  const browser = await chromium.launch({ executablePath: await browserPath() });
  // a recording that fails half-way leaves no folder behind
  const cleanUp = () => {
    if (options.video) fs.rmSync(options.video, { recursive: true, force: true });
  };
  try {
    // A recording: the window twice as big and the page zoomed 2x, so the
    // screencast (which sends CSS pixels) is as sharp as a 2x screenshot.
    const zoom = options.video ? 2 : 1;
    const context = await browser.newContext({
      viewport: { width: options.width * zoom, height: options.height * zoom },
      deviceScaleFactor: options.video ? 1 : 2,
      colorScheme: options.dark ? "dark" : "light",
    });
    if (zoom !== 1)
      await context.addInitScript((z) => {
        const apply = () => document.documentElement.style.setProperty("zoom", String(z));
        if (document.documentElement) apply();
        document.addEventListener("DOMContentLoaded", apply);
      }, zoom);
    const page = await context.newPage();
    // A recording: every change of the screen as a sharp 2x PNG (Chrome's
    // screencast), joined into an MP4 afterwards – far sharper than
    // Playwright's own video (1x, low bitrate).
    const frames: { file: string; at: number }[] = [];
    const cdp = options.video ? await context.newCDPSession(page) : undefined;
    if (cdp && options.video) {
      const dir = options.video;
      cdp.on("Page.screencastFrame", (event) => {
        const file = path.join(dir, `f${String(frames.length).padStart(6, "0")}.png`);
        fs.writeFileSync(file, Buffer.from(event.data, "base64"));
        frames.push({ file, at: event.metadata.timestamp ?? Date.now() / 1000 });
        void cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
      });
      await cdp.send("Page.startScreencast", {
        format: "png",
        maxWidth: options.width * zoom,
        maxHeight: options.height * zoom,
        everyNthFrame: 1,
      });
    }
    const result = await work(page).catch((error: unknown) => {
      cleanUp();
      throw error;
    });
    if (cdp && options.video) {
      await page.waitForTimeout(400);
      await cdp.send("Page.stopScreencast");
      encodeFrames(frames, path.join(options.video, "out.mp4"));
    }
    await context.close();
    return result;
  } finally {
    await browser.close();
  }
}

// Cookie banners and pop-ups hide what the picture is for: the usual
// "accept / close" buttons are pressed if they are there.
async function clearPopups(page: Page) {
  for (const label of [/accept all/i, /^accept$/i, /agree/i, /got it/i, /^close$/i, /no thanks/i]) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible({ timeout: 300 }).catch(() => false))
      await button.click({ timeout: 1000 }).catch(() => {});
  }
}

async function screenshot() {
  if (!/^https?:\/\//.test(target)) fail("screenshot needs a full http(s) URL");
  const file = `${name}.png`;
  await withPage(
    { width: Number(flags.width ?? 1280), height: Number(flags.height ?? 800), dark: flags.dark === "true" },
    async (page) => {
      await page.goto(target, { waitUntil: "networkidle", timeout: 45_000 }).catch(() =>
        page.goto(target, { waitUntil: "load", timeout: 45_000 }),
      );
      await clearPopups(page);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, file), fullPage: flags.full === "true" });
    },
  );
  console.log(publicPath(file));
}

// A page scrolling down slowly – "real screen" footage of a website.
async function scroll() {
  if (!/^https?:\/\//.test(target)) fail("scroll needs a full http(s) URL");
  const seconds = Number(flags.seconds ?? 6);
  const dir = fs.mkdtempSync(path.join(outDir, ".rec-"));
  await withPage({ width: 1080, height: 1350, video: dir }, async (page) => {
    await page.goto(target, { waitUntil: "load", timeout: 45_000 });
    await clearPopups(page);
    await page.waitForTimeout(600);
    const steps = seconds * 30;
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, 6);
      await page.waitForTimeout(1000 / 30);
    }
  });
  console.log(moveRecording(dir));
}

async function tikmaker() {
  const steps = JSON.parse(fs.readFileSync(target, "utf-8")) as Record<string, unknown>[];
  const base = process.env.TIKMAKER_URL ?? "http://localhost:5173";
  const dir = fs.mkdtempSync(path.join(outDir, ".rec-"));
  const stills: string[] = [];
  await withPage({ width: 1600, height: 1000, video: dir }, async (page) => {
    await page.goto(base, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    for (const step of steps) {
      if (typeof step.goto === "string") await page.goto(new URL(step.goto, base).href);
      else if (typeof step.project === "string") {
        // open a project by its id, as if it was the last one opened
        await page.evaluate((id) => {
          localStorage.setItem(
            "tikmaker.editor-prefs",
            JSON.stringify({ state: { lastOpenedProjectId: id }, version: 0 }),
          );
        }, step.project);
        await page.reload({ waitUntil: "load" });
        await page.waitForTimeout(2500);
      } else if (typeof step.select === "string")
        await page.getByLabel(step.select).first().selectOption({ label: String(step.option ?? "") });
      else if (typeof step.still === "string") {
        const file = `${name}-${step.still.replace(/[^\w-]/g, "-")}.png`;
        const out = path.join(outDir, file);
        // the area the still shows, in the page's CSS pixels
        let area = { x: 0, y: 0, width: page.viewportSize()!.width, height: page.viewportSize()!.height };
        if (typeof step.of === "string") {
          // the smallest box around the text at least 320x240 px (a card, a panel)
          area = await page
            .getByText(step.of, { exact: false })
            .first()
            .evaluate((el) => {
              let node: HTMLElement | null = el as HTMLElement;
              while (node && (node.getBoundingClientRect().width < 320 || node.getBoundingClientRect().height < 240))
                node = node.parentElement;
              const r = (node ?? (el as HTMLElement)).getBoundingClientRect();
              return { x: r.x, y: r.y, width: r.width, height: r.height };
            });
          await page.screenshot({ path: out, clip: area });
        } else await page.screenshot({ path: out });
        // "mark": where things are in the still, as fractions of its width and
        // height – a highlight or a cursor lands exactly on the real button
        const marks: Record<string, { x: number; y: number; width: number; height: number }> = {};
        for (const text of Array.isArray(step.mark) ? (step.mark as string[]) : []) {
          const box = await page.getByText(text, { exact: false }).first().boundingBox().catch(() => null);
          if (!box) continue;
          marks[text] = {
            x: +((box.x - area.x) / area.width).toFixed(4),
            y: +((box.y - area.y) / area.height).toFixed(4),
            width: +(box.width / area.width).toFixed(4),
            height: +(box.height / area.height).toFixed(4),
          };
        }
        if (Object.keys(marks).length) {
          fs.writeFileSync(out.replace(/\.png$/, ".json"), JSON.stringify(marks, null, 2));
          stills.push(`${publicPath(file)}  marks: ${JSON.stringify(marks)}`);
        } else stills.push(publicPath(file));
      }
      else if (typeof step.click === "string")
        await page.getByText(step.click, { exact: false }).first().click({ timeout: 5000 });
      else if (typeof step.type === "string") {
        const field =
          typeof step.into === "string" ? page.getByLabel(step.into).first() : page.locator(":focus");
        await field.pressSequentially(step.type, { delay: 45 });
      } else if (typeof step.scroll === "number") await page.mouse.wheel(0, step.scroll);
      await page.waitForTimeout(typeof step.wait === "number" ? step.wait : 700);
    }
  });
  console.log(moveRecording(dir));
  for (const still of stills) console.log(still);
}

// The screencast's frames → an MP4 at 30 fps: each frame held until the
// next one came (the screen sends a frame only when something changes).
function encodeFrames(frames: { file: string; at: number }[], out: string) {
  if (!frames.length) fail("The recording caught no frames");
  const list = frames
    .map((frame, i) => {
      const next = frames[i + 1]?.at ?? frame.at + 0.5;
      const seconds = Math.max(1 / 30, next - frame.at);
      return `file '${frame.file.replace(/'/g, "'\\''")}'\nduration ${seconds.toFixed(4)}`;
    })
    .join("\n");
  const listFile = path.join(path.dirname(out), "frames.txt");
  // the last frame again: the concat format ignores the last duration
  fs.writeFileSync(listFile, `${list}\nfile '${frames[frames.length - 1].file}'\n`);
  const run = spawnSync(
    "npx",
    [
      "remotion", "ffmpeg", "-y", "-loglevel", "error",
      "-f", "concat", "-safe", "0", "-i", listFile,
      "-vsync", "cfr", "-r", "30",
      "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p",
      out,
    ],
    { stdio: "inherit", shell: process.platform === "win32" },
  );
  if (run.status !== 0 || !fs.existsSync(out)) fail("Could not join the recording's frames");
}

// The recording under our name.
function moveRecording(dir: string): string {
  const video = fs.readdirSync(dir).find((f) => f.endsWith(".mp4"));
  if (!video) fail("The recording was not written");
  const file = `${name}.mp4`;
  fs.renameSync(path.join(dir, video), path.join(outDir, file));
  fs.rmSync(dir, { recursive: true, force: true });
  return publicPath(file);
}

// A brand's logo from Simple Icons (CC0): an SVG in the brand's colour, or
// white with --white (for a dark card).
function logo() {
  const wanted = target.toLowerCase().replace(/[^a-z0-9]/g, "");
  const all = Object.values(icons) as { title: string; slug: string; svg: string; hex: string }[];
  const icon =
    all.find((i) => i.slug === wanted) ??
    all.find((i) => i.title.toLowerCase().replace(/[^a-z0-9]/g, "") === wanted);
  if (!icon) fail(`No logo "${target}" in Simple Icons – take a screenshot of the brand's site instead`);
  const colour = flags.white === "true" ? "#ffffff" : `#${icon.hex}`;
  const file = `${name}.svg`;
  fs.writeFileSync(path.join(outDir, file), icon.svg.replace("<svg ", `<svg fill="${colour}" `));
  console.log(publicPath(file));
}

// A photo from Pexels (free to use, no attribution needed).
async function photo() {
  const key = process.env.PEXELS_API_KEY;
  if (!key) fail("No PEXELS_API_KEY in .env.local – use a screenshot or ask the creator for a photo");
  const orientation = flags.orientation ?? "portrait";
  const response = await fetch(
    `https://api.pexels.com/v1/search?per_page=1&orientation=${orientation}&query=${encodeURIComponent(target)}`,
    { headers: { Authorization: key } },
  );
  if (!response.ok) fail(`Pexels ${response.status}`);
  const found = (await response.json()) as { photos: { src: { large2x: string }; photographer: string }[] };
  const first = found.photos[0];
  if (!first) fail(`No photo for "${target}"`);
  const image = await fetch(first.src.large2x);
  const file = `${name}.jpg`;
  fs.writeFileSync(path.join(outDir, file), Buffer.from(await image.arrayBuffer()));
  console.log(publicPath(file));
}

const commands: Record<string, () => unknown> = { screenshot, scroll, logo, photo, tikmaker };
const run = commands[command];
if (!run) fail(`Unknown command "${command}"`);
await run();
