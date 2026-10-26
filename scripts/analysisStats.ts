import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Usage: npm run analysis:stats
//
// Stage 2 of docs/bd/video-analizes-promptas.md: reads every analysis in
// docs/bd/analizes/, checks each token field against the prompt's dictionary
// and computes the numbers an LLM would get wrong (medians, p90, frequencies).
// Output: docs/bd/analizes-statistika.md (for the thesis) and
// docs/bd/analizes-statistika.json (for the rules and prompt 3).

const dir = "docs/bd/analizes";
const outMd = "docs/bd/analizes-statistika.md";
const outJson = "docs/bd/analizes-statistika.json";

const tokens = {
  format: ["explainer", "story", "demo", "facts", "other"],
  role: ["hook", "setup", "problem", "mechanism", "reveal", "demo", "proof", "benefit", "payoff", "cta", "bridge", "other"],
  hookType: ["contrarian", "pain-shown", "result-first", "curiosity-gap", "question", "list", "story", "pov", "news", "explained-in-time", "shock-fact", "other"],
  ctaType: ["follow", "comment-keyword", "lead-magnet", "next-part", "save-share", "link", "question", "other", "none"],
  background: ["solid", "gradient", "texture", "pattern", "photo", "video", "blurred", "illustrated-scene", "none", "other"],
  elementKind: ["kinetic-text", "label", "photo", "illustration", "3d-object", "icon", "character", "diagram", "chart-stat", "screen-recording", "screenshot", "ui-mockup", "stock-footage", "movie-clip", "meme", "talking-head", "other"],
  origin: ["ai-generated", "stock", "screenshot", "movie-tv", "hand-drawn", "3d-render", "brand-asset", "unknown"],
  motion: ["static", "zoom-in", "zoom-out", "pan", "pop-in", "slide-in", "fade-in", "rotate", "float", "shake", "typewriter", "draw-on", "character-animation", "other"],
  transition: ["cut", "slide", "zoom", "fade", "whip", "match-cut", "other"],
  position: ["top", "center", "bottom", "left", "right", "full-screen"],
  screenShare: ["small", "medium", "large", "full"],
  emphasis: ["color", "box", "bigger", "motion", "none"],
  act: ["opening", "build", "core", "climax", "close"],
  connection: ["question-answer", "escalation", "contrast", "cause-effect", "example", "sequence", "open-loop-payoff", "callback", "bridge", "none", "other"],
  sfxType: ["whoosh", "pop", "click", "typing", "ding", "notification", "riser", "impact", "bass-drop", "glitch", "swipe", "camera-shutter", "cash", "record-scratch", "reaction", "ambient", "musical", "other"],
  sfxGroup: ["transition", "ui", "impact", "reveal", "success", "other"],
  syncedTo: ["transition", "text-appears", "element-appears", "number-reveal", "punchline", "emphasis-word", "scene-start", "other"],
  confidence: ["high", "medium", "low"],
  captionStyle: ["word-by-word", "phrase", "full-sentence", "none"],
  // prompt v2+
  continuity: ["new-scene", "same-subject-zoom", "carry-element", "match-cut", "same-frame-update", "none"],
  zone: ["top", "upper-middle", "middle", "lower-middle", "bottom", "full"],
  textSize: ["hero", "large", "medium", "small"],
  emphasisStyle: ["color", "box", "pill", "bigger", "bold", "underline", "glow", "none"],
  visualEffect: ["glow", "shadow", "blur-background", "highlight-box", "outline", "flash", "color-shift", "grain", "vignette", "other"],
  compositionType: ["hook-text", "number-hero", "list", "comparison", "screen-with-text", "media-only", "character-with-text", "diagram", "quote", "cta", "other"],
} as const;
type TokenField = keyof typeof tokens;

type Sfx = { type?: string; group?: string; atSeconds?: number; syncedTo?: string; confidence?: string };
type Element = { kind?: string; origin?: string; position?: string; zone?: string; screenShare?: string; motion?: string; during?: string; visualEffects?: string[]; recreate?: { essence?: string; matchesNarration?: boolean } };
type TextBlock = { zone?: string; size?: string; emphasisStyle?: string; text?: string };
type Beat = {
  role?: string; startSeconds?: number; endSeconds?: number; voiceover?: string; onScreenText?: string;
  background?: { type?: string; recreate?: { essence?: string; matchesNarration?: boolean } };
  elements?: Element[]; simultaneousElements?: number; transitionIn?: string; emphasis?: string;
  act?: string; connectionToNext?: string; continuityToNext?: string; soundEffects?: Sfx[];
  composition?: { type?: string; textBlocks?: TextBlock[]; whitespace?: string };
};
type Analysis = {
  url?: string; durationSeconds?: number; format?: string;
  hook?: { type?: string; durationSeconds?: number };
  beats?: Beat[]; actsSummary?: { act?: string; roles?: string[] }[];
  cta?: { type?: string }; captions?: { style?: string; present?: boolean };
  pacing?: { visualChangeEverySeconds?: number };
  manual?: { collectedFormat?: string; ratio?: number | null; views?: number | null };
};

const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const analyses: { id: string; data: Analysis }[] = [];
const problems: string[] = [];
for (const file of files) {
  try {
    analyses.push({ id: file.replace(".json", ""), data: JSON.parse(readFileSync(join(dir, file), "utf8")) });
  } catch (error) {
    problems.push(`${file}: neteisingas JSON (${(error as Error).message})`);
  }
}

function check(id: string, where: string, field: TokenField, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  if (!(tokens[field] as readonly string[]).includes(String(value)))
    problems.push(`${id} ${where}: „${value}“ nėra žodyne (${field})`);
}

const counters: Record<string, Record<string, number>> = {};
function count(name: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  const bucket = (counters[name] ??= {});
  bucket[String(value)] = (bucket[String(value)] ?? 0) + 1;
}
const series: Record<string, number[]> = {};
function add(name: string, value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) (series[name] ??= []).push(value);
}

const words = (text?: string) => (text ?? "").split(/\s+/).filter(Boolean).length;

for (const { id, data } of analyses) {
  const beats = data.beats ?? [];
  check(id, "format", "format", data.format);
  check(id, "hook.type", "hookType", data.hook?.type);
  check(id, "cta.type", "ctaType", data.cta?.type);
  check(id, "captions.style", "captionStyle", data.captions?.style);
  count("format", data.format);
  count("hookType", data.hook?.type);
  count("ctaType", data.cta?.type);
  count("captionStyle", data.captions?.style);
  count("actsSequence", (data.actsSummary ?? []).map((a) => a.act).join(" → "));
  add("durationSeconds", data.durationSeconds);
  add("hookSeconds", data.hook?.durationSeconds);
  add("visualChangeEverySeconds", data.pacing?.visualChangeEverySeconds);
  add("beatsPerVideo", beats.length);

  let spoken = 0;
  let sfxCount = 0;
  beats.forEach((beat, index) => {
    const where = `beats[${index}]`;
    check(id, `${where}.role`, "role", beat.role);
    check(id, `${where}.act`, "act", beat.act);
    check(id, `${where}.transitionIn`, "transition", beat.transitionIn);
    check(id, `${where}.emphasis`, "emphasis", beat.emphasis);
    check(id, `${where}.connectionToNext`, "connection", beat.connectionToNext);
    check(id, `${where}.background.type`, "background", beat.background?.type);
    count("role", beat.role);
    count(`role@${data.format}`, beat.role);
    count("transition", beat.transitionIn);
    count("emphasis", beat.emphasis);
    count("connection", beat.connectionToNext);
    count("background", beat.background?.type);
    count("act", beat.act);
    check(id, `${where}.continuityToNext`, "continuity", beat.continuityToNext);
    check(id, `${where}.composition.type`, "compositionType", beat.composition?.type);
    count("continuity", beat.continuityToNext);
    count("compositionType", beat.composition?.type);
    count("whitespace", beat.composition?.whitespace);
    (beat.composition?.textBlocks ?? []).forEach((block, t) => {
      const at = `${where}.composition.textBlocks[${t}]`;
      check(id, `${at}.zone`, "zone", block.zone);
      check(id, `${at}.size`, "textSize", block.size);
      check(id, `${at}.emphasisStyle`, "emphasisStyle", block.emphasisStyle);
      count("textSize", block.size);
      count("emphasisStyle", block.emphasisStyle);
      count("textZone", block.zone);
    });
    if (beat.composition) add("textBlocksPerBeat", beat.composition.textBlocks?.length ?? 0);
    if (beat.background?.recreate?.matchesNarration !== undefined)
      count("backgroundMatchesNarration", beat.background.recreate.matchesNarration);
    const length = (beat.endSeconds ?? NaN) - (beat.startSeconds ?? NaN);
    add("beatSeconds", length);
    if (beat.role) add(`beatSeconds:${beat.role}`, length);
    add("simultaneousElements", beat.simultaneousElements);
    add("onScreenWords", words(beat.onScreenText) || undefined);
    spoken += words(beat.voiceover);

    (beat.elements ?? []).forEach((element, e) => {
      const at = `${where}.elements[${e}]`;
      check(id, `${at}.kind`, "elementKind", element.kind);
      check(id, `${at}.origin`, "origin", element.origin);
      check(id, `${at}.position`, "position", element.position);
      check(id, `${at}.screenShare`, "screenShare", element.screenShare);
      check(id, `${at}.size`, "screenShare", (element as { size?: string }).size);
      check(id, `${at}.motion`, "motion", element.motion);
      count("elementKind", element.kind);
      count("origin", element.origin);
      count("motion", element.motion);
      check(id, `${at}.zone`, "zone", element.zone);
      check(id, `${at}.during`, "motion", element.during);
      count("elementZone", element.zone);
      count("during", element.during);
      for (const effect of element.visualEffects ?? []) {
        check(id, `${at}.visualEffects`, "visualEffect", effect);
        count("visualEffect", effect);
      }
      count("position", element.position);
      count("screenShare", element.screenShare);
      count(`motion@${element.kind}`, element.motion);
      if (beat.role) count(`elementKind@${beat.role}`, element.kind);
    });

    (beat.soundEffects ?? []).forEach((sfx, s) => {
      const at = `${where}.soundEffects[${s}]`;
      check(id, `${at}.type`, "sfxType", sfx.type);
      check(id, `${at}.group`, "sfxGroup", sfx.group);
      check(id, `${at}.syncedTo`, "syncedTo", sfx.syncedTo);
      check(id, `${at}.confidence`, "confidence", sfx.confidence);
      sfxCount += 1;
      count("sfxType", sfx.type);
      count("sfxSyncedTo", sfx.syncedTo);
      count("sfxConfidence", sfx.confidence);
      if (sfx.confidence !== "low") count("sfxPair (syncedTo → type)", `${sfx.syncedTo} → ${sfx.type}`);
    });
  });
  if (data.durationSeconds) {
    add("wordsPerSecond", spoken / data.durationSeconds);
    add("sfxPer10s", (sfxCount / data.durationSeconds) * 10);
  }
}

function quantile(values: number[], q: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}
const round = (n: number) => Math.round(n * 10) / 10;

const numbers = Object.fromEntries(
  Object.entries(series)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, values]) => [name, {
      n: values.length,
      p10: round(quantile(values, 0.1)),
      median: round(quantile(values, 0.5)),
      p90: round(quantile(values, 0.9)),
    }]),
);
const frequencies = Object.fromEntries(
  Object.entries(counters)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, bucket]) => [name, Object.fromEntries(Object.entries(bucket).sort(([, a], [, b]) => b - a))]),
);

writeFileSync(outJson, JSON.stringify({ analyses: analyses.length, numbers, frequencies, problems }, null, 2) + "\n");

const lines: string[] = [
  "# Analizių statistika",
  "",
  `Sugeneruota \`npm run analysis:stats\` iš ${analyses.length} analizių (\`docs/bd/analizes/\`). Rankomis netaisyti.`,
  "",
  "## Skaičiai",
  "",
  "| Rodiklis | n | p10 | mediana | p90 |",
  "|---|---|---|---|---|",
  ...Object.entries(numbers).map(([name, v]) => `| ${name} | ${v.n} | ${v.p10} | ${v.median} | ${v.p90} |`),
  "",
  "## Dažniai",
  "",
];
for (const [name, bucket] of Object.entries(frequencies)) {
  if (name.includes("@")) continue;
  const total = Object.values(bucket).reduce((a, b) => a + b, 0);
  lines.push(`### ${name}`, "", "| Reikšmė | Kiekis | % |", "|---|---|---|");
  for (const [value, n] of Object.entries(bucket).slice(0, 15))
    lines.push(`| ${value} | ${n} | ${Math.round((n / total) * 100)} |`);
  lines.push("");
}
lines.push(
  "Detalūs skirstiniai (pvz. `elementKind@demo`, `motion@photo`, `role@story`) yra JSON faile.",
  "",
  `## Žodyno klaidos (${problems.length})`,
  "",
  ...(problems.length ? problems.map((p) => `- ${p}`) : ["Nėra."]),
  "",
);
writeFileSync(outMd, lines.join("\n"));
console.log(`${analyses.length} analizės → ${outMd}, ${outJson}; žodyno klaidų: ${problems.length}`);

// Input for prompt 3: every analysis without the fields prompt 3 does not use
// (explanations, long descriptions), so all of them fit in one message.
const drop = new Set(["typeExplanation", "kindExplanation", "motionExplanation", "roleExplanation", "formatExplanation", "description", "reproducibleExplanation", "confidence"]);
const slim = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(slim)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).filter(([key, v]) => !drop.has(key) && v !== "").map(([key, v]) => [key, slim(v)]))
      : value;
const bundle = analyses.map(({ data }) => {
  const { manual, ...rest } = data;
  return slim({ ...rest, manual: { ratio: manual?.ratio, views: manual?.views } });
});
writeFileSync("docs/bd/analizes-rinkinys.json", JSON.stringify(bundle) + "\n");
