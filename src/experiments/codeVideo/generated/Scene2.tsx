import { interpolate, random, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, EASE, Eyebrow, Stage, Tag, enter, float, pop, ramp, wordAt } from "./kit";

// Setup: a dollar counter ticks to $13 per developer per day, then a pipe
// labelled TOKENS draws on beneath it and starts leaking coins.
export function Scene2({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const about = wordAt(words, 2, 18);
  const dollars = wordAt(words, 4, 39);
  const developer = wordAt(words, 6, 54);
  const day = wordAt(words, 8, 70);
  const heres = wordAt(words, 9, 90);
  const leaks = wordAt(words, 12, 104);

  const value = interpolate(f, [about, dollars - 2], [0, 13], { ...CLAMP, easing: EASE });
  const whole = Math.floor(value);
  const cents = Math.floor((value - whole) * 100);
  const landed = ramp(f, dollars - 2, 8);
  const y = float(f, 2, 6);

  // pipe
  const pipeY = 880;
  const draw = ramp(f, heres - 3, 14);
  const crackX = 690;
  const crack = ramp(f, leaks - 3, 6);

  return (
    <Stage duration={durationInFrames} offsetY={360}>
      <Eyebrow tag="The cost" />
      {/* the counter – dominant */}
      <Abs style={{ left: 90, right: 90, top: 330, display: "flex", justifyContent: "center", alignItems: "flex-start", transform: `translateY(${y}px)`, ...enter(f, 0, { overshoot: true }) }}>
        <span style={{ fontFamily: c.fontStrong, fontSize: 150, color: c.accent, lineHeight: 1, marginTop: 40 }}>$</span>
        <span style={{ fontFamily: c.fontStrong, fontSize: 330, color: c.text, lineHeight: 1, transform: `scale(${1 + 0.04 * Math.sin(landed * Math.PI)})` }}>
          {whole}
        </span>
        <span style={{ fontFamily: c.fontStrong, fontSize: 100, color: c.textSoft, opacity: 0.6, lineHeight: 1, marginTop: 50 }}>
          .{String(cents).padStart(2, "0")}
        </span>
      </Abs>
      {/* per developer · per day */}
      <Abs style={{ left: 90, right: 90, top: 680, display: "flex", justifyContent: "center", gap: 24 }}>
        <div style={enter(f, developer - 3)}>
          <Tag>Per dev</Tag>
        </div>
        <div style={{ ...enter(f, day - 3, { overshoot: true }), display: "flex", alignItems: "center" }}>
          <div style={{ width: 70, height: 76, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.22)", marginRight: 16 }}>
            <div style={{ height: 20, background: c.accent }} />
            <div style={{ fontFamily: c.fontStrong, fontSize: 40, color: c.text, textAlign: "center", lineHeight: "56px" }}>24</div>
          </div>
          <Tag>A day</Tag>
        </div>
      </Abs>
      {/* the leaking pipe */}
      <svg width={1080} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={90} y1={pipeY} x2={90 + 900 * draw} y2={pipeY} stroke="rgba(255,255,255,0.16)" strokeWidth={56} strokeLinecap="round" />
        <line x1={90} y1={pipeY - 28} x2={90 + 900 * draw} y2={pipeY - 28} stroke="rgba(255,255,255,0.28)" strokeWidth={2} />
        <polyline
          points={`${crackX - 14},${pipeY - 28} ${crackX + 8},${pipeY - 6} ${crackX - 6},${pipeY + 8} ${crackX + 10},${pipeY + 28}`}
          fill="none"
          stroke={c.accent}
          strokeWidth={5}
          strokeDasharray={120}
          strokeDashoffset={120 * (1 - crack)}
        />
        {Array.from({ length: 6 }).map((_, i) => {
          const start = leaks + i * 7;
          const t = (f - start) / 26;
          if (t < 0 || f < leaks) return null;
          const loop = t % 1.4;
          if (loop > 1) return null;
          const dx = (random(`coin-${i}`) - 0.5) * 50;
          const cy = pipeY + 30 + loop * loop * 150;
          return (
            <g key={i} opacity={1 - loop * 0.7}>
              <circle cx={crackX + dx * loop} cy={cy} r={18} fill={c.accent} />
              <text x={crackX + dx * loop} y={cy + 8} textAnchor="middle" fontFamily={c.fontStrong} fontSize={22} fill={c.bg}>
                $
              </text>
            </g>
          );
        })}
      </svg>
      <Abs style={{ left: 150, top: pipeY - 30, transform: `scale(${pop(f, heres + 5)})`, transformOrigin: "left center" }}>
        <Tag accent style={{ padding: "6px 22px", fontSize: 40 }}>Tokens</Tag>
      </Abs>
    </Stage>
  );
}
