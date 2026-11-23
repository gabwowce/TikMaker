import { config as loadEnv } from "dotenv";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  channelUsualViews,
  hackerNews,
  newsFeed,
  searchYouTube,
  trendingSearches,
  YT_THIS_MONTH,
  YT_THIS_WEEK,
  type Signal,
  type YouTubeVideo,
} from "../server/topics/collect";
import {
  findCandidates,
  judgeCandidates,
  type Candidate,
  type Channel,
  type Existing,
  type Judged,
} from "../server/topics/prompts";

// Usage: npm run topics:scan [-- --workspace dev] [-- --rejudge]
//   --rejudge: keep today's signals and candidates (db/topics/<date>.json),
//   redo only the "already out there" check and the judging.
//
// Topic scanner v2 (docs/temos/v2-kriterijai.md). Reads what people watch,
// search and read about AI this week, asks Claude for topics with demand, a
// takeaway for the viewer and a hook anyone gets, checks how many videos
// about each one already exist, then gates and scores them. Writes:
//   docs/temos/<date>-temos.md – the cards, to read and pick from
//   db/topics/<date>.json      – everything, for a Topics tab later
// Claude runs the same way as in the video agent (AGENT_PROVIDER, .env.local).
// The settings per channel: knowledge/workspaces/<id>/topics.json.

loadEnv({ path: path.resolve(".env.local") });

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const workspaceId = arg("workspace", "dev");
const folder = path.join("knowledge/workspaces", workspaceId);
const workspace = JSON.parse(readFileSync(path.join(folder, "workspace.json"), "utf8"));
const settings = JSON.parse(readFileSync(path.join(folder, "topics.json"), "utf8")) as {
  creator?: string;
  youtubeQueries: string[];
  trendsGeo: string[];
  hnQueries: string[];
  newsFeeds: { name: string; url: string }[];
};
const channel: Channel = {
  name: workspace.name,
  brief: workspace.brief,
  audience: workspace.audience,
  direction: workspace.direction,
  offTopic: workspace.offTopic,
  creator: settings.creator,
};

const today = new Date().toISOString().slice(0, 10);
const weekAgo = Date.now() - 7 * 86_400_000;
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));
const log = (...parts: unknown[]) => console.log(...parts);

// A source that fails (network, a changed page) is skipped, not fatal.
async function quietly<T>(what: string, work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    log(`  ! ${what}: ${(error as Error).message.split("\n")[0]}`);
    return fallback;
  }
}

async function inBatches<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size)
    await Promise.all(items.slice(i, i + size).map(work));
}

// ── 1. Signals ───────────────────────────────────────────────────────────
async function youtubeSignals(): Promise<Signal[]> {
  const found = new Map<string, YouTubeVideo & { query: string }>();
  for (const query of settings.youtubeQueries) {
    const videos = await quietly(`YouTube "${query}"`, () => searchYouTube(query, YT_THIS_WEEK), []);
    for (const video of videos)
      if (!found.has(video.videoId)) found.set(video.videoId, { ...video, query });
    await pause(300);
  }
  const fresh = [...found.values()]
    .filter((v) => (v.ageDays ?? 99) <= 8 && (v.views ?? 0) >= 10_000)
    .map((v) => ({ ...v, viewsPerDay: (v.views ?? 0) / Math.max(v.ageDays ?? 1, 0.5) }))
    .sort((a, b) => b.viewsPerDay - a.viewsPerDay)
    .slice(0, 70);
  log(`  YouTube: ${found.size} videos from ${settings.youtubeQueries.length} searches, ${fresh.length} from this week with 10K+ views`);

  // what each channel usually gets, for the same kind of video
  const usual = new Map<string, number | undefined>();
  const key = (v: YouTubeVideo) => `${v.channelId}:${(v.seconds ?? 999) <= 180 ? "short" : "long"}`;
  const keys = [...new Set(fresh.filter((v) => v.channelId).map(key))];
  await inBatches(keys, 4, async (k) => {
    const [channelId, kind] = k.split(":");
    usual.set(k, await quietly(`channel ${channelId}`, () => channelUsualViews(channelId, kind === "short"), undefined));
  });

  return fresh
    .map((v) => {
      const channelUsual = v.channelId ? usual.get(key(v)) : undefined;
      const outlier = channelUsual ? (v.views ?? 0) / Math.max(channelUsual, 1) : undefined;
      return {
        id: "",
        source: "youtube" as const,
        title: v.title,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        channel: v.channel,
        channelId: v.channelId,
        views: v.views,
        ageDays: v.ageDays,
        seconds: v.seconds,
        viewsPerDay: Math.round(v.viewsPerDay),
        channelUsual,
        outlier,
        query: v.query,
      };
    })
    // the topic pulled people in (outlier) counts as much as raw reach
    .sort(
      (a, b) =>
        b.viewsPerDay * Math.sqrt(Math.min(Math.max(b.outlier ?? 1, 0.3), 50)) -
        a.viewsPerDay * Math.sqrt(Math.min(Math.max(a.outlier ?? 1, 0.3), 50)),
    )
    .slice(0, 55);
}

async function trendSignals(): Promise<Signal[]> {
  const seen = new Set<string>();
  const out: Signal[] = [];
  for (const geo of settings.trendsGeo)
    for (const item of await quietly(`Google Trends ${geo}`, () => trendingSearches(geo), [])) {
      if (seen.has(item.title.toLowerCase())) continue;
      seen.add(item.title.toLowerCase());
      out.push({ id: "", source: "trends", title: item.title, url: item.url, traffic: `${item.traffic} (${geo})`, news: item.news });
    }
  return out;
}

async function hnSignals(): Promise<Signal[]> {
  const since = Math.floor(weekAgo / 1000);
  const hits = new Map<string, Signal>();
  for (const query of settings.hnQueries)
    for (const hit of await quietly(`HN "${query}"`, () => hackerNews(query, since, 150), []))
      hits.set(hit.objectID, {
        id: "",
        source: "hn",
        title: hit.title,
        url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        points: hit.points,
        comments: hit.num_comments,
      });
  return [...hits.values()].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 25);
}

async function newsSignals(): Promise<Signal[]> {
  const out: Signal[] = [];
  for (const feed of settings.newsFeeds) {
    const items = await quietly(feed.name, () => newsFeed(feed.url), []);
    const recent = items.filter((item) => {
      const at = Date.parse(item.published);
      return Number.isFinite(at) && at >= weekAgo;
    });
    for (const item of recent.slice(0, 12))
      out.push({ id: "", source: "news", title: item.title, url: item.url, feed: feed.name, published: item.published });
  }
  return out;
}

// ── 2. The cards ─────────────────────────────────────────────────────────
const MAX = { demand: 30, takeaway: 25, hook: 15, originality: 15, freshness: 15 } as const;

// existing: page one of the "already out there" search; sameTopic (from the
// judge) says which of those results are really about the topic
type Topic = Candidate & Judged & { total: number; existing: Existing[]; evidence: Signal[] };

function settle(judged: Judged): { total: number; verdict: Judged["verdict"]; rejectReason: string } {
  const total = (Object.keys(MAX) as (keyof typeof MAX)[]).reduce(
    (sum, part) => sum + Math.max(0, Math.min(MAX[part], Math.round(judged.scores[part].points))),
    0,
  );
  if (judged.verdict === "reject" || judged.rejectReason.trim())
    return { total, verdict: "reject", rejectReason: judged.rejectReason.trim() || "Neperėjo patikros." };
  if (total >= 70) return { total, verdict: "make", rejectReason: "" };
  if (total >= 55) return { total, verdict: "maybe", rejectReason: "" };
  return { total, verdict: "reject", rejectReason: `Per mažas balas (${total}).` };
}

const fmt = (n: number | undefined) =>
  n === undefined ? "?" : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);
const clean = (s: string) => s.replace(/[[\]]/g, "").replace(/\s+/g, " ").trim();

function evidenceLine(s: Signal): string {
  switch (s.source) {
    case "youtube": {
      const usual = s.outlier !== undefined ? ` (×${s.outlier.toFixed(1)} nuo kanalo įprastų ${fmt(s.channelUsual)})` : "";
      const length = s.seconds === undefined ? "" : s.seconds <= 180 ? ", trumpas" : `, ${Math.round(s.seconds / 60)} min`;
      return `▶ [${clean(s.title)}](${s.url}) – ${fmt(s.views)} per ${Math.max(1, Math.round(s.ageDays ?? 1))} d.${usual}${length} · ${s.channel ?? ""}`;
    }
    case "trends":
      return `🔎 Google paieškos tendencija „${s.title}“ – ${s.traffic} paieškų${s.news?.[0] ? ` · „${clean(s.news[0])}“` : ""}`;
    case "hn":
      return `💬 Hacker News: [${clean(s.title)}](${s.url}) – ${s.points} tšk., ${s.comments} komentarų`;
    case "news": {
      const at = Date.parse(s.published ?? "");
      return `📰 ${s.feed}: [${clean(s.title)}](${s.url})${Number.isFinite(at) ? ` (${new Date(at).toISOString().slice(0, 10)})` : ""}`;
    }
  }
}

function card(topic: Topic, n: number): string {
  const s = topic.scores;
  const about = [...new Set(topic.sameTopic)]
    .map((r) => topic.existing[r])
    .filter((v): v is Existing => Boolean(v))
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const big = about.filter((v) => (v.views ?? 0) >= 100_000).length;
  const top = about[0];
  const existing = topic.existing.length
    ? `${about.length} iš ${topic.existing.length} paieškos „${topic.searchPhrase}“ rezultatų per mėnesį – apie tai, ${big} iš jų su 100K+ peržiūrų${top ? `; populiariausias – „${clean(top.title)}“ (${fmt(top.views)})` : ""}`
    : `paieška „${topic.searchPhrase}“ nieko negrąžino – nežinoma`;
  return `### ${n}. ${topic.title} — **${topic.total}**

${topic.what}

- **Ką žiūrovas pasiims:** ${topic.takeaway}
- **Kodėl dabar:** ${topic.whyNow}
- **Mūsų kampas:** ${topic.angle}
- **Hook:** „${topic.hook}“
- **Pirmas kadras:** ${topic.firstFrame}
- **Ką įrašyti / išbandyti:** ${topic.toRecord}
- **Jau yra:** ${existing}
- **Balas:** paklausa ${s.demand.points}/30 · nauda ${s.takeaway.points}/25 · hook ${s.hook.points}/15 · originalumas ${s.originality.points}/15 · šviežumas ${s.freshness.points}/15
  - paklausa – ${s.demand.why}
  - nauda – ${s.takeaway.why}
  - hook – ${s.hook.why}
  - originalumas – ${s.originality.why}
  - šviežumas – ${s.freshness.why}

Įrodymai:
${topic.evidence.map((e) => `- ${evidenceLine(e)}`).join("\n") || "- (nėra)"}
`;
}

function report(topics: Topic[], counts: Record<string, number>): string {
  const make = topics.filter((t) => t.verdict === "make").sort((a, b) => b.total - a.total);
  const maybe = topics.filter((t) => t.verdict === "maybe").sort((a, b) => b.total - a.total);
  const rejected = topics.filter((t) => t.verdict === "reject");
  let n = 0;
  const cell = (s: string) => s.replace(/\|/g, "/");
  const summary = [...make, ...maybe]
    .map((t, i) => `| ${i + 1} | ${cell(t.title)} | **${t.total}** | ${t.verdict === "make" ? "daryti" : "gal"} | ${cell(t.hook)} |`)
    .join("\n");
  return `# Temos – ${today} (skeneris v2)

Surinkta automatiškai: \`npm run topics:scan\`. Šaltiniai: YouTube – ${counts.youtube} šios
savaitės video iš ${settings.youtubeQueries.length} paieškų (palyginta su kanalų įprastomis
peržiūromis), Google paieškų tendencijos (${settings.trendsGeo.join(", ")}) – ${counts.trends},
Hacker News – ${counts.hn}, AI naujienos – ${counts.news}. Kriterijai ir balas –
[v2-kriterijai.md](v2-kriterijai.md). Skaičiai įrodymuose – iš šaltinių, ne iš modelio.

| # | Tema | Balas | | Hook |
| --- | --- | --- | --- | --- |
${summary || "| – | Šią savaitę nieko verto | | | |"}

## Daryti

${make.map((t) => card(t, ++n)).join("\n") || "Šią savaitę nė viena tema nesurinko 70 balų.\n"}
## Gal

${maybe.map((t) => card(t, ++n)).join("\n") || "Nėra.\n"}
## Atmesta

${rejected.map((t) => `- **${t.title}** (${t.total}) – ${t.rejectReason}`).join("\n") || "Nėra."}
`;
}

// ── Run ──────────────────────────────────────────────────────────────────
log(`Topic scan ${today} · workspace ${workspaceId}`);
mkdirSync("db/topics", { recursive: true });
const jsonFile = path.join("db/topics", `${today}.json`);

let signals: Signal[];
let candidates: Candidate[];
let counts: Record<string, number>;
if (process.argv.includes("--rejudge")) {
  const saved = JSON.parse(readFileSync(jsonFile, "utf8"));
  ({ signals, candidates, counts } = saved);
  log(`1–2/4 Reusing today's ${signals.length} signals and ${candidates.length} candidates`);
} else {
  log("1/4 Collecting signals…");
  const [youtube, trends, hn, news] = [
    await youtubeSignals(),
    await trendSignals(),
    await hnSignals(),
    await newsSignals(),
  ];
  const number = (list: Signal[], prefix: string) => list.forEach((s, i) => (s.id = `${prefix}${i + 1}`));
  number(youtube, "Y");
  number(trends, "T");
  number(hn, "H");
  number(news, "N");
  signals = [...youtube, ...trends, ...hn, ...news];
  counts = { youtube: youtube.length, trends: trends.length, hn: hn.length, news: news.length };
  log(`  signals: ${JSON.stringify(counts)}`);

  log("2/4 Claude: candidates…");
  const first = await findCandidates(channel, signals, today);
  candidates = first.data.candidates;
  log(`  ${candidates.length} candidates (${Math.round(first.ms / 1000)} s)`);
}

log("3/4 Checking what already exists…");
const existing: Existing[][] = [];
for (const candidate of candidates) {
  const videos = await quietly(`YouTube "${candidate.searchPhrase}"`, () => searchYouTube(candidate.searchPhrase, YT_THIS_MONTH), []);
  existing.push(
    videos
      .slice(0, 15)
      .map((v) => ({ title: v.title, views: v.views, ageDays: v.ageDays, channel: v.channel })),
  );
  await pause(300);
}

log("4/4 Claude: judging…");
const second = await judgeCandidates(channel, candidates, signals, existing, today);
const byId = new Map(signals.map((s) => [s.id, s]));
const topics: Topic[] = second.data.topics
  .filter((j) => candidates[j.index])
  .map((judged) => {
    const candidate = candidates[judged.index];
    const settled = settle(judged);
    return {
      ...candidate,
      ...judged,
      ...settled,
      existing: existing[judged.index] ?? [],
      evidence: candidate.signals.map((id) => byId.get(id)).filter((s): s is Signal => Boolean(s)),
    };
  });
log(`  ${topics.filter((t) => t.verdict === "make").length} to make, ${topics.filter((t) => t.verdict === "maybe").length} maybe, ${topics.filter((t) => t.verdict === "reject").length} rejected (${Math.round(second.ms / 1000)} s)`);

writeFileSync(
  jsonFile,
  JSON.stringify({ createdAt: new Date().toISOString(), workspaceId, counts, signals, candidates, existing, topics }, null, 2),
);
const mdFile = path.join("docs/temos", `${today}-temos.md`);
writeFileSync(mdFile, report(topics, counts));
log(`Done: ${mdFile} · ${jsonFile}`);
