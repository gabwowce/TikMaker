import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, Logo, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  BulbIcon,
  cardStyle,
  CheckMark,
  clamp,
  EASE_INOUT,
  GREY,
  GREY_HI,
  LIGHT,
  mix,
  popScale,
  prog,
  ScriptIcon,
  Stage,
  TrendIcon,
} from "./shared";

export const description =
  "The Claude agent works above three stations – trends, ideas, scripts; an orange spark travels along them and each station lights up and fills as it is named";

export const schema = z.object({
  trendsOn: field.word("Trends station on", "trending"),
  ideasOn: field.word("Ideas station on", "idea"),
  scriptsOn: field.word("Scripts station on", "script"),
});
type Params = z.infer<typeof schema>;

const ST = { y: 620, w: 244, h: 340, xs: [90, 418, 746] };
const ICONS = [TrendIcon, BulbIcon, ScriptIcon];
const AGENT = { cx: 540, cy: 360, size: 170 };

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const at = [
    wordFrame(words, params.trendsOn, 52) - 3,
    wordFrame(words, params.ideasOn, 105) - 3,
    wordFrame(words, params.scriptsOn, 138) - 3,
  ];
  const hotIdx = at.reduce((acc, a, i) => (frame >= a ? i : acc), -1);
  const agentIn = popScale(frame, 0, 0.8);

  // the spark: drops from the agent into station 1, then hops 1 → 2 → 3
  const sparkPos = (() => {
    const centre = (i: number) => ({ x: ST.xs[i] + ST.w / 2, y: ST.y - 10 });
    const travel = 12;
    for (let i = at.length - 1; i >= 0; i--) {
      if (frame >= at[i] - travel) {
        const from = i === 0 ? { x: AGENT.cx, y: AGENT.cy + AGENT.size / 2 } : centre(i - 1);
        const to = centre(i);
        const t = interpolate(frame, [at[i] - travel, at[i]], [0, 1], { ...clamp, easing: EASE_INOUT });
        return { x: mix(from.x, to.x, t), y: mix(from.y, to.y, t) - Math.sin(t * Math.PI) * (i === 0 ? 0 : 60), t };
      }
    }
    return null;
  })();

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the agent at work: Claude with a turning ring */}
        <div style={{ position: "absolute", left: AGENT.cx - AGENT.size / 2, top: AGENT.cy - AGENT.size / 2, width: AGENT.size, height: AGENT.size, scale: `${agentIn}`, opacity: prog(frame, 0, 6) }}>
          <svg width={AGENT.size} height={AGENT.size} style={{ position: "absolute", inset: 0, rotate: `${frame * 3}deg` }}>
            <circle cx={AGENT.size / 2} cy={AGENT.size / 2} r={AGENT.size / 2 - 6} fill="none" stroke={GREY_HI} strokeWidth={8} strokeDasharray="40 22" strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 30, borderRadius: 999, background: "#24242c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Logo id="claude" size={70} />
          </div>
        </div>

        {/* arrows between stations */}
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: ST.xs[i] + ST.w + 8,
              top: ST.y + ST.h / 2 - 6,
              width: ST.xs[i + 1] - ST.xs[i] - ST.w - 16,
              height: 12,
              borderRadius: 6,
              background: hotIdx > i ? GREY_HI : GREY,
              opacity: prog(frame, 6 + i * 4, 8),
            }}
          />
        ))}

        {/* the three stations */}
        {ICONS.map((Icon, i) => {
          const hot = hotIdx === i;
          const done = hotIdx > i;
          const lit = prog(frame, at[i], 8);
          const inS = popScale(frame, 4 + i * 4);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: ST.xs[i],
                top: ST.y,
                width: ST.w,
                height: ST.h,
                ...cardStyle(ST.w),
                background: "#202027",
                border: hot ? `3px solid ${c.accent}` : "1px solid rgba(255,255,255,0.12)",
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${hot ? `, 0 0 50px ${c.accent}55` : ""}`,
                scale: `${inS * (1 + interpolate(frame, [at[i], at[i] + 5, at[i] + 12], [0, 0.04, 0], clamp))}`,
                opacity: prog(frame, 4 + i * 4, 6) * (frame < at[i] ? 0.45 : 1),
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 40,
                gap: 30,
              }}
            >
              <div
                style={{
                  width: 130,
                  height: 130,
                  borderRadius: 36,
                  background: hot ? c.accent : "#2c2c34",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={78} color={hot ? c.bg : lit > 0.5 ? LIGHT : GREY_HI} />
              </div>
              {/* what it produced: rows that fill in */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18, alignSelf: "stretch", padding: "0 34px" }}>
                {[0.9, 0.7, 0.8].map((w, k) => (
                  <Bar key={k} w={`${w * 100 * prog(frame, at[i] + 6 + k * 6, 8)}%`} h={20} color={hot ? c.accent : GREY_HI} />
                ))}
              </div>
              {done ? (
                <div
                  style={{
                    position: "absolute",
                    right: -18,
                    top: -18,
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    background: GREY_HI,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    scale: `${bounceIn(frame, at[i + 1], 10)}`,
                  }}
                >
                  <CheckMark size={42} color={c.text} />
                </div>
              ) : null}
            </div>
          );
        })}

        {sparkPos && sparkPos.t < 1 ? (
          <div
            style={{
              position: "absolute",
              left: sparkPos.x - 22,
              top: sparkPos.y - 22,
              width: 44,
              height: 44,
              borderRadius: 22,
              background: c.accent,
              boxShadow: `0 0 24px ${c.accent}, 0 0 60px ${c.accent}88`,
            }}
          />
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
