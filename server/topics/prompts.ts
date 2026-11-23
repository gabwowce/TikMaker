import { z } from "zod";
import { callStructured, type StructuredResult } from "../agent/llm.js";
import type { Signal } from "./collect.js";

// The topic scanner's judgement, in two passes (docs/temos/v2-kriterijai.md):
// 1. candidates – this week's signals grouped into topics that have demand,
//    a takeaway for the viewer and a hook anyone gets;
// 2. judge – each candidate checked against how many videos about it already
//    exist, gated and scored; the best ones become topic cards.
// Fields the creator reads are in Lithuanian, hooks in English (the videos
// are English).

export type Channel = {
  name: string;
  brief: string;
  audience: string;
  direction?: string;
  offTopic?: string[];
  // what the creator has to make videos with (topics.json)
  creator?: string;
};

function channelText(channel: Channel): string {
  const off = channel.offTopic?.length
    ? `\nThe channel does not make:\n${channel.offTopic.map((o) => `- ${o}`).join("\n")}`
    : "";
  const creator = channel.creator ? `\nThe creator: ${channel.creator}` : "";
  return `Channel: ${channel.name}. ${channel.brief}
Audience: ${channel.audience}
Direction: ${channel.direction ?? "(not set)"}${off}${creator}`;
}

const k = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);

// One line per signal – what the model reads and cites by id.
export function signalLine(s: Signal): string {
  switch (s.source) {
    case "youtube": {
      const searched = s.query ? ` · search "${s.query}"` : "";
      const usual =
        s.outlier !== undefined && s.channelUsual !== undefined
          ? ` · ×${s.outlier.toFixed(1)} of the channel's usual ${k(s.channelUsual)}`
          : "";
      const length =
        s.seconds === undefined ? "" : s.seconds <= 180 ? " · short" : ` · ${Math.round(s.seconds / 60)} min`;
      return `${s.id} · "${s.title}" · ${k(s.views ?? 0)} views in ${(s.ageDays ?? 0).toFixed(1)} d (${k(s.viewsPerDay ?? 0)}/day)${usual}${length} · ${s.channel ?? "?"}${searched}`;
    }
    case "trends":
      return `${s.id} · trending search "${s.title}" · ${s.traffic ?? "?"} searches${s.news?.length ? ` · news: ${s.news.join(" / ")}` : ""}`;
    case "hn":
      return `${s.id} · "${s.title}" · ${s.points} points · ${s.comments} comments`;
    case "news":
      return `${s.id} · ${s.feed} · ${s.published?.slice(0, 16) ?? ""} · "${s.title}"`;
  }
}

// ── Pass 1: candidates ───────────────────────────────────────────────────
const CANDIDATES_SYSTEM = `You find topics for a short-video channel (TikTok, Reels, Shorts). You get this week's
signals and group them into candidate video topics for THIS channel's audience. You do not
write videos.

Signals (each has an id you cite):
- Y… videos uploaded this week that people found by searching what this audience searches:
  views, age, views per day, and ×N = how many times the channel's usual views it got
  (×1 = normal for that channel; ×5 and more = the topic itself pulled people in).
- T… Google's trending searches today – what ordinary people look up.
- H… Hacker News stories this week – what tech insiders discuss. They are NOT the audience:
  a story only counts when ordinary people will feel it too.
- N… AI news from the last 7 days.

A candidate needs ALL of:
1. Demand now – evidence people want it this week: videos about it pulling unusual views
   (×3 and more, or big views per day), a trending search, or news ordinary people notice.
   Cite the signal ids. One insider story alone is not demand.
2. A takeaway for the VIEWER – after watching, the viewer can do something new (a tool and
   what it is for, a setting, a prompt, a method, a free alternative) or knows something
   that changes what they do. "AI is impressive" or "someone built X" is not a takeaway.
3. Understandable in 2 seconds by someone who is not a developer.

Never candidates:
- Demos everyone has seen many times: "AI made a game / app / website / animation from one
  prompt", "I built X in N minutes" with nothing else in it.
- General explainers anyone gets from one question ("what is an AI agent").
- Anything in the channel's "does not make" list.
- Topics that only exist inside one video (one creator's opinion, a course, a giveaway).

Prefer topics where several independent signals point the same way; different videos or
news about one thing are ONE candidate. Fewer good candidates beat many weak ones.

Write title, what and takeaway in Lithuanian (the creator reads Lithuanian):
- title: a few words naming the topic;
- what: one or two sentences – what it is or what happened;
- takeaway: what the viewer walks away with, starting "Žiūrovas …".
searchPhrase: English, 2–5 words a viewer would type to find videos about it – it is used
to count how many videos already exist.`;

export const candidatesFromAi = z.object({
  candidates: z
    .array(
      z.object({
        title: z.string(),
        what: z.string(),
        kind: z.enum(["news", "tool", "feature", "method", "trend"]),
        signals: z.array(z.string()),
        takeaway: z.string(),
        searchPhrase: z.string(),
      }),
    )
    .max(15),
});
export type Candidate = z.infer<typeof candidatesFromAi>["candidates"][number];

export function findCandidates(
  channel: Channel,
  signals: Signal[],
  today: string,
): Promise<StructuredResult<z.infer<typeof candidatesFromAi>>> {
  const bySource = (source: Signal["source"], heading: string) => {
    const lines = signals.filter((s) => s.source === source).map(signalLine);
    return lines.length ? `\n${heading}\n${lines.join("\n")}` : "";
  };
  const user = `Today is ${today}.
${channelText(channel)}
${bySource("youtube", "Videos this week (by views per day):")}
${bySource("trends", "Trending searches today:")}
${bySource("hn", "Hacker News this week:")}
${bySource("news", "AI news, last 7 days:")}

Give at most 15 candidates, the strongest first.`;
  return callStructured(candidatesFromAi, { step: "findTopics", system: CANDIDATES_SYSTEM, user });
}

// ── Pass 2: judge ────────────────────────────────────────────────────────
const JUDGE_SYSTEM = `You are the editor who decides which topics this channel makes this week. For each candidate
you get its signals and what is already out there: page one of a YouTube search for it from
the last month, most viewed first (r0, r1… – a search page also has loosely related hits).
Judge every candidate.

sameTopic: the r numbers of the results that really are about this topic (the same tool,
feature or kind of video – not just a word in common). It decides originality: many popular
results about the same thing → crowded.

Gates – any "no" makes the verdict "reject" (say which gate in rejectReason, in Lithuanian):
- takeaway: after watching, can the viewer do or know something concrete (a tool and what it
  is for, a setting, a prompt, a method, a number that changes a decision)?
- not a commodity: would a typical viewer in 2026 NOT think "seen it, so what"? "AI built a
  game / app / website / animation from a description" is a commodity unless there is a twist
  the viewer has not seen.
- on channel: not in "does not make".
- makeable: the creator can make it this week with screen recordings and their own test –
  no studio, no access or hardware they do not have.

Scores – be strict, most topics are not great; give each a one-sentence reason in Lithuanian:
- demand 0–30: how strongly people want it NOW. 25+: several signals, a ×5+ outlier, or
  hundreds of thousands of views per day, or a trending search. Under 12: one weak signal.
- takeaway 0–25: how useful the takeaway is for this audience – would they save or share it?
- hook 0–15: would a non-developer get it in 2 seconds and want to know more?
- originality 0–15: few videos yet, or a clear angle the existing ones miss. Many popular
  videos with the same angle → low.
- freshness 0–15: new this week, or a reason it matters right now.

verdict: "make" when every gate passes and the scores add up to 70 or more; "maybe" for
55–69; otherwise "reject".
For every candidate that is not rejected (Lithuanian unless said otherwise):
- angle: what THIS creator adds that the existing videos do not – their own test with a
  result, a side-by-side, a before/after, a use for creators. Concrete, one or two sentences.
- hook (English, at most 10 words): for a scroller who has never heard of the tool – the
  payoff or the surprise, not the tool's name.
- firstFrame: what is on screen at second 0.
- toRecord: what the creator records or tests to make it.
- whyNow: one sentence.
For a rejected one these can be empty strings.`;

const score = z.object({ points: z.number(), why: z.string() });
export const judgedFromAi = z.object({
  topics: z.array(
    z.object({
      index: z.number().int(),
      verdict: z.enum(["make", "maybe", "reject"]),
      rejectReason: z.string(),
      scores: z.object({
        demand: score,
        takeaway: score,
        hook: score,
        originality: score,
        freshness: score,
      }),
      sameTopic: z.array(z.number().int()),
      angle: z.string(),
      hook: z.string(),
      firstFrame: z.string(),
      toRecord: z.string(),
      whyNow: z.string(),
    }),
  ),
});
export type Judged = z.infer<typeof judgedFromAi>["topics"][number];

// One result of the "already out there" search, most viewed first.
export type Existing = { title: string; views?: number; ageDays?: number; channel?: string };

export function judgeCandidates(
  channel: Channel,
  candidates: Candidate[],
  signals: Signal[],
  existing: Existing[][],
  today: string,
): Promise<StructuredResult<z.infer<typeof judgedFromAi>>> {
  const byId = new Map(signals.map((s) => [s.id, s]));
  const blocks = candidates.map((c, i) => {
    const lines = c.signals
      .map((id) => byId.get(id))
      .filter((s): s is Signal => Boolean(s))
      .map((s) => `  ${signalLine(s)}`);
    const results = existing[i] ?? [];
    const out = results.map(
      (v, r) => `  r${r} · "${v.title}" · ${k(v.views ?? 0)} views · ${(v.ageDays ?? 0).toFixed(0)} d · ${v.channel ?? "?"}`,
    );
    return `#${i} ${c.title} (${c.kind})
What: ${c.what}
Takeaway: ${c.takeaway}
Signals:
${lines.join("\n") || "  (none)"}
${
  out.length
    ? `Already out there (search "${c.searchPhrase}", last month):\n${out.join("\n")}`
    : `Already out there (search "${c.searchPhrase}"): the search returned nothing – unknown, not proof that nobody made it; judge originality from the signals.`
}`;
  });
  const user = `Today is ${today}.
${channelText(channel)}

Candidates:

${blocks.join("\n\n")}

Judge every candidate (index = the # number).`;
  return callStructured(judgedFromAi, { step: "findTopics", system: JUDGE_SYSTEM, user });
}
