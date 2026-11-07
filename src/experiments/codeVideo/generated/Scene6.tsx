import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, EASE, Eyebrow, MONO, Stage, Window, blink, enter, pop, ramp, typed, wordAt } from "./kit";

// Fix 2: the file name lands first as a big target chip, flies up into the
// window's header, the precise prompt is typed, and Claude reads only that
// one file before the edit appears.
const L1 = "add input validation to ";
const L2 = "login() in ";
const FILE = "auth.ts";

export function Scene6({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const point = wordAt(words, 1, 21);
  const file = wordAt(words, 5, 38);
  const add = wordAt(words, 6, 59);
  const auth = wordAt(words, 14, 123);
  const few = wordAt(words, 16, 167);
  const done = wordAt(words, 18, 191);

  const full = L1 + L2 + FILE;
  const perChar = Math.max(1, (auth + 8 - (add - 3)) / full.length);
  const shown = typed(full, f, add - 3, perChar);
  const enterAt = auth + 16;
  const out = (i: number) => enterAt + 4 + i * 6;

  // chip: centre of the body → header slot
  const fly = ramp(f, add - 8, 14);
  const chipX = interpolate(fly, [0, 1], [540, 838]);
  const chipY = interpolate(fly, [0, 1], [700, 367]);
  const chipS = interpolate(fly, [0, 1], [1, 0.42]);
  const chipIn = enter(f, file - 4, { overshoot: true });

  const line = { fontFamily: MONO, fontSize: 38, height: 54, whiteSpace: "nowrap" as const };
  const l1 = shown.slice(0, L1.length);
  const l2 = shown.slice(L1.length, L1.length + L2.length);
  const lf = shown.slice(L1.length + L2.length);
  const OUT: [string, string, boolean][] = [
    ["⏺", "Read(auth.ts)", false],
    [" ", " ⎿ 48 lines", false],
    ["⏺", "Update(auth.ts)", false],
    ["+", "if (!email) return err()", true],
    ["+", "if (!pass) return err()", true],
  ];

  return (
    <Stage duration={durationInFrames}>
      <Eyebrow tag="Fix" index="02 / 03" />
      <Abs style={{ left: 119, top: 330, ...enter(f, Math.min(2, point - 3), { overshoot: true }) }}>
        <Window width={842} height={670} title="claude — ~/app">
          {/* prompt box */}
          <div
            style={{
              position: "absolute",
              left: 30,
              right: 30,
              top: 24,
              height: 140,
              borderRadius: 14,
              border: `2px solid ${shown && f < enterAt ? c.accent : "rgba(255,255,255,0.22)"}`,
              padding: "16px 26px",
              color: c.text,
            }}
          >
            <div style={line}>
              <span style={{ color: c.textSoft }}>&gt; </span>
              {l1}
            </div>
            <div style={line}>
              <span style={{ opacity: 0 }}>&gt; </span>
              {l2}
              {lf ? <span style={{ color: c.bg, background: c.accent, borderRadius: 6, padding: "0 6px" }}>{lf}</span> : null}
              {f < enterAt ? <span style={{ display: "inline-block", width: 20, height: 40, background: c.text, marginLeft: 4, verticalAlign: "middle", opacity: blink(f) }} /> : null}
            </div>
          </div>
          {/* output */}
          {OUT.map(([mark, text, diff], i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 44,
                top: 196 + i * 58,
                ...line,
                color: diff ? c.text : c.textSoft,
                background: diff ? "rgba(255,112,36,0.12)" : "transparent",
                borderLeft: diff ? `4px solid ${c.accent}` : "none",
                paddingLeft: diff ? 12 : 0,
                right: 44,
                ...enter(f, out(i), { dur: 9, y: 12 }),
              }}
            >
              <span style={{ color: c.accent }}>{mark} </span>
              {text}
            </div>
          ))}
          {/* done */}
          <div style={{ position: "absolute", left: 44, right: 44, top: 520, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: ramp(f, done - 3, 6) }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop(f, done - 3)})` }}>
                <svg width={30} height={30} viewBox="0 0 30 30">
                  <path d="M6 15 L13 22 L24 8" stroke={c.bg} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontFamily: c.fontStrong, fontSize: 56, color: c.text }}>Done</span>
            </div>
            <div style={{ fontFamily: c.fontSemi, fontSize: 40, letterSpacing: "0.14em", color: c.text, border: "1px solid rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "10px 24px", ...enter(f, few - 3) }}>
              1 READ
            </div>
          </div>
        </Window>
      </Abs>
      {/* the target file chip */}
      <Abs
        style={{
          left: chipX,
          top: chipY,
          transform: `translate(-50%, -50%) scale(${chipS})`,
          opacity: chipIn.opacity,
        }}
      >
        <div style={{ transform: chipIn.transform, display: "flex", alignItems: "center", gap: 22, padding: "22px 40px", borderRadius: 22, background: c.surfaceHi, border: `2px solid ${c.accent}`, boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
          <svg width={54} height={66} viewBox="0 0 54 66">
            <path d="M4 4 H36 L50 18 V62 H4 Z" fill="none" stroke={c.accent} strokeWidth={4} strokeLinejoin="round" />
            <path d="M36 4 V18 H50" fill="none" stroke={c.accent} strokeWidth={4} />
          </svg>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 84, color: c.text }}>{FILE}</span>
        </div>
      </Abs>
      {/* a soft pulse ring when the chip lands in the header */}
      <Abs style={{ left: 838 - 90, top: 367 - 40, width: 180, height: 80, borderRadius: 20, border: `2px solid ${c.accent}`, opacity: interpolate(f, [add + 6, add + 18], [0.8, 0], CLAMP) * (f > add + 5 ? 1 : 0), transform: `scale(${interpolate(f, [add + 6, add + 18], [1, 1.4], { ...CLAMP, easing: EASE })})` }} />
    </Stage>
  );
}
