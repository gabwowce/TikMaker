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
  easeIn,
  fmt,
  prog,
  typed,
  usePop,
  wordAt,
} from "./kit";

type P = { s: FreeScene };

// Fake Claude Code activity – the endless scroll of scene 1.
const LOG = [
  ["●", "Read(src/app/page.tsx)", C.good],
  ["└", "Read 412 lines", C.dim],
  ["●", "Search(\"useAuth\", **/*.ts)", C.good],
  ["└", "Found 38 files", C.dim],
  ["✻", "Thinking…", C.claude],
  ["●", "Read(src/lib/db.ts)", C.good],
  ["└", "Read 1,204 lines", C.dim],
  ["●", "Read(package-lock.json)", C.good],
  ["└", "Read 18,330 lines", C.burn],
  ["●", "Bash(npm test)", C.good],
  ["└", "… 640 lines of output", C.dim],
  ["✻", "Reconsidering approach…", C.claude],
  ["●", "Read(src/components/**)", C.good],
  ["└", "Read 57 files", C.dim],
] as const;

export function Scene1({ s }: P) {
  const f = useCurrentFrame();
  const three = wordAt(s, 9, 63);
  const scroll = f * 15 + interpolate(f, [0, 98], [0, 260]);
  const tokens = 380000 + f * f * 70;
  // needle: drains fast, wobbles, slams onto E
  const fuel = interpolate(f, [0, 20, 55, 85], [0.92, 0.7, 0.3, 0.04], CL) + Math.sin(f * 0.9) * 0.015;
  const termIn = prog(f, 0, 10);
  return (
    <AbsoluteFill>
      <Window
        title="claude — ~/my-app"
        glow={C.burn}
        style={{ left: 70, top: 200, width: 940, height: 820, scale: String(0.94 + termIn * 0.06) }}
        right={
          <div style={{ fontFamily: MONO, fontSize: 24, color: C.burn, fontWeight: 700 }}>↑ {fmt(tokens)} tok</div>
        }
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 22%, #000 100%)",
          }}
        >
          <div style={{ position: "absolute", left: 34, right: 34, top: 40, translate: `0px ${-scroll}px` }}>
            {Array.from({ length: 6 }).flatMap((_, rep) =>
              LOG.map(([glyph, txt, col], i) => (
                <div
                  key={`${rep}-${i}`}
                  style={{
                    height: 56,
                    display: "flex",
                    gap: 18,
                    paddingLeft: glyph === "└" ? 36 : 0,
                    color: glyph === "└" ? C.dim : C.text,
                    fontSize: 30,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ color: col }}>{glyph}</span>
                  <span style={{ color: glyph === "└" ? col : C.text }}>{txt}</span>
                </div>
              )),
            )}
          </div>
        </div>
      </Window>
      <div style={{ position: "absolute", top: 1010, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ opacity: prog(f, 4, 14), translate: `0px ${(1 - prog(f, 4, 16)) * 80}px` }}>
          <Gauge value={fuel} size={560} />
        </div>
      </div>
      <Stamp at={three} color={C.yellow} rotate={-8} style={{ top: 140, right: 50, fontSize: 92 }}>
        3 FIXES
      </Stamp>
    </AbsoluteFill>
  );
}

function Coin({ at, x, f }: { at: number; x: number; f: number }) {
  const t = f - at;
  if (t < 0) return null;
  const y = 0.9 * t * t + 6 * t;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 26,
        top: 1050 + y,
        width: 52,
        height: 52,
        borderRadius: 26,
        background: `radial-gradient(circle at 35% 30%, #FFE98A, ${C.amber} 60%, #B8740A)`,
        border: "3px solid #8A5600",
        color: "#6B4200",
        fontFamily: SANS,
        fontWeight: 900,
        fontSize: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        rotate: `${t * 14}deg`,
        opacity: interpolate(y, [0, 220, 300], [1, 1, 0], CL),
      }}
    >
      $
    </div>
  );
}

export function Scene2({ s }: P) {
  const f = useCurrentFrame();
  const thirteen = wordAt(s, 3, 26);
  const per = wordAt(s, 5, 50);
  const day = wordAt(s, 8, 70);
  const leaks = wordAt(s, 9, 90);
  const amount = interpolate(f, [4, thirteen + 14], [0, 13], { ...CL, easing: easeIn }) ;
  const settle = usePop(thirteen + 14, 8);
  const cal = usePop(day - 4);
  const pipe = prog(f, leaks - 6, leaks + 8);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 230,
          width: "100%",
          textAlign: "center",
          fontFamily: MONO,
          fontSize: 34,
          letterSpacing: 8,
          color: C.dim,
          opacity: prog(f, 0, 10),
        }}
      >
        AVERAGE SPEND
      </div>
      <div
        style={{
          position: "absolute",
          top: 270,
          width: "100%",
          textAlign: "center",
          fontFamily: SANS,
          fontWeight: 900,
          fontSize: 300,
          letterSpacing: -12,
          color: C.text,
          fontVariantNumeric: "tabular-nums",
          scale: String(1 + (f > thirteen + 14 ? (1 - settle) * 0.15 : 0)),
        }}
      >
        <span style={{ color: C.amber }}>$</span>
        {amount.toFixed(2)}
      </div>
      <div
        style={{
          position: "absolute",
          top: 660,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 40,
          opacity: prog(f, per - 2, per + 8),
        }}
      >
        <div
          style={{
            width: 190,
            height: 200,
            borderRadius: 22,
            background: C.text,
            overflow: "hidden",
            scale: String(interpolate(cal, [0, 1], [0.5, 1])),
            rotate: `${interpolate(cal, [0, 1], [-14, -4])}deg`,
            boxShadow: "0 20px 50px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ height: 56, background: C.burn, color: "#fff", fontFamily: MONO, fontWeight: 700, fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: 4 }}>
            TODAY
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 120, color: C.bg, textAlign: "center", lineHeight: "140px" }}>
            1
          </div>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 64, color: C.text, lineHeight: 1.1 }}>
          per developer
          <br />
          <span style={{ color: C.dim, opacity: prog(f, day - 2, day + 6) }}>every day</span>
        </div>
      </div>
      {/* the leaking pipe */}
      <div style={{ position: "absolute", top: 960, left: 0, width: 1080, height: 110, translate: `${(1 - pipe) * -1100}px 0px` }}>
        <div
          style={{
            position: "absolute",
            left: -20,
            right: -20,
            top: 0,
            height: 110,
            background: "linear-gradient(to bottom, #5C6170, #A9AFBE 30%, #6E7383 60%, #3A3D48)",
            boxShadow: "0 20px 40px rgba(0,0,0,.5)",
          }}
        />
        {[200, 860].map((x) => (
          <div key={x} style={{ position: "absolute", left: x, top: -14, width: 40, height: 138, borderRadius: 8, background: "linear-gradient(to right, #4A4E5A, #9097A6, #4A4E5A)" }} />
        ))}
        <div style={{ position: "absolute", left: 290, top: 30, fontFamily: MONO, fontWeight: 700, fontSize: 44, letterSpacing: 10, color: "#22242C" }}>
          TOKENS
        </div>
        <svg style={{ position: "absolute", left: 600, top: 18 }} width={120} height={92}>
          <path d="M60 0 L48 26 L70 40 L52 62 L66 92" stroke="#15161B" strokeWidth={9} fill="none" strokeLinejoin="round" />
          <path d="M52 62 L28 74 M70 40 L96 46" stroke="#15161B" strokeWidth={5} fill="none" />
        </svg>
      </div>
      {Array.from({ length: 9 }).map((_, i) => (
        <Coin key={i} at={leaks + 4 + i * 5} x={660 + Math.sin(i * 2.3) * 18} f={f} />
      ))}
      {/* the drip itself */}
      <div
        style={{
          position: "absolute",
          left: 646,
          top: 1068,
          width: 28,
          height: interpolate(f, [leaks, leaks + 10], [0, 60], CL),
          borderRadius: 14,
          background: `linear-gradient(${C.amber}, transparent)`,
          opacity: 0.8,
        }}
      />
    </AbsoluteFill>
  );
}

// Scene 3: the tiny question drags the whole history with it.
const HISTORY = [
  "fix the navbar overflow",
  "Done – updated Header.tsx",
  "now add dark mode",
  "Added theme toggle + 4 files",
  "why is the build failing?",
  "Missing env var – fixed",
  "write tests for cart",
  "Added 12 tests in cart.test.ts",
  "refactor the api client",
  "Moved fetch logic to api.ts",
  "update the README",
  "README rewritten (240 lines)",
  "rename user → account",
  "Renamed across 31 files",
];

export function Scene3({ s }: P) {
  const f = useCurrentFrame();
  const every = wordAt(s, 4, 55);
  const whole = wordAt(s, 8, 88);
  const oneLine = wordAt(s, 12, 124);
  const pays = wordAt(s, 14, 148);
  const n = Math.floor(interpolate(f, [every, whole + 8], [0, HISTORY.length], CL));
  const q = usePop(oneLine - 3);
  const send = prog(f, pays - 6, pays + 22);
  const tokens = interpolate(f, [pays - 4, pays + 20], [0, 48210], { ...CL, easing: easeIn });
  const bracket = prog(f, whole - 4, whole + 12);
  const lift = 0;
  return (
    <AbsoluteFill>
      <Chip label="MISTAKE 01" tone="burn" />
      <Headline text="One endless session" top={300} size={100} accent="endless" />
      {/* before the history piles up: the session clock runs and runs */}
      <div
        style={{
          position: "absolute",
          top: 700,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: prog(f, 14, 24) * (1 - prog(f, every - 2, every + 6)),
          scale: String(0.9 + prog(f, 14, 30) * 0.1),
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 32, letterSpacing: 8, color: C.dim }}>SESSION OPEN FOR</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 150, color: C.burn, fontVariantNumeric: "tabular-nums" }}>
          {(() => {
            const mins = Math.floor(interpolate(f, [14, every], [95, 412], CL));
            return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
          })()}
        </div>
      </div>
      <div style={{ position: "absolute", left: 110, width: 780, top: 540, translate: `0px ${lift}px` }}>
        {HISTORY.slice(0, n).map((msg, i) => {
          const user = i % 2 === 0;
          const age = n - i;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: user ? "flex-end" : "flex-start",
                height: 40,
                marginBottom: 4,
                opacity: interpolate(age, [1, 14], [1, 0.55], CL),
              }}
            >
              <div
                style={{
                  maxWidth: 600,
                  padding: "6px 18px",
                  borderRadius: 12,
                  fontFamily: MONO,
                  fontSize: 21,
                  lineHeight: "28px",
                  whiteSpace: "nowrap",
                  color: user ? C.text : C.dim,
                  background: user ? "#2A2230" : C.panel2,
                  // every old message lights up as it gets sent again, newest first
                  border: `2px solid ${f >= pays - 4 + age * 1.5 ? C.burn : user ? "#4A3346" : C.line}`,
                }}
              >
                {msg}
              </div>
            </div>
          );
        })}
      </div>
      {/* the bracket that says "all of this gets sent" */}
      <div
        style={{
          position: "absolute",
          left: 920,
          top: 540,
          width: 26,
          height: interpolate(bracket, [0, 1], [0, 716]),
          borderTop: `5px solid ${C.burn}`,
          borderRight: `5px solid ${C.burn}`,
          borderBottom: bracket > 0.98 ? `5px solid ${C.burn}` : undefined,
          borderRadius: "0 14px 14px 0",
          translate: `0px ${lift}px`,
          opacity: bracket > 0 ? 1 : 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 1176,
          translate: `0px ${lift}px`,
          opacity: Math.min(1, q * 2),
          scale: String(interpolate(q, [0, 1], [0.6, 1])),
        }}
      >
        <div
          style={{
            margin: "0 auto",
            width: 800,
            padding: "16px 24px",
            borderRadius: 16,
            border: `3px solid ${C.yellow}`,
            background: "#1E1C10",
            fontFamily: MONO,
            fontSize: 32,
            color: C.text,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            <span style={{ color: C.yellow }}>&gt; </span>what does this regex do?
          </span>
          <span style={{ color: C.yellow, fontSize: 24, alignSelf: "center" }}>9 tok</span>
        </div>
      </div>
      {/* the bill */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          margin: "0 auto",
          width: "fit-content",
          top: 1290,
          translate: `0px ${lift}px`,
          opacity: send > 0 ? 1 : 0,
          scale: String(0.8 + send * 0.2),
          background: C.burn,
          color: "#fff",
          borderRadius: 16,
          padding: "10px 22px",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 40,
          boxShadow: `0 0 50px ${C.burn}88`,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        you pay {fmt(tokens)} tok
      </div>
    </AbsoluteFill>
  );
}

// Scene 4: /clear wipes the conversation.
const CONVO = [
  ["> ", "fix the navbar overflow"],
  ["● ", "Update(Header.tsx)"],
  ["> ", "now add dark mode"],
  ["● ", "Write(theme.ts)"],
  ["> ", "why is the build failing?"],
  ["● ", "Bash(npm run build)"],
  ["> ", "write tests for cart"],
  ["● ", "Write(cart.test.ts)"],
  ["> ", "refactor the api client"],
  ["● ", "Update(api.ts)"],
  ["> ", "rename user → account"],
  ["● ", "Update(31 files)"],
] as const;

export function Scene4({ s }: P) {
  const f = useCurrentFrame();
  const type = wordAt(s, 2, 27);
  const clear = wordAt(s, 4, 51);
  const costs = wordAt(s, 10, 103);
  const enter = clear + 10;
  const cmd = typed("/clear", f, type + 2, 0.28);
  const wiped = prog(f, enter, enter + 16);
  const ctx = interpolate(f, [enter, enter + 18], [87, 0], CL);
  const menu = f >= type + 6 && f < enter;
  return (
    <AbsoluteFill>
      <Chip label="FIX 01" tone="good" />
      <Headline text="Type /clear" top={300} size={110} />
      <Window
        title="claude — ~/my-app"
        glow={wiped > 0.5 ? C.good : undefined}
        style={{ left: 70, top: 470, width: 940, height: 880 }}
      >
        <div style={{ position: "absolute", left: 34, right: 34, top: 30 }}>
          {CONVO.map(([g, t], i) => {
            const p = prog(f, enter + i * 1.2, enter + i * 1.2 + 8);
            return (
              <div
                key={i}
                style={{
                  height: 46,
                  fontSize: 27,
                  whiteSpace: "nowrap",
                  color: g === "> " ? C.text : C.dim,
                  opacity: 1 - p,
                  translate: `0px ${-p * 120}px`,
                }}
              >
                <span style={{ color: g === "> " ? C.dim : C.good }}>{g}</span>
                {t}
              </div>
            );
          })}
        </div>
        {wiped > 0.6 ? (
          <div style={{ position: "absolute", left: 34, top: 40, fontSize: 28, color: C.dim, opacity: prog(f, enter + 10, enter + 18) }}>
            (no content)
          </div>
        ) : null}
        {menu ? (
          <div
            style={{
              position: "absolute",
              left: 34,
              right: 34,
              bottom: 150,
              padding: "14px 20px",
              borderRadius: 12,
              background: C.panel2,
              border: `2px solid ${C.line}`,
              fontSize: 26,
            }}
          >
            <span style={{ color: C.claude, fontWeight: 700 }}>/clear</span>
            <span style={{ color: C.dim }}>{"   Clear conversation history"}</span>
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 34, right: 34, bottom: 60 }}>
          <PromptBox>
            {f >= enter ? "" : <span style={{ color: C.claude }}>{cmd}</span>}
            <Cursor h={32} />
          </PromptBox>
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, bottom: 18, display: "flex", justifyContent: "space-between", fontSize: 22, color: C.dim }}>
          <span>? for shortcuts</span>
          <span style={{ color: ctx > 40 ? C.burn : C.good, fontWeight: 700 }}>context {Math.round(ctx)}% used</span>
        </div>
      </Window>
      <Stamp at={costs} color={C.good} rotate={6} style={{ top: 860, left: 330, fontSize: 110 }}>
        $0.00
      </Stamp>
    </AbsoluteFill>
  );
}

// Scene 5: one vague prompt lights up the whole tree.
const TREE = [
  ["src/", 0],
  ["components/", 1],
  ["Header.tsx", 2],
  ["Cart.tsx", 2],
  ["api/", 1],
  ["client.ts", 2],
  ["auth.ts", 2],
  ["utils/", 1],
  ["tests/", 0],
  ["docs/", 0],
  ["scripts/", 0],
  ["public/", 0],
  ["package.json", 0],
  ["README.md", 0],
] as const;

export function Scene5({ s }: P) {
  const f = useCurrentFrame();
  const improve = wordAt(s, 7, 76);
  const makes = wordAt(s, 10, 111);
  const prompt = typed("improve this codebase", f, improve, 0.75);
  const lit = interpolate(f, [makes, s.durationInFrames - 12], [0, TREE.length], CL);
  const tokens = interpolate(f, [makes, s.durationInFrames - 8], [0, 186400], CL);
  return (
    <AbsoluteFill>
      <Chip label="MISTAKE 02" tone="burn" />
      <Headline text="It reads the whole repo" top={300} size={92} accent="whole" />
      <Window
        title="claude — ~/my-app"
        glow={lit > 1 ? C.burn : undefined}
        style={{ left: 70, top: 520, width: 940, height: 860 }}
        right={
          <div style={{ fontFamily: MONO, fontSize: 34, fontWeight: 700, color: tokens > 0 ? C.burn : C.faint, fontVariantNumeric: "tabular-nums" }}>
            {fmt(tokens)} tok
          </div>
        }
      >
        <div style={{ position: "absolute", left: 30, right: 30, top: 24 }}>
          <PromptBox>
            {prompt}
            {f < makes ? <Cursor h={30} /> : null}
          </PromptBox>
        </div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 140 }}>
          {TREE.map(([name, depth], i) => {
            const on = prog(lit, i, i + 1, easeIn);
            const folder = name.endsWith("/");
            return (
              <div
                key={name}
                style={{
                  height: 46,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: depth * 44 + 14,
                  borderRadius: 10,
                  background: on > 0 ? `rgba(255,90,54,${0.08 + on * 0.14})` : "transparent",
                  fontSize: 27,
                  color: on > 0.5 ? C.text : C.faint,
                }}
              >
                <span style={{ width: 40, color: folder ? C.amber : C.blue }}>{folder ? "▸" : "·"}</span>
                <span style={{ flex: 1 }}>{name}</span>
                {on > 0.5 ? (
                  <span style={{ color: C.burn, fontSize: 22, fontWeight: 700, letterSpacing: 2, marginRight: 14, opacity: on }}>READ ✓</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Window>
    </AbsoluteFill>
  );
}
