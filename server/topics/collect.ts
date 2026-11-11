import { execFile } from "node:child_process";
import { promisify } from "node:util";

// The topic scanner's eyes: what people are watching, searching and reading
// about THIS week. Everything here is free and needs no key – YouTube search
// pages, Google's trending-searches feed, the Hacker News search API and news
// RSS. Reddit blocks scripts and TikTok search needs a paid scraper
// (docs/temos/C-api-kaina.md), so short-form demand is read from YouTube:
// short videos uploaded this week, sorted by views, compared with what the
// same channel usually gets.

const run = promisify(execFile);
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

// curl, not fetch: it goes through the machine's HTTPS proxy (as in
// scripts/fetchVideoStats.ts).
export async function get(url: string, timeoutSec = 25): Promise<string> {
  const { stdout } = await run(
    "curl",
    [
      "-sL",
      "--compressed",
      "--max-time",
      String(timeoutSec),
      "-A",
      UA,
      "-H",
      "Accept-Language: en-US,en;q=0.9",
      "-H",
      "Cookie: CONSENT=YES+1; SOCS=CAI",
      url,
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  return stdout;
}

export type Signal = {
  // How the model cites it: Y… YouTube, T… trending search, H… Hacker
  // News, N… news.
  id: string;
  source: "youtube" | "trends" | "hn" | "news";
  title: string;
  url: string;
  // youtube
  channel?: string;
  channelId?: string;
  views?: number;
  ageDays?: number;
  seconds?: number;
  viewsPerDay?: number;
  // the channel's usual views (median of its recent videos) and how many
  // times this video beat it – the topic, not the channel's size, pulled
  // people in when it is high
  channelUsual?: number;
  outlier?: number;
  query?: string;
  // trends
  traffic?: string;
  news?: string[];
  // hn
  points?: number;
  comments?: number;
  // news
  feed?: string;
  published?: string;
};

// ── YouTube ──────────────────────────────────────────────────────────────
// Search filters (the `sp` parameter): videos sorted by view count, uploaded
// this week / this month. (The "under 4 minutes" filter leaves only a handful
// of results on the first page, so the length is kept per video instead.)
export const YT_THIS_WEEK = "CAMSBAgDEAE%3D";
export const YT_THIS_MONTH = "CAMSBAgEEAE%3D";

export type YouTubeVideo = {
  videoId: string;
  title: string;
  channel?: string;
  channelId?: string;
  views?: number;
  ageDays?: number;
  seconds?: number;
};

// The JSON a YouTube page carries for its own scripts.
export function initialData(html: string): unknown {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const from = start + marker.length;
  const end = html.indexOf(";</script>", from);
  if (end < 0) return null;
  try {
    return JSON.parse(html.slice(from, end));
  } catch {
    return null;
  }
}

// Every value under `key`, however deep: YouTube moves its renderers around,
// so they are found by name, not by path.
function* under(node: unknown, key: string): Generator<Record<string, unknown>> {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) yield* under(item, key);
    return;
  }
  for (const [k, value] of Object.entries(node)) {
    if (k === key && value && typeof value === "object")
      yield value as Record<string, unknown>;
    yield* under(value, key);
  }
}

type Text = { simpleText?: string; runs?: { text: string }[] } | undefined;
const text = (t: unknown): string => {
  const value = t as Text;
  return value?.simpleText ?? value?.runs?.map((r) => r.text).join("") ?? "";
};

// "1,234,567 views", "1.2M views", "No views" → a number.
export function parseCount(label: string | undefined): number | undefined {
  if (!label) return undefined;
  if (/no views/i.test(label)) return 0;
  const m = label.replace(/,/g, "").match(/([\d.]+)\s*([KMB])?\b/i);
  if (!m) return undefined;
  const unit = m[2]?.toUpperCase();
  const times = unit === "K" ? 1e3 : unit === "M" ? 1e6 : unit === "B" ? 1e9 : 1;
  return Math.round(parseFloat(m[1]) * times);
}

// "3 days ago", "2d ago", "1mo ago", "Streamed 5 hours ago" → days.
export function parseAgeDays(label: string | undefined): number | undefined {
  const m = label?.match(
    /(\d+)\s*(mo|months?|y|years?|w|weeks?|d|days?|h|hours?|m|min|minutes?|s|seconds?)\b/i,
  );
  if (!m) return undefined;
  const unit = m[2].toLowerCase();
  const days = unit.startsWith("mo")
    ? 30
    : unit.startsWith("y")
      ? 365
      : unit.startsWith("w")
        ? 7
        : unit.startsWith("d")
          ? 1
          : unit.startsWith("h")
            ? 1 / 24
            : unit.startsWith("m")
              ? 1 / 1440
              : 1 / 86400;
  return Number(m[1]) * days;
}

// "1:02:03" / "0:45" → seconds.
export function parseLength(label: string | undefined): number | undefined {
  if (!label || !/^\d+(:\d+)+$/.test(label.trim())) return undefined;
  return label
    .trim()
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
}

export function searchResults(html: string): YouTubeVideo[] {
  const seen = new Set<string>();
  const videos: YouTubeVideo[] = [];
  for (const v of under(initialData(html), "videoRenderer")) {
    const videoId = v.videoId as string | undefined;
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    const owner = (v.ownerText as { runs?: { text: string; navigationEndpoint?: { browseEndpoint?: { browseId?: string } } }[] } | undefined)?.runs?.[0];
    videos.push({
      videoId,
      title: text(v.title),
      channel: owner?.text,
      channelId: owner?.navigationEndpoint?.browseEndpoint?.browseId,
      views: parseCount(text(v.viewCountText)),
      ageDays: parseAgeDays(text(v.publishedTimeText)),
      seconds: parseLength(text(v.lengthText)),
    });
  }
  return videos;
}

export async function searchYouTube(query: string, sp: string): Promise<YouTubeVideo[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${sp}&hl=en&gl=US`;
  return searchResults(await get(url));
}

// View counts of a channel's recent videos, from its Shorts or Videos tab.
export function channelViewCounts(html: string): number[] {
  const data = initialData(html);
  const counts: number[] = [];
  for (const s of under(data, "shortsLockupViewModel")) {
    const label = (s.overlayMetadata as { secondaryText?: { content?: string } } | undefined)?.secondaryText?.content;
    const n = parseCount(label);
    if (n !== undefined) counts.push(n);
  }
  for (const r of under(data, "reelItemRenderer")) {
    const n = parseCount(text(r.viewCountText));
    if (n !== undefined) counts.push(n);
  }
  for (const v of under(data, "videoRenderer")) {
    const n = parseCount(text(v.viewCountText));
    if (n !== undefined) counts.push(n);
  }
  // the newer layout: "403K" with the label "403 thousand views"
  for (const lockup of under(data, "lockupViewModel")) {
    for (const parts of under(lockup, "metadataRows")) {
      const rows = Array.isArray(parts) ? parts : [];
      for (const row of rows as { metadataParts?: { text?: { content?: string }; accessibilityLabel?: string }[] }[])
        for (const part of row.metadataParts ?? [])
          if (/view/i.test(part.accessibilityLabel ?? "")) {
            const n = parseCount(part.text?.content);
            if (n !== undefined) counts.push(n);
          }
    }
  }
  return counts;
}

export function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// What a channel usually gets: the median of its recent videos of the same
// kind – Shorts for a short video, long videos for a long one – or of the
// other kind when it has too few.
export async function channelUsualViews(
  channelId: string,
  short: boolean,
): Promise<number | undefined> {
  for (const tab of short ? ["shorts", "videos"] : ["videos", "shorts"]) {
    const counts = channelViewCounts(
      await get(`https://www.youtube.com/channel/${channelId}/${tab}?hl=en&gl=US`),
    ).slice(0, 30);
    if (counts.length >= 3) return median(counts);
  }
  return undefined;
}

// ── Google Trends: today's trending searches (RSS) ───────────────────────
const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
const tag = (xml: string, name: string) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : "";
};

export function trendsItems(xml: string) {
  return xml
    .split("<item>")
    .slice(1)
    .map((item) => ({
      title: tag(item, "title"),
      traffic: tag(item, "ht:approx_traffic"),
      news: [...item.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)]
        .map((m) => decode(m[1]))
        .slice(0, 2),
      url: tag(item, "ht:news_item_url"),
    }));
}

export async function trendingSearches(geo: string) {
  return trendsItems(await get(`https://trends.google.com/trending/rss?geo=${geo}`));
}

// ── Hacker News (Algolia search API) ─────────────────────────────────────
type HnHit = { objectID: string; title: string; points: number; num_comments: number; url?: string };

export async function hackerNews(query: string, sinceSec: number, minPoints: number) {
  const url = `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(query)}&numericFilters=${encodeURIComponent(`created_at_i>${sinceSec},points>${minPoints}`)}&hitsPerPage=30`;
  const answer = JSON.parse(await get(url)) as { hits?: HnHit[] };
  return answer.hits ?? [];
}

// ── News feeds (RSS or Atom) ─────────────────────────────────────────────
export function feedItems(xml: string) {
  const blocks = xml.includes("<entry") ? xml.split(/<entry[\s>]/).slice(1) : xml.split(/<item[\s>]/).slice(1);
  return blocks.map((block) => {
    const href = block.match(/<link[^>]*href="([^"]+)"/)?.[1];
    return {
      title: tag(block, "title"),
      url: href ?? tag(block, "link"),
      published: tag(block, "pubDate") || tag(block, "published") || tag(block, "updated"),
    };
  });
}

export async function newsFeed(url: string) {
  return feedItems(await get(url));
}
