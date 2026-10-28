import { GoogleGenAI } from "@google/genai";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { vocabulary } from "../src/knowledge/vocabulary";

// Usage: npm run videos:analyze [-- --force] [-- --only <videoId>]
//
// Stage 1 of docs/bd/analizes-planas.md: sends every link in
// docs/bd/rinkimas/video-nuorodos.txt to Gemini together with "1 promptas"
// from docs/bd/video-analizes-promptas.md and saves the JSON answer as
// docs/bd/analizes/<videoId>.json. Links already analysed with the current
// prompt version are skipped, so the script can be re-run after a failure.
// Needs GEMINI_API_KEY in .env.local. All videos are analysed with one model
// (GEMINI_MODEL, default gemini-3.8-flash) so the analyses stay comparable: if
// it is overloaded the script waits and retries instead of switching to a
// weaker model; when the daily quota is used up it stops (re-run tomorrow).

const PROMPT_VERSION = "v5";
class DailyQuotaError extends Error {}
class WrongRoleError extends Error {}
const linksFile = "docs/bd/rinkimas/video-nuorodos.txt";
const promptFile = "docs/bd/video-analizes-promptas.md";
const outDir = "docs/bd/analizes";
const pauseMs = Number(process.env.GEMINI_PAUSE_MS ?? 8000); // free tier: few requests per minute
const requestTimeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? 240000);

loadEnvLocal();
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in .env.local");
  process.exit(1);
}
const model = process.env.GEMINI_MODEL ?? "gemini-pro-latest";
const retryWaitsMs = [60000, 120000, 300000, 600000]; // overloaded: wait, then try again
const force = process.argv.includes("--force");
const only = argValue("--only");

const ai = new GoogleGenAI({ apiKey });
const prompt = readPrompt();
const roles: readonly string[] = vocabulary.role;
const links = readLinks();
mkdirSync(outDir, { recursive: true });

let done = 0;
const failed: string[] = [];
for (const { id, url } of links) {
  if (only && id !== only) continue;
  const file = join(outDir, `${id}.json`);
  const previous = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : null;
  if (
    !force &&
    previous?.manual?.promptVersion === PROMPT_VERSION &&
    previous?.manual?.model === model
  )
    continue;

  console.log(`${id}: analysing (usually 1–2 min)...`);
  try {
    const analysis = await analyse(url);
    // a manual check belongs to the old analysis, not to the new one
    const { checkedByAuthor: _, ...kept } = previous?.manual ?? {};
    const manual = {
      ...kept,
      analyzedAt: new Date().toISOString().slice(0, 10),
      model,
      promptVersion: PROMPT_VERSION,
    };
    writeFileSync(
      file,
      JSON.stringify({ ...analysis, url, manual }, null, 2) + "\n",
    );
    done += 1;
    console.log("  ok");
  } catch (error) {
    if (error instanceof DailyQuotaError) {
      console.log(
        `\nDaily quota of ${model} used up. Run the same command again tomorrow: finished videos are skipped.`,
      );
      break;
    }
    failed.push(`${id}: ${(error as Error).message.slice(0, 300)}`);
    console.log("FAILED");
  }
  await sleep(pauseMs);
}

console.log(`\n${done} analysed, ${failed.length} failed`);
if (failed.length) console.log(failed.join("\n"));
console.log("Next: npm run analysis:stats");

async function analyse(url: string): Promise<Record<string, unknown>> {
  let wrongRoleRetries = 0;
  for (let attempt = 0; ; attempt++) {
    try {
      const started = Date.now();
      const ticker = setInterval(
        () =>
          console.log(
            `    still waiting (${Math.round((Date.now() - started) / 1000)} s)...`,
          ),
        30000,
      );
      const response = await ai.models
        .generateContent({
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
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
            httpOptions: { timeout: requestTimeoutMs },
          },
        })
        .finally(() => clearInterval(ticker));
      const text = response.text ?? "";
      const analysis = JSON.parse(text.replace(/^```(json)?\s*|\s*```$/g, ""));
      const wrongRoles = (analysis.beats ?? [])
        .map((beat: { role?: string }) => beat.role)
        .filter((role: string) => !roles.includes(role));
      if (wrongRoles.length)
        throw new WrongRoleError(
          `roles not in ROLES: ${wrongRoles.join(", ")}`,
        );
      return analysis;
    } catch (error) {
      const message = (error as Error).message;
      // e.g. an ACT token (build, climax) put into "role": the beat's real role is lost, so ask again at once
      if (error instanceof WrongRoleError && wrongRoleRetries++ < 2) {
        console.log(`  ${message}, asking again...`);
        attempt--;
        continue;
      }
      if (/PerDay/i.test(message)) throw new DailyQuotaError(message);
      if (/"code":\s*404|NOT_FOUND/i.test(message)) throw error; // wrong model name: retrying will not help
      if (attempt >= retryWaitsMs.length) throw error;
      const wait = retryWaitsMs[attempt];
      console.log(`  ${model} failed: ${message.slice(0, 160)}`);
      console.log(`  waiting ${wait / 60000} min, then trying again...`);
      await sleep(wait);
    }
  }
}

function readPrompt(): string {
  const md = readFileSync(promptFile, "utf8").replace(/\r\n/g, "\n");
  const section = md.slice(md.indexOf("## 1 promptas"));
  const match = section.match(/```\n([\s\S]*?)```/);
  if (!match)
    throw new Error(`"1 promptas" code block not found in ${promptFile}`);
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
    out.push({
      id,
      url: url.includes("youtube.com/shorts/")
        ? `https://www.youtube.com/shorts/${id}`
        : url,
    });
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
    if (m && !process.env[m[1]])
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
