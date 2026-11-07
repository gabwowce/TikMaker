import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { FreeScene } from "../FreeVideo";
import {
  C,
  CL,
  Chip,
  Cursor,
  Gauge,
  Headline,
  MONO,
  PromptBox,
  SANS,
  Stamp,
  Window,
  prog,
  typed,
  usePop,
  wordAt,
} from "./kit";

type P = { s: FreeScene };

// Scene 6: a precise prompt – one read, one small edit.
const DIFF = [
  [" ", "12", "export async function login(e, pw) {"],
  ["+", "13", "  if (!isEmail(e)) throw badInput()"],
  ["+", "14", "  if (pw.length < 8) throw badInput()"],
  [" ", "15", "  const user = await db.find(e)"],
] as const;

export function Scene6({ s }: P) {
  const f = useCurrentFrame();
  // prompt words, typed on the frame each one is spoken
  const words = "add input validation to the login function in auth.ts".split(" ");
  const wFrames = words.map((_, i) => wordAt(s, 6 + i, [59, 66, 75, 90, 94, 97, 106, 117, 123][i]));
  const shown = words
    .map((w, i) => typed(w, f, wFrames[i], 0.9))
    .filter((w) => w.length > 0)
    .join(" ");
  const sent = wFrames[8] + 14;
  const few = wordAt(s, 16, 167);
  const done = wordAt(s, 18, 191);
  const read = usePop(sent + 4);
  const upd = prog(f, sent + 14, sent + 24);
  const fileTag = usePop(wordAt(s, 5, 38));
  const typing = f < sent;
  return (
    <AbsoluteFill>
      <Chip label="FIX 02" tone="good" />
      <Headline text="Point at the file" top={300} size={100} />
      <div
        style={{
          position: "absolute",
          top: 420,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, fileTag * 2),
          scale: String(interpolate(fileTag, [0, 1], [0.5, 1])),
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 700, color: C.blue, background: "#14243A", border: `3px solid ${C.blue}`, borderRadius: 14, padding: "6px 24px" }}>
          @src/auth.ts
        </div>
      </div>
      <Window title="claude — ~/my-app" glow={f > done ? C.good : undefined} style={{ left: 70, top: 540, width: 940, height: 840 }}>
        <div style={{ position: "absolute", left: 30, right: 30, top: 26, fontSize: 28 }}>
          {typing ? (
            <div
              style={{
                border: `2px solid ${C.claude}`,
                borderRadius: 14,
                padding: "20px 24px",
                marginBottom: 360,
                lineHeight: 1.5,
              }}
            >
              <div>
                <span style={{ color: C.claude }}>✻ </span>Welcome to <b>Claude Code</b>
              </div>
              <div style={{ color: C.dim, fontSize: 24, marginTop: 10 }}>/help for help · cwd: ~/my-app</div>
            </div>
          ) : null}
          {typing ? (
            <PromptBox>
              <span style={{ whiteSpace: "pre-wrap" }}>{shown}</span>
              <Cursor h={30} />
            </PromptBox>
          ) : (
            <div style={{ color: C.text, lineHeight: 1.35 }}>
              <span style={{ color: C.dim }}>&gt; </span>
              {shown.replace("auth.ts", "")}
              <span style={{ color: C.blue }}>auth.ts</span>
            </div>
          )}
          {!typing ? (
            <div style={{ marginTop: 34, opacity: Math.min(1, read * 2), translate: `0px ${(1 - read) * 30}px` }}>
              <div>
                <span style={{ color: C.good }}>● </span>Read(<span style={{ color: C.blue }}>src/auth.ts</span>)
              </div>
              <div style={{ color: C.dim, paddingLeft: 36, marginTop: 6 }}>└ Read 84 lines</div>
            </div>
          ) : null}
          {upd > 0 ? (
            <div style={{ marginTop: 26, opacity: upd, translate: `0px ${(1 - upd) * 30}px` }}>
              <div>
                <span style={{ color: C.good }}>● </span>Update(<span style={{ color: C.blue }}>src/auth.ts</span>)
              </div>
              <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", border: `2px solid ${C.line}` }}>
                {DIFF.map(([sign, n, code], i) => {
                  const add = sign === "+";
                  const p = prog(f, sent + 18 + i * 4, sent + 26 + i * 4);
                  return (
                    <div
                      key={n}
                      style={{
                        display: "flex",
                        fontSize: 24,
                        lineHeight: "48px",
                        whiteSpace: "nowrap",
                        background: add ? `rgba(59,224,143,${0.16 * p})` : "transparent",
                        opacity: 0.3 + p * 0.7,
                      }}
                    >
                      <span style={{ width: 60, textAlign: "right", color: C.faint, marginRight: 14 }}>{n}</span>
                      <span style={{ width: 30, color: add ? C.good : C.faint }}>{sign}</span>
                      <span style={{ color: add ? "#C9F7DE" : C.dim }}>{code}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        {f >= few ? (
          <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, display: "flex", gap: 18 }}>
            {[
              ["1 file read", few],
              ["~3k tokens", few + 6],
            ].map(([t, at]) => (
              <Badge key={t as string} at={at as number} text={t as string} />
            ))}
          </div>
        ) : null}
      </Window>
      <Stamp at={done} color={C.good} rotate={-6} style={{ top: 1140, right: 70, fontSize: 84 }}>
        ✓ DONE
      </Stamp>
    </AbsoluteFill>
  );
}

function Badge({ at, text }: { at: number; text: string }) {
  const p = usePop(at);
  return (
    <div
      style={{
        scale: String(interpolate(p, [0, 1], [0.5, 1])),
        opacity: Math.min(1, p * 2),
        padding: "12px 24px",
        borderRadius: 999,
        background: `${C.good}22`,
        border: `3px solid ${C.good}`,
        color: C.good,
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: 30,
      }}
    >
      {text}
    </div>
  );
}

// Scene 7: three fresh sessions, the same exploration three times.
const EXPLORE = [
  ["✻", "Exploring the project…", C.claude],
  ["●", "Glob(**/*) → 1,284 files", C.text],
  ["●", "Read(package.json)", C.text],
  ["●", "Read(src/index.ts)", C.text],
  ["●", "Read(README.md)", C.text],
] as const;

function SessionWindow({ at, n, slot, f }: { at: number; n: number; slot: number; f: number }) {
  const p = prog(f, at, at + 12);
  if (f < at) return null;
  const top = 580 + slot * 210;
  return (
    <Window
      title={`session ${n} · fresh start`}
      glow={slot > 1.5 ? C.burn : undefined}
      style={{
        left: 90,
        width: 900,
        height: 340,
        top: top + (1 - p) * 300,
        opacity: p,
        scale: String(0.9 + Math.min(2, slot) * 0.05),
        filter: `brightness(${Math.min(1, 0.5 + slot * 0.25)})`,
      }}
    >
      <div style={{ position: "absolute", left: 30, right: 30, top: 24 }}>
        {EXPLORE.map(([g, t, col], i) => {
          const q = prog(f, at + 6 + i * 4, at + 12 + i * 4);
          return (
            <div key={i} style={{ height: 50, fontSize: 28, whiteSpace: "nowrap", opacity: q, color: col }}>
              <span style={{ color: g === "✻" ? C.claude : C.good }}>{g} </span>
              {t}
            </div>
          );
        })}
      </div>
    </Window>
  );
}

export function Scene7({ s }: P) {
  const f = useCurrentFrame();
  const no = wordAt(s, 1, 22);
  const every = wordAt(s, 3, 68);
  const rediscovers = wordAt(s, 7, 117);
  const everyTime = wordAt(s, 10, 154);
  const missing = usePop(no);
  const sessions = [every, every + 26, rediscovers + 6];
  const count = sessions.filter((a) => f >= a).length;
  const shift = sessions.reduce((acc, a) => acc + prog(f, a, a + 12), 0);
  const fileOut = prog(f, every - 6, every + 6);
  return (
    <AbsoluteFill>
      <Chip label="MISTAKE 03" tone="burn" />
      <Headline text="No CLAUDE.md" top={300} size={120} />
      {/* the missing file */}
      <div
        style={{
          position: "absolute",
          left: 340,
          top: 620,
          width: 400,
          height: 480,
          opacity: Math.min(1, missing * 2) * (1 - fileOut),
          scale: String(interpolate(missing, [0, 1], [0.6, 1]) - fileOut * 0.3),
          border: `6px dashed ${C.faint}`,
          borderRadius: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 44, color: C.faint, fontWeight: 700 }}>CLAUDE.md</div>
        <div style={{ fontFamily: MONO, fontSize: 30, color: C.burn, letterSpacing: 4 }}>NOT FOUND</div>
        <svg width={400} height={480} style={{ position: "absolute", inset: 0 }}>
          <line x1={40} y1={440} x2={360} y2={40} stroke={C.burn} strokeWidth={12} strokeLinecap="round" strokeDasharray={520} strokeDashoffset={520 * (1 - prog(f, no + 4, no + 16))} />
        </svg>
      </div>
      {sessions.map((at, i) => (
        <SessionWindow key={i} at={at} n={i + 1} slot={i - (shift - 3)} f={f} />
      ))}
      <Stamp at={everyTime} color={C.burn} rotate={-6} style={{ top: 470, right: 70, fontSize: 80, color: "#fff" }}>
        ×{count} from zero
      </Stamp>
    </AbsoluteFill>
  );
}

// Scene 8: a short CLAUDE.md, then a new session loads it.
const MD = [
  ["# my-app", C.claude],
  ["Stack: Next.js + Postgres", C.text],
  ["Run:   npm run dev", C.text],
  ["Test:  npm test", C.text],
  ["Style: TypeScript, named exports", C.text],
  ["Never edit src/generated/", C.amber],
] as const;

export function Scene8({ s }: P) {
  const f = useCurrentFrame();
  const it = wordAt(s, 6, 69);
  const keep = wordAt(s, 10, 108);
  const two = wordAt(s, 13, 125);
  const lineAt = (i: number) => 4 + i * 9;
  const session = prog(f, it - 2, it + 12);
  const loaded = usePop(it + 10);
  const bar = prog(f, keep - 2, keep + 14);
  const limit = usePop(two);
  return (
    <AbsoluteFill>
      <Chip label="FIX 03" tone="good" />
      <Headline text="Write it once" top={300} size={110} />
      <Window title="CLAUDE.md" style={{ left: 70, top: 460, width: 940, height: 440 }}>
        <div style={{ position: "absolute", left: 24, right: 24, top: 22 }}>
          {MD.map(([t, col], i) => {
            const txt = typed(t, f, lineAt(i), 2.2);
            return (
              <div key={i} style={{ height: 54, fontSize: 30, whiteSpace: "pre", display: "flex" }}>
                <span style={{ width: 54, color: C.faint, textAlign: "right", marginRight: 26 }}>{i + 1}</span>
                <span style={{ color: col, fontWeight: i === 0 ? 700 : 400 }}>{txt}</span>
                {f >= lineAt(i) && f < lineAt(i + 1) && i < MD.length ? <Cursor h={30} /> : null}
              </div>
            );
          })}
        </div>
      </Window>
      <Window
        title="claude — new session"
        glow={C.good}
        style={{ left: 70, top: 940, width: 940, height: 230, opacity: session, translate: `0px ${(1 - session) * 120}px` }}
      >
        <div style={{ position: "absolute", left: 30, right: 30, top: 24, fontSize: 30 }}>
          <div style={{ color: C.claude }}>✻ Welcome to Claude Code</div>
          <div style={{ marginTop: 16, opacity: Math.min(1, loaded * 2), translate: `${(1 - loaded) * 40}px 0px` }}>
            <span style={{ color: C.good }}>✓ </span>loaded <span style={{ color: C.claude }}>CLAUDE.md</span>
            <span style={{ color: C.dim }}> · 6 lines</span>
          </div>
        </div>
      </Window>
      {/* the 200-line budget */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 1215, opacity: bar }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 28, color: C.dim, marginBottom: 12 }}>
          <span>
            <span style={{ color: C.good, fontWeight: 700 }}>6</span> lines
          </span>
          <span style={{ color: C.text, fontWeight: 700, opacity: Math.min(1, limit * 2) }}>max 200</span>
        </div>
        <div style={{ position: "relative", height: 34, borderRadius: 17, background: C.panel2, border: `2px solid ${C.line}` }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${3 * bar + 2}%`, borderRadius: 17, background: C.good }} />
          <div
            style={{
              position: "absolute",
              right: -4,
              top: -14,
              width: 8,
              height: 62,
              borderRadius: 4,
              background: C.text,
              scale: `1 ${limit}`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Scene 9: the gauge from the opening fills back up.
export function Scene9({ s }: P) {
  const f = useCurrentFrame();
  const comment = wordAt(s, 2, 10);
  const fuel = interpolate(f, [0, 55], [0.04, 0.97], { ...CL, easing: (t) => 1 - Math.pow(1 - t, 3) });
  const bubble = usePop(comment - 2);
  const lines = [
    ["/clear", "between tasks"],
    ["@auth.ts", "name the file"],
    ["CLAUDE.md", "write it once"],
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: 180, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Gauge value={fuel} size={620} label={fuel > 0.9 ? "FULL TANK" : "TOKENS"} />
      </div>
      <Window title="claude — ~/my-app" glow={C.good} style={{ left: 90, top: 680, width: 900, height: 330 }}>
        <div style={{ position: "absolute", left: 30, right: 30, top: 26 }}>
          {lines.map(([cmd, note], i) => {
            const p = prog(f, 6 + i * 10, 16 + i * 10);
            return (
              <div key={cmd} style={{ height: 76, fontSize: 34, display: "flex", alignItems: "center", gap: 18, opacity: p, translate: `${(1 - p) * 60}px 0px` }}>
                <span style={{ color: C.good }}>✓</span>
                <span style={{ color: C.claude, fontWeight: 700, width: 230 }}>{cmd}</span>
                <span style={{ color: C.dim }}>{note}</span>
              </div>
            );
          })}
        </div>
      </Window>
      {/* comment bubble CTA */}
      <div
        style={{
          position: "absolute",
          top: 1080,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, bubble * 2),
          scale: String(interpolate(bubble, [0, 1], [0.4, 1]) * (1 + Math.sin(f * 0.25) * 0.02)),
        }}
      >
        <div style={{ position: "relative", background: C.text, color: C.bg, borderRadius: 40, padding: "26px 44px", fontFamily: SANS, fontWeight: 900, fontSize: 64, letterSpacing: -1 }}>
          Comment for more tips
          <div style={{ position: "absolute", left: 90, bottom: -34, width: 0, height: 0, borderLeft: "20px solid transparent", borderRight: "26px solid transparent", borderTop: `40px solid ${C.text}` }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

