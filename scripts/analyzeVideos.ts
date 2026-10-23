import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";

// Usage: npm run videos:analyze [-- --force] [-- --only <videoId>]
//
// Stage 1 of docs/bd/analizes-planas.md: sends every link in
// docs/bd/rinkimas/video-nuorodos.txt to Gemini together with "1 promptas"
// from docs/bd/video-analizes-promptas.md and saves the JSON answer as
// docs/bd/analizes/<videoId>.json. Links already analysed with the current
// prompt version are skipped, so the script can be re-run after a failure.
// Needs GEMINI_API_KEY in .env.local. GEMINI_MODELS (comma separated) sets the
// models to try in order: if one is overloaded or missing, the next is used.

const PROMPT_VERSION = "v2";
const linksFile = "docs/bd/rinkimas/video-nuorodos.txt";
const promptFile = "docs/bd/video-analizes-promptas.md";
const outDir = "docs/bd/analizes";
const pauseMs = Number(process.env.GEMINI_PAUSE_MS ?? 8000); // free tier: few requests per minute

loadEnvLocal();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}
const models = (process.env.GEMINI_MODELS ?? process.env.GEMINI_MODEL ?? "gemini-flash-latest,gemini-2.5-flash,gemini-2.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const force = process.argv.includes("--force");
const only = argValue("--only");

const ai = new GoogleGenAI({ apiKey });
const prompt = readPrompt();
const links = readLinks();
mkdirSync(outDir, { recursive: true });

let done = 0;
const failed: string[] = [];
for (const { id, url } of links) {
  if (only && id !== only) continue;
  const file = join(outDir, `${id}.json`);
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  if (!force && previous?.manual?.promptVersion === PROMPT_VERSION) continue;

  console.log(`${id}: analysing (usually 1–2 min)...`);
  try {
    const { analysis, model } = await analyse(url);
    const manual = {
      ...(previous?.manual ?? {}),
      analyzedAt: new Date().toISOString().slice(0, 10),
      model,
      promptVersion: PROMPT_VERSION,
    };
    writeFileSync(file, JSON.stringify({ ...analysis, url, manual }, null, 2) + "\n");
    done += 1;
    console.log(`  ok (${model})`);
  } catch (error) {
    failed.push(`${id}: ${(error as Error).message}`);
    console.log("FAILED");
  }
  await sleep(pauseMs);
}

console.log(`\n${done} analysed, ${failed.length} failed`);
if (failed.length) console.log(failed.join("\n"));
console.log("Next: npm run analysis:stats");

async function analyse(url: string): Promise<{ analysis: Record<string, unknown>; model: string }> {
  let lastError: Error | undefined;
  for (let round = 1; round <= 3; round++) {
    for (const model of [...models]) {
      try {
        console.log(`  trying ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                { fileData: { fileUri: url, mimeType: "video/*" } },
                { text: prompt.replace("<URL>", url) },
              ],
            },
          ],
          config: { responseMimeType: "application/json", temperature: 0.2 },
        });
        const text = response.text ?? "";
        return { analysis: JSON.parse(text.replace(/^```(json)?\s*|\s*```$/g, "")), model };
      } catch (error) {
        lastError = error as Error;
        const message = lastError.message;
        console.log(`  ${model} failed: ${message.slice(0, 200)}`);
        // a model that does not exist will not appear later: drop it
        if (/"code":\s*404|NOT_FOUND|not found/i.test(message)) models.splice(models.indexOf(model), 1);
      }
    }
    if (models.length === 0) break;
    if (round < 3) {
      // all models busy (503 / 429): wait before the next round
      console.log(`  all models failed, waiting ${round * 30} s...`);
      await sleep(round * 30000);
    }
  }
  throw lastError ?? new Error("unknown error");
}

function readPrompt(): string {
  const md = readFileSync(promptFile, "utf8").replace(/\r\n/g, "\n");
  const section = md.slice(md.indexOf("## 1 promptas"));
  const match = section.match(/```\n([\s\S]*?)```/);
  if (!match) throw new Error(`"1 promptas" code block not found in ${promptFile}`);
  return match[1];
}

function readLinks(): { id: string; url: string }[] {
  const seen = new Set<string>();
  const out: { id: string; url: string }[] = [];
  for (const raw of readFileSync(linksFile, "utf8").split(/\r?\n/)) {
    const url = raw.split("#")[0].trim();
    if (!/^https?:\/\//.test(url)) continue;
    const id = videoId(url);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, url: url.includes("youtube.com/shorts/") ? `https://www.youtube.com/shorts/${id}` : url });
  }
  return out;
}

function videoId(url: string): string {
  const m =
    url.match(/shorts\/([\w-]+)/) ??
    url.match(/youtu\.be\/([\w-]+)/) ??
    url.match(/[?&]v=([\w-]+)/) ??
    url.match(/video\/(\d+)/); // TikTok
  return m ? m[1] : url.replace(/\W+/g, "_").slice(-40);
}

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
