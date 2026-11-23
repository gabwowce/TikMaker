// Watch an agent run's JSON fill up, live: every status change, every new
// field, every model call (with its tokens and time) and every message, as
// the agent writes them into db/agent-runs/<id>.json.
//
//   npx tsx scripts/watchRun.ts            the newest run (and the next one
//                                          started while it watches)
//   npx tsx scripts/watchRun.ts <runId>    one run
//
// Start the editor (npm run dev) in another terminal, then start a video.
import fs from "node:fs";
import path from "node:path";

const DIR = path.resolve("db", "agent-runs");
const wanted = process.argv[2];

type Run = Record<string, unknown> & {
  id: string;
  status: string;
  createdAt: number;
  steps?: { name: string; ms?: number; inputTokens?: number; cachedInputTokens?: number; outputTokens?: number; turns?: number; error?: string }[];
  messages?: { id: string; from: string; text: string; status?: string; questions?: { question: string; answer?: string }[] }[];
};

function newest(): string | undefined {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  if (wanted) return files.includes(`${wanted}.json`) ? `${wanted}.json` : undefined;
  return files
    .map((f) => ({ f, t: fs.statSync(path.join(DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.f;
}

const time = () => new Date().toLocaleTimeString("lt-LT");
const short = (v: unknown) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 110 ? `${s.slice(0, 110)}…` : s;
};
// Fields that change on every save and say nothing new on their own.
const QUIET = new Set(["statusAt", "steps", "messages"]);

let file: string | undefined;
let before: Run | undefined;

function look() {
  const now = newest();
  if (!now) return;
  if (now !== file) {
    file = now;
    before = undefined;
    console.log(`\n━━━ ${now} ━━━`);
  }
  let run: Run;
  try {
    run = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf-8"));
  } catch {
    return; // being written right now – next look
  }
  const was = before ?? ({ steps: [], messages: [] } as unknown as Run);

  if (run.status !== was.status)
    console.log(`${time()}  STATUS   ${was.status ?? "—"} → ${run.status}`);

  for (const [key, value] of Object.entries(run)) {
    if (QUIET.has(key) || key === "status") continue;
    const old = was[key];
    if (JSON.stringify(old) === JSON.stringify(value)) continue;
    console.log(`${time()}  ${old === undefined ? "+ LAUKAS" : "~ LAUKAS"} ${key}: ${short(value)}`);
  }

  for (const step of (run.steps ?? []).slice(was.steps?.length ?? 0)) {
    const tokens = `in ${step.inputTokens ?? 0} · cached ${step.cachedInputTokens ?? 0} · out ${step.outputTokens ?? 0}`;
    const extra = step.turns ? ` · ${step.turns} ratai` : "";
    const secs = step.ms ? ` · ${Math.round(step.ms / 1000)} s` : "";
    console.log(`${time()}  + STEPS  ${step.name}  (${tokens}${extra}${secs})${step.error ? `  KLAIDA: ${short(step.error)}` : ""}`);
  }

  const known = new Map((was.messages ?? []).map((m) => [m.id, m]));
  for (const m of run.messages ?? []) {
    const old = known.get(m.id);
    if (!old) console.log(`${time()}  + ŽINUTĖ ${m.from}${m.status ? ` [${m.status}]` : ""}: ${short(m.text)}`);
    else if (old.status !== m.status) console.log(`${time()}  ~ ŽINUTĖ ${m.from}: ${old.status} → ${m.status}`);
    for (const [i, q] of (m.questions ?? []).entries())
      if (q.answer && !old?.questions?.[i]?.answer)
        console.log(`${time()}    atsakymas: ${q.question} → ${q.answer}`);
  }

  before = run;
}

console.log(`Stebiu ${wanted ? wanted : "naujausią run'ą"} (Ctrl+C – baigti)…`);
look();
setInterval(look, 700);
