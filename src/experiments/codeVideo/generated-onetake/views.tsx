import type { CSSProperties, ReactNode } from "react";
import { C, DISPLAY, MONO, POP, lin, ramp, typed, type Timeline } from "./lib";

// Everything that can be INSIDE the one card. Each view fills the card's body;
// the card itself (size, radius, position) and its footer meter live in Video.

type ViewProps = { f: number; T: Timeline };

const fill: CSSProperties = { position: "absolute", inset: 0, display: "flex", flexDirection: "column" };

export function Header({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div
      style={{
        height: 78,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        padding: "0 34px",
        gap: 14,
        borderBottom: `1px solid ${C.border}`,
        fontFamily: MONO,
        fontSize: 24,
        color: C.dim,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: C.faint }} />
      ))}
      <div style={{ marginLeft: 12, flex: 1, whiteSpace: "nowrap" }}>{title}</div>
      {right}
    </div>
  );
}

function Cursor({ f, color = C.text }: { f: number; color?: string }) {
  const on = Math.floor(f / 15) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 16,
        height: 34,
        marginLeft: 3,
        verticalAlign: "-6px",
        background: color,
        opacity: on ? 0.9 : 0.15,
      }}
    />
  );
}

export function PromptBox({ f, text, glow = 0, cursor = true }: { f: number; text: string; glow?: number; cursor?: boolean }) {
  return (
    <div
      style={{
        margin: "0 30px",
        padding: "20px 24px",
        borderRadius: 18,
        border: `1.5px solid ${glow > 0 ? `rgba(255,122,69,${0.25 + 0.6 * glow})` : C.border}`,
        boxShadow: glow > 0 ? `0 0 ${40 * glow}px rgba(255,122,69,${0.25 * glow})` : "none",
        fontFamily: MONO,
        fontSize: 32,
        lineHeight: "44px",
        color: C.text,
        background: "rgba(255,255,255,0.02)",
        flexShrink: 0,
      }}
    >
      <span style={{ color: C.accent, marginRight: 14 }}>&gt;</span>
      {text}
      {cursor ? <Cursor f={f} /> : null}
    </div>
  );
}

function TermLine({ text, o = 1, style }: { text: string; o?: number; style?: CSSProperties }) {
  const base: CSSProperties = {
    fontFamily: MONO,
    fontSize: 29,
    lineHeight: "46px",
    whiteSpace: "nowrap",
    opacity: o,
    ...style,
  };
  if (text.startsWith(">"))
    return (
      <div style={{ ...base, color: C.text, fontWeight: 700 }}>
        <span style={{ color: C.accent }}>&gt;</span>
        {text.slice(1)}
      </div>
    );
  if (text.startsWith("●"))
    return (
      <div style={{ ...base, color: C.text }}>
        <span style={{ color: C.accent }}>●</span>
        {text.slice(1)}
      </div>
    );
  if (text.startsWith("✓"))
    return (
      <div style={{ ...base, color: C.accent }}>
        {text}
      </div>
    );
  return <div style={{ ...base, color: C.dim }}>{text}</div>;
}

// ------------------------------------------------- scene 1 / 9: the burning session

const SESSION = [
  "> refactor the dashboard",
  "● Read(src/app/page.tsx)",
  "  ⎿ 214 lines",
  "● Read(src/components/Chart.tsx)",
  "● Search(\"useQuery\")",
  "  ⎿ 48 files",
  "● Read(src/lib/api.ts)",
  "● Update(src/app/page.tsx)",
  "> also fix the tests",
  "● Read(tests/page.test.tsx)",
  "● Bash(npm test)",
  "  ⎿ 3 failed, 41 passed",
  "> and the navbar",
  "● Read(src/components/Nav.tsx)",
  "● Search(\"theme\")",
  "  ⎿ 112 files",
  "> why is the build slow?",
  "● Bash(npm run build)",
  "● Read(next.config.js)",
];
const sessionLine = (i: number) => SESSION[i % SESSION.length];

/** Scene 1 (and, at t = 0, scene 9): a session that keeps growing, faster and faster. */
export function BurnView({ f, t, o }: { f: number; t: number; o: number }) {
  const count = Math.floor(3 + 0.0042 * t * t + 0.05 * t);
  const from = Math.max(0, count - 15);
  const lines = [];
  for (let i = from; i < count; i++) lines.push(sessionLine(i));
  return (
    <div style={{ ...fill, opacity: o }}>
      <Header title="claude · my-app" />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: count > 15 ? "flex-end" : "flex-start",
          padding: "26px 40px",
          overflow: "hidden",
        }}
      >
        {lines.map((l, k) => (
          <TermLine key={from + k} text={l} />
        ))}
      </div>
      <div style={{ paddingBottom: 26 }}>
        <PromptBox f={f} text="" />
      </div>
    </div>
  );
}

// ------------------------------------------------- scene 2: the dollar counter

export function CounterView({ f, T, o }: ViewProps & { o: number }) {
  const w = (i: number) => T.W(1, i);
  const v =
    f < w(3) - 2
      ? ramp(f, w(1) - 2, w(3) - 2, 0, 1.4, lin)
      : ramp(f, w(3) - 2, w(4) + 6, 1.4, 13, POP) + ramp(f, w(12) - 3, T.E[1], 0, 0.62, lin);
  const dollars = Math.floor(v);
  const cents = Math.floor((v - dollars) * 100)
    .toString()
    .padStart(2, "0");
  const sub = ramp(f, w(5) - 3, w(5) + 8);
  const day = ramp(f, w(8) - 3, w(8) + 8);
  const dayP = ramp(f, w(8) - 3, T.E[1], 0.15, 0.62, lin);
  const pop = ramp(f, w(3) - 2, w(3) + 10, 1.08, 1, POP);
  return (
    <div style={{ ...fill, opacity: o }}>
      <Header title="spend · today" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            color: C.text,
            display: "flex",
            alignItems: "flex-start",
            transform: `scale(${f >= w(3) - 2 ? pop : 1})`,
          }}
        >
          <span style={{ fontSize: 110, color: C.accent, marginTop: 36, marginRight: 8 }}>$</span>
          <span style={{ fontSize: 250, lineHeight: "260px", fontVariantNumeric: "tabular-nums" }}>{dollars}</span>
          <span style={{ fontSize: 84, color: C.dim, marginTop: 40 }}>.{cents}</span>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 32,
            color: C.dim,
            letterSpacing: 2,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 14}px)`,
          }}
        >
          per developer
        </div>
        <div style={{ width: 560, marginTop: 44, opacity: day }}>
          <div style={{ position: "relative", height: 8, borderRadius: 4, background: C.faint }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${dayP * 100}%`, borderRadius: 4, background: C.text }} />
            <div
              style={{
                position: "absolute",
                left: `${dayP * 100}%`,
                top: -9,
                width: 26,
                height: 26,
                marginLeft: -13,
                borderRadius: 13,
                background: C.text,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontFamily: MONO, fontSize: 24, color: C.dim }}>
            <span>00:00</span>
            <span>1 day</span>
            <span>24:00</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------- scene 3: one question drags the whole history

const HISTORY = [
  ["u", "refactor the dashboard"],
  ["a", "● Read 6 files, updated page.tsx"],
  ["u", "also fix the tests"],
  ["a", "● Ran npm test · 3 fixed"],
  ["u", "and the navbar"],
  ["a", "● Updated Nav.tsx"],
  ["u", "why is the build slow?"],
  ["a", "● Read next.config.js …"],
  ["u", "add dark mode"],
  ["a", "● Updated 14 files"],
  ["u", "rename userId → accountId"],
  ["a", "● Search 212 matches …"],
  ["u", "write the changelog"],
] as const;

export function ChatView({ f, T, o, tall }: ViewProps & { o: number; tall: number }) {
  const attach = T.W(2, 6) - 3;
  const sent = ramp(f, T.W(2, 4) - 3, T.W(2, 4) + 6);
  const n = HISTORY.length;
  return (
    <div style={{ ...fill, opacity: o }}>
      <div style={{ opacity: tall, height: 78 * tall, overflow: "hidden", flexShrink: 0 }}>
        <Header title="sent with 1 question" />
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 12,
          padding: "0 34px",
          overflow: "hidden",
        }}
      >
        {HISTORY.map(([who, text], i) => {
          // the stack builds upwards: the most recent message attaches first
          const at = attach + (n - 1 - i) * 2.2;
          const a = ramp(f, at, at + 10);
          if (a <= 0) return null;
          const user = who === "u";
          return (
            <div
              key={i}
              style={{
                alignSelf: user ? "flex-end" : "flex-start",
                maxWidth: "82%",
                padding: "12px 22px",
                borderRadius: 22,
                background: user ? "rgba(255,255,255,0.07)" : "transparent",
                border: `1px solid ${C.border}`,
                fontFamily: MONO,
                fontSize: 25,
                color: user ? C.text : C.dim,
                whiteSpace: "nowrap",
                opacity: a * (0.45 + 0.55 * (i / n)),
                transform: `translateY(${(1 - a) * 30}px) scale(${0.94 + 0.06 * a})`,
              }}
            >
              {text}
            </div>
          );
        })}
      </div>
      <div
        style={{
          height: 200 - 60 * tall,
          flexShrink: 0,
          margin: `${14 * tall}px ${30 * tall}px ${24 * tall}px`,
          borderRadius: 70,
          border: `2px solid rgba(255,122,69,${0.9 * tall})`,
          display: "flex",
          alignItems: "center",
          padding: "0 30px 0 44px",
          gap: 20,
        }}
      >
        <div style={{ flex: 1, fontFamily: MONO, fontSize: 40 - 6 * tall, color: C.text, whiteSpace: "nowrap" }}>what does this regex do?</div>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            background: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${1 + 0.25 * Math.sin(Math.PI * sent)}) translateY(${-sent * 4}px)`,
            color: C.bg,
            fontFamily: DISPLAY,
            fontSize: 44,
          }}
        >
          ↑
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------- scene 4: /clear

export function ClearView({ f, T, o }: ViewProps & { o: number }) {
  const E = T.clearAt;
  const slash = T.W(3, 3) - 2;
  const word = T.W(3, 4) - 3;
  let text = "";
  if (f >= slash) text = "/";
  if (f >= word) text = "/" + typed("clear", f, word, 1.4);
  if (f >= E) text = "";
  const menu = f >= slash && f < E ? ramp(f, slash, slash + 6) : 0;
  const glow = f < E ? ramp(f, T.W(3, 1) - 3, T.W(3, 1) + 8) * (0.4 + 0.6 * menu) : 0;
  const lines = SESSION.slice(0, 13);
  return (
    <div style={{ ...fill, opacity: o }}>
      <Header title="claude · my-app" />
      <div style={{ flex: 1, padding: "26px 40px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {lines.map((l, i) => {
          const k = ramp(f, E + i * 0.7, E + i * 0.7 + 8);
          if (k >= 1) return null;
          return (
            <div key={i} style={{ height: 46 * (1 - k), overflow: "hidden" }}>
              <TermLine text={l} o={(1 - k) * 0.7} style={{ transform: `translateX(${-k * 60}px)` }} />
            </div>
          );
        })}
        {f >= E + 8 ? (
          <div style={{ opacity: ramp(f, E + 8, E + 16) }}>
            <TermLine text="> /clear" />
            <TermLine text="  ⎿ (no content)" />
          </div>
        ) : null}
      </div>
      <div style={{ paddingBottom: 26, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            bottom: 140,
            opacity: menu,
            transform: `translateY(${(1 - menu) * 12}px)`,
            padding: "14px 24px",
            borderRadius: 16,
            background: "#1C1F26",
            border: `1px solid ${C.border}`,
            fontFamily: MONO,
            fontSize: 27,
            display: "flex",
            gap: 26,
          }}
        >
          <span style={{ color: C.accent }}>/clear</span>
          <span style={{ color: C.dim }}>clear conversation history</span>
        </div>
        <PromptBox f={f} text={text} glow={glow} />
      </div>
    </div>
  );
}

// ------------------------------------------------- scene 5 / 6: the repo tree

const TREE: [string, number, boolean?][] = [
  ["src/", 0, true],
  ["app/", 1, true],
  ["page.tsx", 2],
  ["layout.tsx", 2],
  ["components/", 1, true],
  ["Chart.tsx", 2],
  ["Nav.tsx", 2],
  ["lib/", 1, true],
  ["api.ts", 2],
  ["auth.ts", 2],
  ["tests/", 0, true],
  ["public/", 0, true],
  ["scripts/", 0, true],
  ["package.json", 0],
];
const AUTH = 9;
const AUTH_PARENTS = [0, 7];
const BROAD = "improve this codebase";
const NARROW = "add input validation to login() in auth.ts";

export function TreeView({ f, T, o }: ViewProps & { o: number }) {
  const s5 = (i: number) => T.W(4, i);
  const s6 = (i: number) => T.W(5, i);
  const inS6 = f >= T.B[5] - 2;
  // prompt: type the broad request, later backspace it and type the narrow one
  let prompt = typed(BROAD, f, s5(7) - 3, 1.3);
  if (inS6) {
    const del = Math.max(0, Math.floor((f - T.B[5]) / 0.7));
    prompt = BROAD.slice(0, Math.max(0, BROAD.length - del));
    const start = s6(6) - 3;
    const fpc = (s6(14) + 6 - start) / NARROW.length;
    if (f >= start) prompt = typed(NARROW, f, start, fpc);
  }
  const scanStart = s5(10) - 2;
  const dimAll = inS6 ? ramp(f, T.B[5], T.B[5] + 12) : 0;
  const pick = ramp(f, s6(14) - 3, s6(14) + 8);
  const glow = inS6 ? ramp(f, s6(6) - 3, s6(6) + 8) * (1 - pick * 0.5) : ramp(f, s5(7) - 3, s5(7) + 6) * (1 - ramp(f, scanStart, scanStart + 12));
  const files = ramp(f, s5(6) - 3, s5(6) + 8);
  return (
    <div style={{ ...fill, opacity: o }}>
      <Header
        title="my-app"
        right={<span style={{ opacity: files, color: C.dim }}>1,284 files</span>}
      />
      <div style={{ padding: "20px 0 4px" }}>
        <PromptBox f={f} text={prompt} glow={glow} />
      </div>
      <div style={{ flex: 1, padding: "8px 46px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {TREE.map(([name, depth, dir], i) => {
          const at = scanStart + i * 3.1;
          const lit = ramp(f, at, at + 4) * (1 - dimAll);
          const flash = lit * (1 - ramp(f, at + 4, at + 18));
          const target = i === AUTH ? pick : AUTH_PARENTS.includes(i) ? pick * 0.5 : 0;
          const on = Math.max(lit, target);
          return (
            <div
              key={name + i}
              style={{
                height: 45,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                paddingLeft: 18 + depth * 44,
                borderRadius: 12,
                fontFamily: MONO,
                fontSize: 30,
                color: on > 0.3 ? C.text : C.dim,
                background: `rgba(255,122,69,${0.06 * lit + 0.22 * flash + (i === AUTH ? 0.16 * pick : 0)})`,
                border: i === AUTH ? `1.5px solid rgba(255,122,69,${pick})` : "1.5px solid transparent",
                gap: 16,
              }}
            >
              <span style={{ width: 18, color: C.accent, opacity: on }}>●</span>
              <span style={{ opacity: 0.55 + 0.45 * on }}>{dir ? "▸ " : ""}{name}</span>
              {i === AUTH ? (
                <span style={{ marginLeft: "auto", marginRight: 20, color: C.accent, fontSize: 24, opacity: pick }}>Read</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------- scene 6 (end): only auth.ts, then the edit

const CODE: [string, "+" | " "][] = [
  ["export async function login(req) {", " "],
  ["  const { email, password } = req.body", "+"],
  ["  if (!isEmail(email)) return bad(400)", "+"],
  ["  if (!password) return bad(400)", "+"],
  ["  const user = await findUser(email)", " "],
  ["  return createSession(user)", " "],
  ["}", " "],
];

export function DiffView({ f, T, o }: ViewProps & { o: number }) {
  const reads = T.W(5, 18) - 3;
  const done = T.W(5, 19) - 3;
  let plus = 0;
  return (
    <div style={{ ...fill, opacity: o }}>
      <Header title="src/lib/auth.ts" right={<span style={{ color: C.accent }}>Update</span>} />
      <div style={{ flex: 1, padding: "34px 0", display: "flex", flexDirection: "column" }}>
        {CODE.map(([line, mark], i) => {
          const at = mark === "+" ? reads + plus++ * 5 : T.diffAt + 4;
          const a = ramp(f, at, at + 8);
          const add = mark === "+";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                height: add ? 56 * a : 56,
                overflow: "hidden",
                alignItems: "center",
                fontFamily: MONO,
                fontSize: 29,
                whiteSpace: "pre",
                background: add ? "rgba(255,122,69,0.13)" : "transparent",
                borderLeft: add ? `5px solid ${C.accent}` : "5px solid transparent",
                opacity: a,
              }}
            >
              <span style={{ width: 70, textAlign: "right", color: C.faint, marginRight: 18 }}>{i + 41}</span>
              <span style={{ width: 30, color: C.accent }}>{add ? "+" : ""}</span>
              <span style={{ color: add ? C.text : C.dim }}>{line}</span>
            </div>
          );
        })}
        <div style={{ marginTop: "auto", padding: "0 40px", opacity: ramp(f, done, done + 8) }}>
          <TermLine text="✓ Done · read 3 files" style={{ fontSize: 34 }} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------- scene 7: every session starts from zero

const EXPLORE = [
  "● Search(\"**/*\")",
  "  ⎿ 1,284 files",
  "● Read(package.json)",
  "● Read(src/app/layout.tsx)",
  "● Read(src/lib/api.ts)",
  "● Read(README.md)",
  "● Search(\"auth\")",
  "  ⎿ 37 files",
  "● Read(src/lib/auth.ts)",
  "● Read(src/lib/db.ts)",
  "● Read(tsconfig.json)",
];

export function SessionView({ f, T, o }: ViewProps & { o: number }) {
  let n = 0;
  for (let i = 0; i < T.restarts.length; i++) if (T.restarts[i] <= f) n = i;
  const start = T.restarts[n];
  const next = T.restarts[n + 1] ?? T.E[6];
  const lt = f - start;
  const inO = ramp(f, start + 8, start + 14);
  const outO = 1 - ramp(f, next - 4, next);
  const tag = ramp(f, T.W(6, 2) - 3, T.W(6, 2) + 6);
  const gap = Math.max(2, Math.min(5, (next - start - 14) / EXPLORE.length));
  return (
    <div style={{ ...fill, opacity: o * Math.min(inO, outO) }}>
      <Header
        title={
          <span>
            new session <span style={{ color: C.text, fontWeight: 700 }}>#{n + 1}</span>
          </span>
        }
        right={
          <span style={{ color: C.accent, opacity: tag, fontSize: 24 }}>
            ✕ CLAUDE.md
          </span>
        }
      />
      <div style={{ flex: 1, padding: "26px 40px", display: "flex", flexDirection: "column" }}>
        <TermLine text="> fix the login bug" />
        <TermLine text="  ⎿ exploring the project…" o={0.9} />
        {EXPLORE.map((l, i) => {
          const at = 12 + i * gap;
          const a = ramp(lt, at, at + 5);
          return <TermLine key={i} text={l} o={a} style={{ transform: `translateY(${(1 - a) * 16}px)` }} />;
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------- scene 8: write CLAUDE.md once, it loads

const MEMORY = [
  "# my-app",
  "stack: Next.js + Postgres",
  "run:   npm run dev",
  "test:  npm test",
  "auth:  src/lib/auth.ts",
  "never edit /generated",
];

export function EditorView({ f, T, o }: ViewProps & { o: number }) {
  const t0 = T.B[7] + 2;
  const per = Math.max(6, (T.W(7, 5) - t0) / MEMORY.length);
  return (
    <div style={{ ...fill, opacity: o }}>
      <Header title={<span style={{ color: C.text }}>CLAUDE.md</span>} right={<span style={{ color: C.dim }}>editor</span>} />
      <div style={{ flex: 1, padding: "34px 0" }}>
        {MEMORY.map((l, i) => {
          const at = t0 + i * per;
          const txt = typed(l, f, at, 0.45);
          const head = i === 0;
          return (
            <div key={i} style={{ display: "flex", height: 62, alignItems: "center", fontFamily: MONO, fontSize: head ? 38 : 31 }}>
              <span style={{ width: 70, textAlign: "right", color: C.faint, marginRight: 30, fontSize: 26 }}>{i + 1}</span>
              <span style={{ color: head ? C.accent : C.text, fontWeight: head ? 700 : 400, whiteSpace: "pre" }}>
                {txt}
                {f >= at && f < at + per ? <Cursor f={f} color={C.accent} /> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LoadedView({ f, T, o }: ViewProps & { o: number }) {
  const t = T.loadAt + 8;
  return (
    <div style={{ ...fill, opacity: o }}>
      <Header title={<span>new session <span style={{ color: C.text, fontWeight: 700 }}>#5</span></span>} right={<span style={{ color: C.accent }}>✓ CLAUDE.md</span>} />
      <div style={{ flex: 1, padding: "26px 40px", display: "flex", flexDirection: "column" }}>
        <TermLine text="✓ Loaded CLAUDE.md · 6 lines" o={ramp(f, t + 4, t + 12)} style={{ fontSize: 31 }} />
        <div
          style={{
            margin: "16px 0 0 4px",
            paddingLeft: 26,
            borderLeft: `3px solid ${C.faint}`,
            opacity: ramp(f, t + 10, t + 20),
          }}
        >
          {MEMORY.slice(1).map((l, i) => (
            <TermLine key={i} text={`  ${l}`} style={{ fontSize: 27, lineHeight: "42px" }} />
          ))}
        </div>
        <div style={{ opacity: ramp(f, t + 22, t + 30), marginTop: 18 }}>
          <TermLine text="> fix the login bug" />
          <TermLine text="● Read(src/lib/auth.ts)" />
        </div>
      </div>
      <div style={{ paddingBottom: 26 }}>
        <PromptBox f={f} text="" />
      </div>
    </div>
  );
}
