import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, Eyebrow, MONO, Stage, Window, enter, float, pop, ramp, wordAt } from "./kit";

// Mistake 3: the CLAUDE.md file is struck out as missing, shrinks into a
// corner, and three fresh sessions cascade open – each re-exploring the same
// project from zero.
const EXPLORE = ["⏺ Read(package.json)", "⏺ List(src/)", "⏺ Read(README.md)"];

export function Scene7({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const no = wordAt(words, 1, 22);
  const claudeMd = wordAt(words, 2, 29);
  const every = wordAt(words, 3, 68);
  const session = wordAt(words, 4, 77);
  const fresh = wordAt(words, 6, 94);
  const rediscovers = wordAt(words, 9, 117);
  const everyTime = wordAt(words, 12, 154);

  // the file chip: big and centred → small, top-right
  const shrink = ramp(f, every - 8, 14);
  const chipX = interpolate(shrink, [0, 1], [540, 820]);
  const chipY = interpolate(shrink, [0, 1], [640, 372]);
  const chipS = interpolate(shrink, [0, 1], [1, 0.38]);
  const strike = ramp(f, no - 2, 10);
  const opens = [session - 3, fresh - 3, rediscovers - 3];

  return (
    <Stage duration={durationInFrames}>
      <Eyebrow tag="Mistake" index="03 / 03" />
      {/* three sessions */}
      {opens.map((at, k) => {
        const next = opens[k + 1];
        const dim = next !== undefined ? 1 - 0.55 * ramp(f, next, 8) : 1;
        return (
          <Abs key={k} style={{ left: 150 + k * 60, top: 420 + k * 115, opacity: dim }}>
            <div style={enter(f, at, { overshoot: true })}>
              <Window width={720} height={400} title={`session ${k + 1}`}>
                <div style={{ position: "absolute", left: 34, top: 26, fontFamily: MONO, fontSize: 38, color: c.text }}>
                  <span style={{ color: c.textSoft }}>&gt;</span> claude
                </div>
                {EXPLORE.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: 34,
                      top: 100 + i * 64,
                      fontFamily: MONO,
                      fontSize: 38,
                      color: c.textSoft,
                      whiteSpace: "nowrap",
                      ...enter(f, at + 6 + i * 5, { dur: 9, y: 10 }),
                    }}
                  >
                    <span style={{ color: c.accent }}>{l.slice(0, 1)}</span>
                    {l.slice(1)}
                  </div>
                ))}
              </Window>
            </div>
          </Abs>
        );
      })}
      {/* ×3 loop badge on "every time" */}
      <Abs style={{ left: 690, top: 985, transform: `scale(${pop(f, everyTime - 3, 12)}) rotate(${-6 + 6 * ramp(f, everyTime - 3, 12)}deg)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: c.accent, borderRadius: 20, padding: "16px 32px", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
          <svg width={56} height={56} viewBox="0 0 56 56" style={{ transform: `rotate(${f * 6}deg)` }}>
            <path d="M46 28 A18 18 0 1 1 38 13" fill="none" stroke={c.bg} strokeWidth={6} strokeLinecap="round" />
            <path d="M30 8 L40 12 L36 22" fill="none" stroke={c.bg} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: c.fontStrong, fontSize: 80, color: c.bg, lineHeight: 1 }}>×3</span>
        </div>
      </Abs>
      {/* the missing CLAUDE.md */}
      <Abs style={{ left: chipX, top: chipY + float(f, 1, 6) * (1 - shrink), transform: `translate(-50%, -50%) scale(${chipS})` }}>
        <div style={enter(f, 0, { overshoot: true })}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 30,
              padding: "40px 60px",
              borderRadius: 30,
              background: c.surfaceHi,
              border: `3px dashed rgba(255,255,255,${0.5 - 0.25 * strike})`,
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            <svg width={80} height={100} viewBox="0 0 54 66" style={{ opacity: 1 - 0.5 * strike }}>
              <path d="M4 4 H36 L50 18 V62 H4 Z" fill="none" stroke={c.text} strokeWidth={4} strokeLinejoin="round" />
              <path d="M36 4 V18 H50 M12 32 H40 M12 42 H40 M12 52 H30" fill="none" stroke={c.text} strokeWidth={3} />
            </svg>
            <span style={{ fontFamily: c.fontStrong, fontSize: 96, color: c.text, opacity: 1 - 0.5 * strike }}>CLAUDE.md</span>
            {/* strike line */}
            <div style={{ position: "absolute", left: 30, top: "50%", height: 10, borderRadius: 5, background: c.accent, width: `calc((100% - 60px) * ${strike})` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 26, opacity: 1 - shrink, transform: `scale(${pop(f, claudeMd - 3)})` }}>
            <div style={{ fontFamily: c.fontSemi, fontSize: 44, letterSpacing: "0.14em", color: c.bg, background: c.accent, borderRadius: 12, padding: "10px 26px" }}>
              MISSING
            </div>
          </div>
        </div>
      </Abs>
    </Stage>
  );
}
