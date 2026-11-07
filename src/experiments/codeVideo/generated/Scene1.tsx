import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, EASE, GAUGE, Gauge, MONO, Stage, enter, fmt, leave, pop, ramp, wordAt } from "./kit";

// Hook: a fuel gauge drains while a Claude Code session scrolls endlessly
// beneath it; on "3" the session gives way to the three fixes.
const LOG = [
  "⏺ Read(src/app.tsx)",
  "⏺ Read(package.json)",
  "⏺ Search(\"**/*.ts\")",
  "⏺ Read(src/api/user.ts)",
  "⏺ Read(src/lib/db.ts)",
  "⏺ List(components/)",
  "⏺ Read(README.md)",
  "⏺ Read(src/hooks/auth.ts)",
];

export function Scene1({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const eating = wordAt(words, 4, 26);
  const three = wordAt(words, 9, 63);

  // needle: near full, then falls on "eating" with a small shudder
  const fall = ramp(f, eating - 3, 28);
  const shudder = Math.sin(f * 1.7) * 0.012 * (1 - fall * 0.5);
  const level = interpolate(fall, [0, 1], [0.9, 0.08], CLAMP) + shudder;
  const warn = level < 0.3 ? 0.5 + 0.5 * Math.sin(f / 3) : 0;
  const tokens = interpolate(f, [2, eating + 30], [18_400, 1_284_930], { ...CLAMP, easing: EASE });

  // endless scroll in the strip below
  const lineH = 52;
  const scroll = (f * 4.2) % (LOG.length * lineH);

  return (
    <Stage duration={durationInFrames}>
      <Abs style={{ left: GAUGE.left, top: GAUGE.top, ...enter(f, 0, { overshoot: true, dur: 13 }) }}>
        <Gauge level={level} warn={warn} />
      </Abs>
      {/* readout under the pivot */}
      <Abs style={{ left: 90, right: 90, top: 760, textAlign: "center", ...enter(f, 3) }}>
        <span style={{ fontFamily: MONO, fontSize: 70, color: c.text, fontWeight: 700 }}>{fmt(tokens)}</span>
        <span style={{ fontFamily: c.fontSemi, fontSize: 40, color: c.accent, letterSpacing: "0.14em", marginLeft: 22 }}>
          TOKENS
        </span>
      </Abs>
      {/* the session that never ends – dim, secondary */}
      <Abs
        style={{
          left: 140,
          width: 800,
          top: 880,
          height: 190,
          overflow: "hidden",
          maskImage: "linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 30%, #000 70%, transparent 100%)",
          ...enter(f, 6),
          ...(f >= three - 6 ? leave(f, three - 6) : {}),
        }}
      >
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          {[...LOG, ...LOG, ...LOG].map((l, i) => (
            <div key={i} style={{ height: lineH, fontFamily: MONO, fontSize: 36, color: c.textSoft, opacity: 0.55, whiteSpace: "nowrap" }}>
              <span style={{ color: c.accent }}>{l.slice(0, 1)}</span>
              {l.slice(1)}
            </div>
          ))}
        </div>
      </Abs>
      {/* "3 fixes" lands just before the word */}
      <Abs
        style={{
          left: 90,
          right: 90,
          top: 900,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 30,
          ...enter(f, three - 3, { overshoot: true }),
        }}
      >
        <div style={{ display: "flex", gap: 14 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 30, height: 30, background: c.accent, transform: `scale(${pop(f, three - 2 + i * 3)})` }} />
          ))}
        </div>
        <div style={{ fontFamily: c.fontStrong, fontSize: 104, color: c.text, lineHeight: 1 }}>3 FIXES</div>
      </Abs>
    </Stage>
  );
}
