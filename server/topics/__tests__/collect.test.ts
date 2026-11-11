import { describe, expect, it } from "vitest";
import {
  channelViewCounts,
  feedItems,
  initialData,
  median,
  parseAgeDays,
  parseCount,
  parseLength,
  searchResults,
  trendsItems,
} from "../collect.js";

// The pages are trimmed copies of what YouTube, Google Trends and the feeds
// send: only the parts the scanner reads.
const page = (data: object) =>
  `<html><script>var ytInitialData = ${JSON.stringify(data)};</script></html>`;

describe("topic scanner readers", () => {
  it("reads counts, ages and lengths the way YouTube writes them", () => {
    expect(parseCount("1,234,567 views")).toBe(1234567);
    expect(parseCount("403K")).toBe(403000);
    expect(parseCount("1.2M views")).toBe(1200000);
    expect(parseCount("No views")).toBe(0);
    expect(parseAgeDays("2d ago")).toBe(2);
    expect(parseAgeDays("3 days ago")).toBe(3);
    expect(parseAgeDays("Streamed 6 hours ago")).toBeCloseTo(0.25);
    expect(parseAgeDays("1mo ago")).toBe(30);
    expect(parseAgeDays("2w ago")).toBe(14);
    expect(parseAgeDays("30m ago")).toBeCloseTo(30 / 1440);
    expect(parseLength("7:20")).toBe(440);
    expect(parseLength("1:02:03")).toBe(3723);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([])).toBeUndefined();
  });

  it("finds search results wherever YouTube nests them", () => {
    const html = page({
      contents: {
        sections: [
          {
            items: [
              {
                videoRenderer: {
                  videoId: "abc",
                  title: { runs: [{ text: "I Tried Making a Viral Video" }] },
                  ownerText: { runs: [{ text: "ReachMora", navigationEndpoint: { browseEndpoint: { browseId: "UC1" } } }] },
                  viewCountText: { simpleText: "403,763 views" },
                  publishedTimeText: { simpleText: "6d ago" },
                  lengthText: { simpleText: "7:20" },
                },
              },
            ],
          },
        ],
      },
    });
    expect(initialData("<html></html>")).toBeNull();
    expect(searchResults(html)).toEqual([
      { videoId: "abc", title: "I Tried Making a Viral Video", channel: "ReachMora", channelId: "UC1", views: 403763, ageDays: 6, seconds: 440 },
    ]);
  });

  it("reads a channel's view counts from the old and the new layout", () => {
    const html = page({
      tabs: [
        { shortsLockupViewModel: { overlayMetadata: { secondaryText: { content: "1.2M views" } } } },
        {
          lockupViewModel: {
            metadata: {
              metadataRows: [{ metadataParts: [{ text: { content: "6.2K" }, accessibilityLabel: "6.2 thousand views" }, { text: { content: "2 weeks ago" } }] }],
            },
          },
        },
      ],
    });
    expect(channelViewCounts(html)).toEqual([1200000, 6200]);
  });

  it("reads trending searches and news feeds", () => {
    const trends = `<rss><item><title>chatgpt</title><ht:approx_traffic>200,000+</ht:approx_traffic>
      <ht:news_item><ht:news_item_title><![CDATA[OpenAI adds &amp; more]]></ht:news_item_title><ht:news_item_url>https://x.test/a</ht:news_item_url></ht:news_item></item></rss>`;
    expect(trendsItems(trends)).toEqual([
      { title: "chatgpt", traffic: "200,000+", news: ["OpenAI adds & more"], url: "https://x.test/a" },
    ]);
    const rss = `<rss><channel><item><title>New model</title><link>https://n.test/1</link><pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    expect(feedItems(rss)).toEqual([{ title: "New model", url: "https://n.test/1", published: "Mon, 09 Nov 2026 10:00:00 GMT" }]);
    const atom = `<feed><entry><title>Atom post</title><link rel="alternate" href="https://a.test/2"/><updated>2026-11-08T09:00:00Z</updated></entry></feed>`;
    expect(feedItems(atom)).toEqual([{ title: "Atom post", url: "https://a.test/2", published: "2026-11-08T09:00:00Z" }]);
  });
});
