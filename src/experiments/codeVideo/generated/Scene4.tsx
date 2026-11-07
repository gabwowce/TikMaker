import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, EXIT, Eyebrow, MONO, Stage, Window, blink, enter, fmt, pop, ramp, typed, wordAt } from "./kit";

// Fix 1: in a Claude Code session full of old tasks, "/clear" is typed, the
// conversation collapses, and the context meter drops to zero.
const HISTORY: [string, string][] = [
  [">", "fix the navbar"],
  ["⏺", "Update(Navbar.tsx)"],
  [">", "now the footer"],
  ["⏺", "Update(Footer.tsx)"],
  [">", "add dark mode"],
  ["⏺", "Update(theme.ts)"],
  [">", "write the tests"],
  ["⏺", "Write(app.test.ts)"],
];

export function Scene4({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const slash = wordAt(words, 3, 40);
  const clear = wordAt(words, 4, 51);
  const it = wordAt(words, 9, 99);
  const nothing = wordAt(words, 11, 111);

  const typeStart = slash - 3;
  const cmd = typed("/clear", f, typeStart, 2.4);
  const enterAt = clear + 9;
  const wipe = ramp(f, enterAt, 8, EXIT);
  const drift = interpolate(f, [0, enterAt], [6, 0], CLAMP);
  const ctx = interpolate(f, [enterAt, enterAt + 14], [84_210, 0], CLAMP);
  const zero = pop(f, it - 3, 12);
  // "nothing" punches the zero once more
  const punch = 1 + 0.12 * Math.sin(ramp(f, nothing - 3, 10) * Math.PI);
  const showHint = cmd.length > 0 && f < enterAt;

  const W = 842;
  const line = { fontFamily: MONO, fontSize: 38, height: 54, whiteSpace: "nowrap" as const };

  return (
    <Stage duration={durationInFrames}>
      <Eyebrow tag="Fix" index="01 / 03" />
      <Abs style={{ left: 119, top: 330, ...enter(f, 0, { overshoot: true }) }}>
        <Window width={W} height={720} title="claude — ~/app">
          {/* the long conversation, collapsing upward on Enter */}
          <div
            style={{
              position: "absolute",
              left: 36,
              right: 36,
              top: 20,
              height: 430,
              overflow: "hidden",
              clipPath: `inset(0 0 ${wipe * 100}% 0)`,
              opacity: 1 - wipe * 0.6,
            }}
          >
            <div style={{ transform: `translateY(${drift}px)` }}>
              {HISTORY.map(([mark, text], i) => (
                <div key={i} style={{ ...line, color: mark === ">" ? c.text : c.textSoft, opacity: mark === ">" ? 0.85 : 0.55 }}>
                  <span style={{ color: mark === ">" ? c.textSoft : c.accent }}>{mark} </span>
                  {text}
                </div>
              ))}
            </div>
          </div>
          {/* after /clear: an empty session and a 0 */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 150, textAlign: "center", opacity: zero, transform: `scale(${(0.8 + 0.2 * zero) * punch})` }}>
            <div style={{ fontFamily: c.fontStrong, fontSize: 150, color: c.accent, lineHeight: 1 }}>0</div>
            <div style={{ fontFamily: c.fontSemi, fontSize: 40, letterSpacing: "0.14em", color: c.textSoft, marginTop: 10 }}>TOKENS</div>
          </div>
          {/* prompt box */}
          <div
            style={{
              position: "absolute",
              left: 30,
              right: 30,
              top: 470,
              borderRadius: 14,
              border: `2px solid ${cmd.length && f < enterAt ? c.accent : "rgba(255,255,255,0.22)"}`,
              display: "flex",
              alignItems: "center",
              padding: "0 26px",
              ...line,
              height: 92,
              color: c.text,
            }}
          >
            <span style={{ color: c.textSoft, marginRight: 16 }}>&gt;</span>
            {f < enterAt ? cmd : ""}
            <span style={{ width: 20, height: 44, background: c.text, marginLeft: 4, opacity: blink(f) }} />
          </div>
          {showHint ? (
            <div style={{ position: "absolute", left: 60, top: 578, ...line, color: c.textSoft, opacity: 0.75 }}>
              <span style={{ color: c.accent }}>/clear</span>  clear history
            </div>
          ) : (
            <div style={{ position: "absolute", left: 60, right: 60, top: 578, ...line, color: c.textSoft, opacity: 0.6, display: "flex", justifyContent: "space-between" }}>
              <span>context</span>
              <span style={{ color: ctx === 0 ? c.accent : c.textSoft }}>{fmt(ctx)}</span>
            </div>
          )}
        </Window>
      </Abs>
      {/* the keypress flash */}
      <Abs style={{ left: 119 + W - 220, top: 330 + 74 + 470 - 70, opacity: interpolate(f, [enterAt - 2, enterAt, enterAt + 10], [0, 1, 0], CLAMP) }}>
        <div style={{ fontFamily: MONO, fontSize: 36, color: c.bg, background: c.accent, borderRadius: 8, padding: "4px 14px" }}>⏎ enter</div>
      </Abs>
    </Stage>
  );
}
