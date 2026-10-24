import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Usage: npm run videos:stats [-- --force]
//
// Fills manual.views, manual.author and manual.publishedAt in
// docs/bd/analizes/<videoId>.json from the public YouTube watch page.
// Only files without views are updated unless --force is given; values typed
// in by hand (author, publishedAt) are never overwritten.
// curl is used instead of fetch because it goes through the HTTPS proxy.

const outDir = "docs/bd/analizes";
const force = process.argv.includes("--force");
const today = new Date().toISOString().slice(0, 10);

let done = 0;
const failed: string[] = [];
for (const name of readdirSync(outDir).filter((f) => f.endsWith(".json")).sort()) {
  const file = join(outDir, name);
  const data = JSON.parse(readFileSync(file, "utf8"));
  const manual = data.manual ?? {};
  if (!force && typeof manual.views === "number") continue;
  const id = name.replace(/\.json$/, "");
  try {
    const stats = fetchStats(id);
    data.manual = {
      ...manual,
      author: manual.author || stats.author,
      views: stats.views,
      viewsCollectedAt: today,
      publishedAt: manual.publishedAt || stats.publishedAt,
    };
    writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
    done += 1;
    console.log(`${id}: ${stats.views} views, ${stats.author}, ${stats.publishedAt}`);
  } catch (error) {
    failed.push(`${id}: ${(error as Error).message}`);
  }
}

console.log(`\n${done} updated, ${failed.length} failed`);
if (failed.length) console.log(failed.join("\n"));

function fetchStats(id: string): { views: number; author: string; publishedAt: string } {
  // YouTube sometimes answers with a page without data: try a few times, slower each time
  for (let attempt = 1; ; attempt++) {
    try {
      return parseStats(fetchPage(id));
    } catch (error) {
      if (attempt === 5) throw error;
      execFileSync("sleep", [String(attempt * 5)]);
    }
  }
}

function fetchPage(id: string): string {
  return execFileSync(
    "curl",
    ["-sSL", "-A", "Mozilla/5.0", "-H", "Accept-Language: en", `https://www.youtube.com/watch?v=${id}`],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
}

function parseStats(html: string): { views: number; author: string; publishedAt: string } {
  const views = html.match(/"originalViewCount":"(\d+)"/)?.[1];
  if (!views) throw new Error("view count not found");
  const author = html.match(/"videoOwnerRenderer":\{.*?"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/)?.[1] ?? "";
  const date = html.match(/"dateText":\{"simpleText":"([^"]+)"/)?.[1] ?? "";
  const parsed = new Date(`${date} UTC`);
  return {
    views: Number(views),
    author: JSON.parse(`"${author}"`),
    publishedAt: Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10),
  };
}
