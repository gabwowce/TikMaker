import type { ReactNode } from "react";
import { random, useCurrentFrame } from "remotion";
import { PhotoSlot, useBrand } from "../brand/kit";
import { BOUNCE, EXIT, lerp, ramp, typed, useTimeline } from "./anim";
import { Cursor, Gauge, INK, Sticker, TitleBar, counter, fmt, mono } from "./ui";

// One state of the main card per scene. `Inner` draws inside the (clipped)
// card, `Over` draws around it (gauge, stickers, photo) – both in coordinates
// relative to the card's top-left corner.
export type StateProps = { s: number; inAt: number; outAt: number; w: number; h: number };
export type CardState = {
  bg: string;
  Inner: (p: StateProps) => ReactNode;
  Over?: (p: StateProps) => ReactNode;
};

const HISTORY: { you: boolean; t: string }[] = [
  { you: true, t: "fix the navbar on mobile" },
  { you: false, t: "Edited Navbar.tsx (+12 −4)" },
  { you: true, t: "now add dark mode" },
  { you: false, t: "Edited theme.ts, App.tsx" },
  { you: true, t: "why is the build failing?" },
  { you: false, t: "Read 14 files · fixed import" },
  { you: true, t: "write tests for the cart" },
  { you: false, t: "Created cart.test.ts" },
  { you: true, t: "refactor the api client" },
  { you: false, t: "Edited 9 files" },
];

function HistoryRow({ you, t, size = 28 }: { you: boolean; t: string; size?: number }) {
  const c = useBrand();
  return (
    <div style={{ ...mono(size, you ? c.text : c.textSoft), opacity: you ? 1 : 0.8 }}>
      <span style={{ color: you ? c.accent : c.textSoft }}>{you ? "> " : "● "}</span>
      {t}
    </div>
  );
}

function Col({ children, pad = 30 }: { children: ReactNode; pad?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {children}
      <div style={{ height: pad, flexShrink: 0 }} />
    </div>
  );
}

function Chip({ children, hot }: { children: ReactNode; hot?: boolean }) {
  const c = useBrand();
  return (
    <div
      style={{
        fontFamily: c.fontSemi,
        fontSize: 24,
        padding: "6px 16px",
        borderRadius: 999,
        color: hot ? INK : c.textSoft,
        background: hot ? c.accent : "rgba(255,255,255,0.07)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

// ── 1 · hook: an endless session drains the tank ───────────────────────────
const SCROLL = [
  "● Read src/components/Navbar.tsx",
  "● Searching for \"useCart\"…",
  "> keep going",
  "● Read src/lib/api.ts",
  "● Edited 3 files",
  "> also check the tests",
  "● Read tests/cart.test.ts",
  "● Running npm test…",
  "● Read package-lock.json",
  "> try again",
  "● Read src/app/layout.tsx",
  "● Searching for \"theme\"…",
];
const LINE = 44;

function scrollOffset(f: number, a: number) {
  // accelerating scroll: the session never ends
  const t = Math.max(0, f - a);
  return t * 3 + t * t * 0.035;
}

const hook: CardState = {
  bg: "#141418",
  Inner: ({ inAt }) => {
    const f = useCurrentFrame();
    const c = useBrand();
    const off = scrollOffset(f, inAt);
    const first = Math.floor(off / LINE);
    const tokens = 12400 + Math.round(off * 410);
    return (
      <Col pad={0}>
        <TitleBar title="claude — ~/shop-app" right={<Chip hot>{fmt(tokens)} tokens</Chip>} />
        <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
          {Array.from({ length: 14 }).map((_, k) => {
            const i = first + k;
            const line = SCROLL[i % SCROLL.length];
            const you = line.startsWith(">");
            return (
              <div key={i} style={{ position: "absolute", left: 30, top: 20 + i * LINE - off, ...mono(28, you ? c.text : c.textSoft) }}>
                <span style={{ color: you ? c.accent : c.textSoft }}>{line.slice(0, 2)}</span>
                {line.slice(2)}
              </div>
            );
          })}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#141418, transparent 22%, transparent 75%, #141418)" }} />
        </div>
      </Col>
    );
  },
  Over: ({ s, w, h }) => {
    const f = useCurrentFrame();
    const t = useTimeline();
    const v = lerp(f, t.start(s) + 4, t.w(s, 9), 0.92, 0.06) + Math.sin(f / 3) * 0.01;
    const out = ramp(f, t.cut(s + 1) - 6, t.cut(s + 1), EXIT);
    return (
      <>
        <div style={{ position: "absolute", left: w - 300, top: h - 330, rotate: "8deg", scale: `${(0.6 + 0.4 * ramp(f, 4, 16, BOUNCE)) * (1 - out)}`, opacity: 1 - out }}>
          <Gauge value={v} size={290} warn={v < 0.25} />
        </div>
        <Sticker text="3 FIXES" at={t.w(s, 9)} outAt={t.cut(s + 1) - 6} x={w * 0.4} y={h * 0.42} rotate={-7} size={124} />
      </>
    );
  },
};

// ── 2 · setup: $13 per developer per day, and it leaks ─────────────────────
const cost: CardState = {
  bg: "#1B1B21",
  Inner: ({ s, w, h }) => {
    const f = useCurrentFrame();
    const c = useBrand();
    const t = useTimeline();
    const dollars = lerp(f, t.start(s), t.w(s, 4) + 4, 0, 13);
    const leak = ramp(f, t.w(s, 12) - 3, t.w(s, 12) + 8);
    const sub1 = ramp(f, t.w(s, 5) - 3, t.w(s, 5) + 8);
    const sub2 = ramp(f, t.w(s, 8) - 3, t.w(s, 8) + 8);
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Chip>1 developer</Chip>
          <Chip hot={sub2 > 0.5}>today</Chip>
        </div>
        <div style={{ fontFamily: c.fontStrong, fontSize: 176, lineHeight: 1, color: c.text, letterSpacing: -3 }}>
          ${dollars.toFixed(2)}
        </div>
        <div style={{ fontFamily: c.fontSemi, fontSize: 40, color: c.textSoft, display: "flex", gap: 14 }}>
          <span style={{ opacity: sub1, translate: `0px ${(1 - sub1) * 20}px` }}>per developer</span>
          <span style={{ opacity: sub2, translate: `0px ${(1 - sub2) * 20}px` }}>· per day</span>
        </div>
        {/* the crack that opens on "leaks" */}
        <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
          <polyline
            points={`${w * 0.8},${h} ${w * 0.83},${h * 0.9} ${w * 0.79},${h * 0.83} ${w * 0.85},${h * 0.74} ${w * 0.82},${h * 0.66}`}
            fill="none"
            stroke={c.accent}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={600}
            strokeDashoffset={600 * (1 - leak)}
          />
        </svg>
      </div>
    );
  },
  Over: ({ s, w, h }) => {
    const f = useCurrentFrame();
    const c = useBrand();
    const t = useTimeline();
    const leakAt = t.w(s, 12) + 2;
    const out = ramp(f, t.cut(s + 1) - 6, t.cut(s + 1), EXIT);
    const photo = ramp(f, t.w(s, 4) - 3, t.w(s, 4) + 10, BOUNCE);
    return (
      <>
        {f >= leakAt
          ? Array.from({ length: 7 }).map((_, i) => {
              const period = 22;
              const local = (f - leakAt - i * 5 + period * 4) % period;
              const born = f - leakAt - i * 5;
              if (born < 0) return null;
              const y = h + local * local * 0.42;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: w * 0.8 - 15 + (random(`d${i}`) - 0.5) * 24,
                    top: y,
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    background: c.accent,
                    color: INK,
                    fontFamily: c.fontStrong,
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: (1 - local / period) * (1 - out),
                  }}
                >
                  T
                </div>
              );
            })
          : null}
        <div style={{ position: "absolute", left: -30, top: h - 50, rotate: `${-12 + (1 - photo) * -20}deg`, scale: `${(0.3 + 0.7 * photo) * (1 - out * 0.4)}`, opacity: Math.min(1, photo * 3) * (1 - out) }}>
          <PhotoSlot id="burning-dollar" look="cutout" width={300} height={200} find="Cut-out: a US dollar bill on fire, flames at one corner, no background" />
        </div>
      </>
    );
  },
};

// ── 3 · mistake 01: one endless session ────────────────────────────────────
const session: CardState = {
  bg: "#141418",
  Inner: ({ s, inAt }) => {
    const f = useCurrentFrame();
    const c = useBrand();
    const t = useTimeline();
    const resend = ramp(f, t.w(s, 6) - 3, t.w(s, 6) + 8);
    const qStart = t.w(s, 11);
    const q = typed("what does this regex do?", f, qStart - 2, t.w(s, 13) + 6);
    const pays = t.w(s, 14) - 2;
    const billed = counter(f, pays, pays + 22, 0, 48210);
    const off = (f - inAt) * 0.9;
    return (
      <Col pad={0}>
        <TitleBar title="Session · 6h 12m · 214 messages" logo />
        <div style={{ position: "relative", flex: 1, overflow: "hidden", margin: "0 22px", marginTop: 14 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              border: `3px solid rgba(255,112,36,${resend})`,
              background: `rgba(255,112,36,${0.08 * resend})`,
            }}
          />
          {Array.from({ length: 16 }).map((_, k) => {
            const r = HISTORY[k % HISTORY.length];
            return (
              <div key={k} style={{ position: "absolute", left: 22, top: 18 + k * 42 - off }}>
                <HistoryRow {...r} size={26} />
              </div>
            );
          })}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(#141418, transparent 30%)" }} />
          <div style={{ position: "absolute", right: 18, top: 14, opacity: resend, scale: `${0.7 + 0.3 * ramp(f, t.w(s, 6) - 3, t.w(s, 6) + 8, BOUNCE)}` }}>
            <Chip hot>↑ resent every message</Chip>
          </div>
        </div>
        <div style={{ margin: "18px 22px 22px", padding: "18px 22px", borderRadius: 18, border: "2px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ ...mono(28, c.text), flex: 1 }}>
            <span style={{ color: c.accent }}>{"> "}</span>
            {q}
            {f >= qStart - 4 && f < pays ? <Cursor h={30} /> : null}
          </div>
          {q.length > 0 ? <Chip>9 tokens</Chip> : null}
        </div>
        <div style={{ height: 62, margin: "-8px 22px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: ramp(f, pays, pays + 6) }}>
          <span style={{ fontFamily: c.fontSemi, fontSize: 30, color: c.textSoft }}>billed for this question</span>
          <span style={{ fontFamily: c.fontStrong, fontSize: 52, color: c.accent }}>{fmt(billed)}</span>
        </div>
      </Col>
    );
  },
  Over: ({ s, w }) => {
    const t = useTimeline();
    return <Sticker text="×5,000" at={t.w(s, 16)} outAt={t.cut(s + 1) - 6} x={w * 0.6} y={210} rotate={7} size={96} />;
  },
};

// ── 4 · fix 01: /clear wipes the conversation ──────────────────────────────
const clear: CardState = {
  bg: "#141418",
  Inner: ({ s }) => {
    const f = useCurrentFrame();
    const c = useBrand();
    const t = useTimeline();
    const typeA = t.w(s, 3) - 3;
    const typeB = t.w(s, 4) + 4;
    const cmd = typed("/clear", f, typeA, typeB);
    const enter = t.w(s, 5) - 2;
    const wiped = ramp(f, enter, enter + 12);
    const ctx = counter(f, enter, enter + 14, 48210, 0);
    const rows = HISTORY.slice(4, 10);
    return (
      <Col pad={0}>
        <TitleBar title="claude — ~/shop-app" />
        <div style={{ position: "relative", flex: 1, padding: "20px 30px" }}>
          {rows.map((r, i) => {
            const k = ramp(f, enter + (rows.length - 1 - i) * 1.2, enter + (rows.length - 1 - i) * 1.2 + 7, EXIT);
            return (
              <div key={i} style={{ opacity: 1 - k, translate: `${-60 * k}px 0px`, height: 40 * (1 - k * 0.0) }}>
                <HistoryRow {...r} size={26} />
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 30, top: 30, opacity: ramp(f, enter + 10, enter + 20), translate: `0px ${(1 - ramp(f, enter + 10, enter + 20)) * 20}px` }}>
            <div style={{ ...mono(30, c.accent) }}>✻ Conversation cleared</div>
            <div style={{ ...mono(26, c.textSoft) }}>  fresh context · same project</div>
          </div>
          {/* autocomplete while typing */}
          <div
            style={{
              position: "absolute",
              left: 30,
              right: 30,
              bottom: 8,
              padding: "14px 20px",
              borderRadius: 14,
              background: "rgba(255,112,36,0.12)",
              borderLeft: `6px solid ${c.accent}`,
              display: "flex",
              justifyContent: "space-between",
              opacity: f >= typeA + 3 && f < enter ? 1 : 0,
            }}
          >
            <span style={mono(28, c.text)}>/clear</span>
            <span style={{ fontFamily: c.fontUi, fontSize: 26, color: c.textSoft, alignSelf: "center" }}>Clear conversation history</span>
          </div>
        </div>
        <div style={{ margin: "0 22px", padding: "18px 22px", borderRadius: 18, border: `2px solid ${f >= enter - 3 && f < enter + 3 ? c.accent : "rgba(255,255,255,0.14)"}` }}>
          <div style={mono(32, c.text)}>
            <span style={{ color: c.accent }}>{"> "}</span>
            {f < enter ? cmd : ""}
            <Cursor h={32} />
          </div>
        </div>
        <div style={{ margin: "16px 26px 20px", display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontFamily: c.fontSemi, fontSize: 26, color: c.textSoft, whiteSpace: "nowrap" }}>context</span>
          <div style={{ flex: 1, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${(ctx / 48210) * 100}%`, height: "100%", background: c.accent }} />
          </div>
          <span style={{ fontFamily: c.fontStrong, fontSize: 30, color: wiped > 0.5 ? c.accent : c.text, minWidth: 190, textAlign: "right" }}>{fmt(ctx)}</span>
        </div>
      </Col>
    );
  },
  Over: ({ s, w, h }) => {
    const t = useTimeline();
    return <Sticker text="$0.00" at={t.w(s, 11)} outAt={t.cut(s + 1) - 6} x={w * 0.62} y={h * 0.42} rotate={-7} size={110} />;
  },
};

// ── 5 · mistake 02: "improve this codebase" reads everything ───────────────
const TREE = [
  { d: 0, n: "src/", k: "312 files" },
  { d: 1, n: "components/", k: "88" },
  { d: 1, n: "api/", k: "41" },
  { d: 1, n: "lib/", k: "57" },
  { d: 0, n: "tests/", k: "126" },
  { d: 0, n: "public/", k: "203" },
  { d: 0, n: "scripts/", k: "19" },
  { d: 0, n: "docs/", k: "64" },
];

function TreeRow({ d, n, k, lit, dim }: { d: number; n: string; k: string; lit: number; dim?: number }) {
  const c = useBrand();
  return (
    <div
      style={{
        position: "relative",
        height: 44,
        display: "flex",
        alignItems: "center",
        paddingLeft: 22 + d * 40,
        paddingRight: 22,
        borderRadius: 10,
        background: `rgba(255,112,36,${0.14 * lit})`,
        opacity: 1 - (dim ?? 0) * 0.65,
      }}
    >
      <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 5, borderRadius: 3, background: c.accent, opacity: lit }} />
      <span style={{ ...mono(28, lit > 0.5 ? c.text : c.textSoft), flex: 1 }}>
        <span style={{ color: n.endsWith("/") ? c.accent : c.textSoft }}>{n.endsWith("/") ? "▸ " : "  "}</span>
        {n}
      </span>
      <span style={{ fontFamily: c.fontUi, fontSize: 22, color: lit > 0.5 ? c.accent : "rgba(255,255,255,0.35)" }}>
        {lit > 0.5 ? "read ✓" : k}
      </span>
    </div>
  );
}

function Prompt({ text, cursor, size = 30 }: { text: ReactNode; cursor?: boolean; size?: number }) {
  const c = useBrand();
  return (
    <div style={{ margin: "18px 22px 10px", padding: "16px 22px", borderRadius: 18, border: "2px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)" }}>
      <div style={{ ...mono(size, c.text), whiteSpace: "pre-wrap" }}>
        <span style={{ color: c.accent }}>{"> "}</span>
        {text}
        {cursor ? <Cursor h={size} /> : null}
      </div>
    </div>
  );
}

const repo: CardState = {
  bg: "#141418",
  Inner: ({ s, inAt }) => {
    const f = useCurrentFrame();
    const t = useTimeline();
    const p = typed("improve this codebase", f, t.w(s, 7) - 3, t.w(s, 9) + 8);
    const scanA = t.w(s, 10) - 2;
    const tokens = counter(f, scanA, t.end(s) - 6, 0, 184000);
    return (
      <Col pad={0}>
        <TitleBar title="claude — ~/shop-app · 1,284 files" right={<Chip hot={tokens > 0}>{fmt(tokens)} tokens</Chip>} />
        <Prompt text={p} cursor />
        <div style={{ padding: "4px 22px" }}>
          {TREE.map((r, i) => {
            const appear = ramp(f, inAt + 4 + i * 3, inAt + 14 + i * 3);
            const lit = ramp(f, scanA + i * 5, scanA + i * 5 + 4);
            return (
              <div key={i} style={{ opacity: appear, translate: `${(1 - appear) * 30}px 0px` }}>
                <TreeRow {...r} lit={lit} />
              </div>
            );
          })}
        </div>
      </Col>
    );
  },
};

// ── 6 · fix 02: name the file ───────────────────────────────────────────────
const TREE2 = [
  { d: 0, n: "src/", k: "312 files" },
  { d: 1, n: "api/", k: "41" },
  { d: 2, n: "auth.ts", k: "" },
  { d: 2, n: "cart.ts", k: "" },
  { d: 1, n: "components/", k: "88" },
  { d: 0, n: "tests/", k: "126" },
  { d: 0, n: "public/", k: "203" },
];

const file: CardState = {
  bg: "#141418",
  Inner: ({ s }) => {
    const f = useCurrentFrame();
    const c = useBrand();
    const t = useTimeline();
    const full = "add input validation to the login function in auth.ts";
    const p = typed(full, f, t.w(s, 6) - 3, t.w(s, 14) + 8);
    const hasFile = p.length > full.length - 7;
    const readAt = t.w(s, 15) - 3;
    const diffAt = t.w(s, 17) - 3;
    const doneAt = t.w(s, 18) - 3;
    const tokens = counter(f, readAt, diffAt + 10, 0, 3140);
    const toDiff = ramp(f, diffAt - 4, diffAt + 8);
    const pointer = ramp(f, t.w(s, 5) - 3, t.w(s, 5) + 8, BOUNCE);
    return (
      <Col pad={0}>
        <TitleBar title="claude — ~/shop-app" right={<Chip hot={tokens > 0}>{fmt(tokens)} tokens</Chip>} />
        <Prompt
          size={28}
          cursor={f < readAt}
          text={
            hasFile ? (
              <>
                {p.slice(0, full.length - 7)}
                <span style={{ color: INK, background: c.accent, borderRadius: 6 }}>{p.slice(full.length - 7)}</span>
              </>
            ) : (
              p
            )
          }
        />
        <div style={{ position: "relative", flex: 1 }}>
          <div style={{ position: "absolute", inset: "0 22px", opacity: 1 - toDiff }}>
            {TREE2.map((r, i) => {
              const target = r.n === "auth.ts";
              // pointed at first (half-lit), marked read only when it is read
              const lit = target ? Math.max(pointer * 0.45, ramp(f, readAt, readAt + 5)) : 0;
              return <TreeRow key={i} {...r} k={target && f >= readAt ? "" : r.k} lit={lit} dim={target ? 0 : pointer} />;
            })}
          </div>
          <div style={{ position: "absolute", inset: "4px 22px", opacity: toDiff, translate: `0px ${(1 - toDiff) * 30}px` }}>
            <div style={{ ...mono(26, c.textSoft) }}>
              <span style={{ color: c.accent }}>● </span>Read src/api/auth.ts
            </div>
            <div style={{ marginTop: 10, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 18px" }}>
              <div style={mono(25, c.textSoft)}>{"  export async function login(email, pw) {"}</div>
              {["+   if (!email || !pw) {", "+     throw new Error(\"Missing credentials\")", "+   }"].map((l, i) => {
                const a = ramp(f, diffAt + 2 + i * 3, diffAt + 8 + i * 3);
                return (
                  <div key={i} style={{ ...mono(25, c.text), background: `rgba(255,112,36,${0.16 * a})`, opacity: a, translate: `${(1 - a) * 20}px 0px` }}>
                    <span style={{ color: c.accent }}>{l.slice(0, 1)}</span>
                    {l.slice(1)}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12, opacity: ramp(f, doneAt, doneAt + 6), scale: `${0.8 + 0.2 * ramp(f, doneAt, doneAt + 8, BOUNCE)}`, transformOrigin: "left center" }}>
              <Chip hot>✓ done</Chip>
              <Chip>1 file read</Chip>
            </div>
          </div>
        </div>
      </Col>
    );
  },
};

// ── 7 · mistake 03: no CLAUDE.md, every session rediscovers ────────────────
const EXPLORE = [
  "● Explore src/ …",
  "● Read package.json",
  "● Read README.md",
  "● Search \"how is auth done\"",
  "● Read prisma/schema.prisma",
  "● Search \"test command\"",
];

export function SessionBody({ start, n }: { start: number; n: number }) {
  const f = useCurrentFrame();
  const c = useBrand();
  const shown = Math.max(0, Math.min(EXPLORE.length, Math.floor((f - start) / 7) + 1));
  const tokens = counter(f, start, start + EXPLORE.length * 7, 0, 21400);
  return (
    <Col pad={0}>
      <TitleBar title={`Session ${n} · new`} right={<Chip hot={f >= start}>+{fmt(tokens)} tokens</Chip>} />
      <div style={{ padding: "18px 30px" }}>
        <div style={mono(28, c.accent)}>⚠ No CLAUDE.md – starting from zero</div>
        {EXPLORE.map((l, i) => {
          const a = ramp(f, start + i * 7, start + i * 7 + 5);
          return (
            <div key={i} style={{ ...mono(27, c.textSoft), opacity: i < shown ? a : 0, translate: `${(1 - a) * 20}px 0px` }}>
              <span style={{ color: c.accent }}>● </span>
              {l.slice(2)}
            </div>
          );
        })}
      </div>
    </Col>
  );
}

const sessions: CardState = {
  bg: "#141418",
  Inner: ({ s }) => {
    const t = useTimeline();
    return <SessionBody start={t.start(s) + 8} n={1} />;
  },
  Over: ({ s, w, h, outAt }) => {
    const f = useCurrentFrame();
    const t = useTimeline();
    const starts = [t.w(s, 3) - 3, t.w(s, 6) - 3];
    return (
      <>
        {starts.map((st, i) => {
          const p = ramp(f, st, st + 12);
          const out = ramp(f, outAt - 2, outAt + 12);
          if (f < st) return null;
          // later windows land in front, 70px lower and further right each,
          // and fold back into the main card when the next scene starts
          const dx = 70 * (i + 1) * (1 - out);
          const dy = 70 * (i + 1) * (1 - out);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: dx,
                top: dy + (1 - p) * 500,
                width: w,
                height: h,
                borderRadius: w * 0.038,
                overflow: "hidden",
                background: "#16161B",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.6), 0 -10px 40px rgba(0,0,0,0.35)",
                opacity: Math.min(1, p * 2) * (1 - out),
                scale: `${0.94 + 0.06 * p}`,
              }}
            >
              <SessionBody start={st + 6} n={i + 2} />
            </div>
          );
        })}
      </>
    );
  },
};

// ── 8 · fix 03: write CLAUDE.md once, it loads every session ───────────────
const MD = [
  "# shop-app",
  "Next.js 14 · TypeScript · Prisma",
  "",
  "## Commands",
  "npm run dev · npm test",
  "",
  "## Rules",
  "- API routes live in src/api",
  "- never edit /generated",
];

const memory: CardState = {
  bg: "#141418",
  Inner: ({ s, inAt }) => {
    const f = useCurrentFrame();
    const c = useBrand();
    const t = useTimeline();
    const swap = t.w(s, 6) - 6;
    const toTerm = ramp(f, swap, swap + 10);
    const loadAt = t.w(s, 7) - 3;
    const limitAt = t.w(s, 10) - 3;
    const limit = ramp(f, limitAt, limitAt + 10);
    const writeEnd = swap - 6;
    return (
      <Col pad={0}>
        <div style={{ position: "relative", height: 64, flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0, opacity: 1 - toTerm }}>
            <TitleBar title="CLAUDE.md — ~/shop-app" logo={false} />
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: toTerm }}>
            <TitleBar title="claude — ~/shop-app · new session" />
          </div>
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          {/* the editor */}
          <div style={{ position: "absolute", inset: "14px 22px", opacity: 1 - toTerm, translate: `0px ${-40 * toTerm}px` }}>
            {MD.map((l, i) => {
              const a0 = inAt + 4 + i * ((writeEnd - inAt - 10) / MD.length);
              const a1 = a0 + (writeEnd - inAt - 10) / MD.length;
              const txt = typed(l, f, a0, a1);
              const head = l.startsWith("#");
              return (
                <div key={i} style={{ display: "flex", height: 38 }}>
                  <span style={{ ...mono(24, "rgba(255,255,255,0.25)"), width: 46 }}>{i + 1}</span>
                  <span style={{ ...mono(head ? 28 : 26, head ? c.accent : c.text), fontWeight: head ? 700 : 400 }}>
                    {txt}
                    {f >= a0 && f < a1 ? <Cursor h={28} /> : null}
                  </span>
                </div>
              );
            })}
          </div>
          {/* the new session that picks it up */}
          <div style={{ position: "absolute", inset: "24px 30px", opacity: toTerm, translate: `0px ${40 * (1 - toTerm)}px` }}>
            <div style={mono(28, c.textSoft)}>✻ Welcome to Claude Code</div>
            <div
              style={{
                marginTop: 18,
                padding: "16px 20px",
                borderRadius: 14,
                background: "rgba(255,112,36,0.12)",
                borderLeft: `6px solid ${c.accent}`,
                opacity: ramp(f, loadAt, loadAt + 6),
                scale: `${0.9 + 0.1 * ramp(f, loadAt, loadAt + 10, BOUNCE)}`,
                transformOrigin: "left center",
              }}
            >
              <div style={mono(30, c.text)}>
                <span style={{ color: c.accent }}>✓ </span>Loaded memory: CLAUDE.md
              </div>
            </div>
            <div style={{ marginTop: 22, ...mono(28, c.text) }}>
              <span style={{ color: c.accent }}>{"> "}</span>
              {typed("fix the cart total bug", f, loadAt + 10, loadAt + 26)}
            </div>
            <div style={{ ...mono(27, c.textSoft), opacity: ramp(f, loadAt + 30, loadAt + 36) }}>
              <span style={{ color: c.accent }}>● </span>Read src/api/cart.ts — no exploring
            </div>
          </div>
        </div>
        <div style={{ margin: "0 26px 22px", display: "flex", alignItems: "center", gap: 18, opacity: 0.35 + 0.65 * limit }}>
          <span style={{ fontFamily: c.fontSemi, fontSize: 26, color: c.textSoft, whiteSpace: "nowrap" }}>CLAUDE.md</span>
          <div style={{ position: "relative", flex: 1, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.08)" }}>
            <div style={{ width: `${(9 / 200) * 100 * Math.max(0.2, limit)}%`, height: "100%", borderRadius: 7, background: c.accent }} />
          </div>
          <span style={{ fontFamily: c.fontStrong, fontSize: 30, color: limit > 0.5 ? c.accent : c.text, whiteSpace: "nowrap" }}>9 / 200 lines</span>
        </div>
      </Col>
    );
  },
};

// ── 9 · cta: the tank fills back up beside a short, clean session ──────────
const CLEAN = [
  { you: true, t: "/clear" },
  { you: false, t: "Loaded memory: CLAUDE.md" },
  { you: true, t: "validate login in auth.ts" },
  { you: false, t: "Read src/api/auth.ts" },
  { you: false, t: "Done · 3,140 tokens" },
];

const cta: CardState = {
  bg: "#141418",
  Inner: ({ inAt }) => {
    const f = useCurrentFrame();
    return (
      <Col pad={0}>
        <TitleBar title="claude — ~/shop-app" right={<Chip hot>3,140 tokens</Chip>} />
        <div style={{ padding: "26px 30px" }}>
          {CLEAN.map((r, i) => {
            const a = ramp(f, inAt + 6 + i * 6, inAt + 14 + i * 6);
            return (
              <div key={i} style={{ height: 50, opacity: a, translate: `0px ${(1 - a) * 18}px` }}>
                <HistoryRow {...r} size={30} />
              </div>
            );
          })}
        </div>
      </Col>
    );
  },
  Over: ({ s, w, h, inAt }) => {
    const f = useCurrentFrame();
    const t = useTimeline();
    const v = lerp(f, t.w(s, 2), t.w(s, 7), 0.05, 1) + Math.sin(f / 4) * 0.006;
    const p = ramp(f, inAt, inAt + 12, BOUNCE);
    return (
      <>
        <div style={{ position: "absolute", left: w - 300, top: h - 330, rotate: "8deg", scale: `${0.6 + 0.4 * p}`, opacity: Math.min(1, p * 2) }}>
          <Gauge value={Math.min(1, v)} size={290} />
        </div>
        <Sticker text="COMMENT ↓" at={t.w(s, 2)} outAt={t.end(s) + 30} x={w * 0.3} y={h + 10} rotate={-6} size={84} />
      </>
    );
  },
};

export const STATES: CardState[] = [hook, cost, session, clear, repo, file, sessions, memory, cta];

// The card's box (canvas px) in each state – the shared element morphs
// between them.
export type Box = { x: number; y: number; w: number; h: number };
export const BOXES: Box[] = [
  { x: 90, y: 540, w: 900, h: 520 }, // hook terminal
  { x: 140, y: 560, w: 800, h: 380 }, // $13 counter
  { x: 110, y: 500, w: 860, h: 560 }, // session
  { x: 90, y: 500, w: 900, h: 560 }, // /clear terminal
  { x: 90, y: 500, w: 900, h: 560 }, // repo tree
  { x: 90, y: 500, w: 900, h: 560 }, // auth.ts
  { x: 90, y: 480, w: 760, h: 440 }, // session stack (back window)
  { x: 90, y: 500, w: 900, h: 560 }, // CLAUDE.md
  { x: 90, y: 560, w: 900, h: 480 }, // cta terminal
];
