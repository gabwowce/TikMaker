import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, EASE, GAUGE, Gauge, MONO, Stage, blink, enter, pop, ramp, typed, wordAt } from "./kit";

// CTA: the opening's fuel gauge returns in the same spot and climbs back to
// full, while a comment box below types the request and sends it.
export function Scene9({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const comment = wordAt(words, 2, 10);
  const more = wordAt(words, 6, 32);
  const tips = wordAt(words, 8, 56);
  const claude = wordAt(words, 10, 70);

  const fill = interpolate(f, [4, more + 22], [0.08, 1], { ...CLAMP, easing: EASE });
  const settle = Math.sin(ramp(f, more + 22, 14) * Math.PI) * 0.02;
  const level = Math.min(1, fill) - settle;
  const pct = Math.round(fill * 100);
  const text = typed("more tips please", f, comment - 2, 1.8);
  const sent = pop(f, tips + 4, 12);
  const full = ramp(f, more + 20, 8);

  return (
    <Stage duration={durationInFrames} offsetY={340}>
      <Abs style={{ left: GAUGE.left, top: GAUGE.top, ...enter(f, 0, { dur: 10 }) }}>
        <Gauge level={level} warn={0} />
      </Abs>
      <Abs style={{ left: 90, right: 90, top: 760, textAlign: "center", ...enter(f, 2) }}>
        <span style={{ fontFamily: MONO, fontSize: 70, color: c.text, fontWeight: 700 }}>{pct}%</span>
        <span style={{ fontFamily: c.fontSemi, fontSize: 40, color: c.accent, letterSpacing: "0.14em", marginLeft: 22, opacity: full }}>
          FULL
        </span>
      </Abs>
      {/* the comment box – a solid rounded pill */}
      <Abs
        style={{
          left: 119,
          width: 842,
          top: 900,
          height: 116,
          borderRadius: 58,
          background: c.surfaceHi,
          border: `2px solid ${text ? c.accent : "rgba(255,255,255,0.14)"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          padding: "0 18px 0 22px",
          gap: 22,
          ...enter(f, 3, { overshoot: true }),
        }}
      >
        <div style={{ width: 76, height: 76, borderRadius: 38, background: "rgba(255,255,255,0.14)", flexShrink: 0 }} />
        <div style={{ flex: 1, fontFamily: c.fontUi, fontSize: 44, color: text ? c.text : c.textSoft, opacity: text ? 1 : 0.6, display: "flex", alignItems: "center" }}>
          {text || "Add comment…"}
          {f < tips + 4 ? <span style={{ width: 4, height: 50, background: c.text, marginLeft: 4, opacity: blink(f) }} /> : null}
        </div>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: c.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${0.85 + 0.15 * sent + 0.12 * Math.sin(ramp(f, claude - 3, 10) * Math.PI)})`,
            opacity: 0.4 + 0.6 * sent,
          }}
        >
          <svg width={38} height={38} viewBox="0 0 38 38">
            <path d="M19 30 V8 M9 18 L19 8 L29 18" stroke={c.bg} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Abs>
    </Stage>
  );
}
