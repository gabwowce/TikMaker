import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, Corners, EASE, Eyebrow, MONO, Stage, Window, blink, enter, pop, ramp, wordAt } from "./kit";

// Fix 3: a short CLAUDE.md is typed in the editor, a fresh session loads it
// (session counter ticking), and a bounding box measures it against 200 lines.
const DOC = ["# My App", "Stack: Next.js + Prisma", "Test: npm test", "No default exports", "Never edit /generated"];

export function Scene8({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const claudeMd = wordAt(words, 5, 35);
  const it = wordAt(words, 6, 69);
  const loads = wordAt(words, 7, 74);
  const every = wordAt(words, 8, 83);
  const keep = wordAt(words, 10, 108);
  const two = wordAt(words, 13, 125);

  // typing: all lines between frame 2 and just after "CLAUDE.md"
  const total = DOC.join("").length;
  const chars = Math.floor(interpolate(f, [2, claudeMd + 14], [0, total], CLAMP));
  let left = chars;
  const lines = DOC.map((l) => {
    const s = l.slice(0, Math.max(0, left));
    left -= l.length;
    return s;
  });
  const typingLine = Math.min(DOC.length - 1, lines.findIndex((s, i) => s.length < DOC[i].length) === -1 ? DOC.length - 1 : lines.findIndex((s, i) => s.length < DOC[i].length));

  const session = Math.min(9, 1 + Math.floor(Math.max(0, f - every) / 7));
  const box = ramp(f, keep - 3, 12);
  const limit = interpolate(f, [two - 3, two + 12], [0, 200], { ...CLAMP, easing: EASE });
  const termDim = 1 - 0.5 * box;

  const W = 842;
  const H = 450;
  return (
    <Stage duration={durationInFrames}>
      <Eyebrow tag="Fix" index="03 / 03" />
      <Abs style={{ left: 119, top: 330, ...enter(f, 0, { overshoot: true }) }}>
        <Window width={W} height={H} title="CLAUDE.md">
          {DOC.map((_, i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 22 + i * 64, height: 64, display: "flex", alignItems: "center", fontFamily: MONO, fontSize: 38, whiteSpace: "nowrap" }}>
              <span style={{ width: 90, textAlign: "right", paddingRight: 26, color: c.textSoft, opacity: 0.35 }}>{i + 1}</span>
              <span style={{ color: i === 0 ? c.accent : c.text }}>{lines[i]}</span>
              {i === typingLine && f < claudeMd + 30 ? <span style={{ width: 20, height: 42, background: c.text, marginLeft: 3, opacity: blink(f) }} /> : null}
            </div>
          ))}
        </Window>
        {/* bounding box + live dimension */}
        <div style={{ position: "absolute", left: -14, top: -14, width: W + 28, height: H + 28, opacity: box }}>
          <Corners w={W + 28} h={H + 28} color={c.accent} p={box} />
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: H - 30,
            transform: `scale(${pop(f, keep - 1)})`,
            transformOrigin: "right center",
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 44,
            color: c.bg,
            background: c.accent,
            borderRadius: 10,
            padding: "8px 22px",
          }}
        >
          5 / {Math.round(limit) || "—"} lines
        </div>
      </Abs>
      {/* a fresh session picks it up */}
      <Abs style={{ left: 119, top: 840, opacity: termDim, ...enter(f, it - 4, { overshoot: true }) }}>
        <Window width={W} height={220} title={`session ${session}`}>
          <div style={{ position: "absolute", left: 36, right: 36, top: 26, fontFamily: MONO, fontSize: 38, color: c.text, display: "flex", alignItems: "center", gap: 18, ...enter(f, loads - 3, { dur: 9, y: 10 }) }}>
            <div key={session} style={{ width: 46, height: 46, borderRadius: 23, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop(f, Math.max(loads - 3, every + (session - 1) * 7 - 1), 7)})` }}>
              <svg width={26} height={26} viewBox="0 0 30 30">
                <path d="M6 15 L13 22 L24 8" stroke={c.bg} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span>Loaded CLAUDE.md</span>
          </div>
        </Window>
      </Abs>
    </Stage>
  );
}
