import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, Logo, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  BulbIcon,
  CARD_BG,
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
  "The Claude agent runs three stations – trends, ideas, scripts – lighting each as it is named; then the pipeline shrinks to the top and a scheduled-task card with a clock and four weeks appears, a manual start button gets struck out, and each week runs and fills with a new script on its own";

export const schema = z.object({
  trendsOn: field.word("Trends station on", "trending"),
  ideasOn: field.word("Ideas station on", "idea"),
  scriptsOn: field.word("Scripts station on", "script"),
  scheduleOn: field.word("Schedule card appears on", "scheduled"),
  weeksOn: field.word("Weeks start running on", "week"),
  noPromptOn: field.word("Start button appears on", "prompting"),
  noStartOn: field.word("Start button struck out on", "start"),
  label: field.text("Schedule label", "Every week"),
  weeks: field.number("Weeks shown", 4, { min: 3, max: 5 }),
});
type Params = z.infer<typeof schema>;

const ST = { y: 620, w: 244, h: 340, xs: [90, 418, 746] };
const ICONS = [TrendIcon, BulbIcon, ScriptIcon];
const AGENT = { cx: 540, cy: 360, size: 170 };
// the pipeline shrinks into a strip at the top when the schedule arrives
const MINI = { scale: 0.55, lift: -390 };
const CARD = { x: 120, y: 470, w: 840, h: 580 };

function ClockIcon({ size, color, angle }: { size: number; color: string; angle: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="38" fill="none" stroke={color} strokeWidth="10" />
      <line x1="50" y1="50" x2="50" y2="28" stroke={color} strokeWidth="9" strokeLinecap="round" />
      <line
        x1="50"
        y1="50"
        x2={50 + Math.sin((angle * Math.PI) / 180) * 26}
        y2={50 - Math.cos((angle * Math.PI) / 180) * 26}
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="6" fill={color} />
    </svg>
  );
}

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const at = [
    wordFrame(words, params.trendsOn, 104) - 3,
    wordFrame(words, params.ideasOn, 175) - 3,
    wordFrame(words, params.scriptsOn, 217) - 3,
  ];
  const schedAt = wordFrame(words, params.scheduleOn, 278) - 3;
  const weeksAt = Math.max(schedAt + 24, wordFrame(words, params.weeksOn, 321) - 3);
  // "no prompting, no hitting start": a manual start button shows up, then gets struck out
  const btnAt = Math.max(schedAt + 20, wordFrame(words, params.noPromptOn, 349) - 3);
  const strikeAt = Math.max(btnAt + 10, wordFrame(words, params.noStartOn, 386) - 3);
  const strike = prog(frame, strikeAt, 8);
  const n = Math.round(params.weeks);
  const runsEnd = Math.max(weeksAt + n * 8, durationInFrames - 40);
  const gap = (runsEnd - weeksAt) / Math.max(1, n - 1);
  const runAt = (k: number) => weeksAt + k * gap;

  const hotIdx = frame >= schedAt ? -1 : at.reduce((acc, a, i) => (frame >= a ? i : acc), -1);
  const agentIn = popScale(frame, 0, 0.8);
  const shrink = interpolate(frame, [schedAt, schedAt + 16], [0, 1], { ...clamp, easing: EASE_INOUT });
  const cardIn = prog(frame, schedAt + 6, 14);
  const lastRun = Array.from({ length: n }, (_, k) => k).reduce((acc, k) => (frame >= runAt(k) ? k : acc), -1);
  const runKick = lastRun >= 0 ? interpolate(frame, [runAt(lastRun), runAt(lastRun) + 5, runAt(lastRun) + 12], [0, 1, 0], clamp) : 0;

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

  // cells of the week strip
  const cellGap = 24;
  const pad = 50;
  const cellW = (CARD.w - pad * 2 - cellGap * (n - 1)) / n;
  const cellH = 250;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the agent at work: Claude with a turning ring – steps aside for the schedule */}
        <div
          style={{
            position: "absolute",
            left: AGENT.cx - AGENT.size / 2,
            top: AGENT.cy - AGENT.size / 2,
            width: AGENT.size,
            height: AGENT.size,
            scale: `${agentIn * (1 - shrink * 0.4)}`,
            opacity: prog(frame, 0, 6) * (1 - shrink),
          }}
        >
          <svg width={AGENT.size} height={AGENT.size} style={{ position: "absolute", inset: 0, rotate: `${frame * 3}deg` }}>
            <circle cx={AGENT.size / 2} cy={AGENT.size / 2} r={AGENT.size / 2 - 6} fill="none" stroke={GREY_HI} strokeWidth={8} strokeDasharray="40 22" strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", inset: 30, borderRadius: 999, background: "#24242c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Logo id="claude" size={70} />
          </div>
        </div>

        {/* the pipeline: full size first, then a dimmed strip at the top */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: `540px ${ST.y}px`,
            translate: `0px ${MINI.lift * shrink}px`,
            scale: `${mix(1, MINI.scale, shrink)}`,
            opacity: mix(1, 0.5, shrink),
          }}
        >
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
                background: frame >= at[i + 1] ? GREY_HI : GREY,
                opacity: prog(frame, 6 + i * 4, 8),
              }}
            />
          ))}

          {ICONS.map((Icon, i) => {
            const hot = hotIdx === i;
            const done = frame >= (i < 2 ? at[i + 1] : schedAt);
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
                      scale: `${bounceIn(frame, i < 2 ? at[i + 1] : schedAt, 10)}`,
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
        </div>

        {/* the scheduled task: a clock, one label, and the weeks it runs on by itself */}
        {frame >= schedAt ? (
          <div
            style={{
              position: "absolute",
              left: CARD.x,
              top: CARD.y,
              width: CARD.w,
              height: CARD.h,
              ...cardStyle(CARD.w),
              scale: `${popScale(frame, schedAt + 6)}`,
              translate: `0px ${(1 - cardIn) * 60}px`,
              opacity: prog(frame, schedAt + 6, 8),
            }}
          >
            <div style={{ position: "absolute", left: pad, top: pad, right: pad, height: 170, display: "flex", alignItems: "center", gap: 40 }}>
              <div
                style={{
                  width: 170,
                  height: 170,
                  borderRadius: 48,
                  background: frame < weeksAt ? c.accent : "#2c2c34",
                  border: frame < weeksAt ? "none" : `3px solid ${c.accent}`,
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  scale: `${1 + runKick * 0.08}`,
                  boxShadow: frame < weeksAt ? `0 0 50px ${c.accent}66` : `0 0 ${runKick * 50}px ${c.accent}55`,
                }}
              >
                <ClockIcon size={118} color={frame < weeksAt ? c.bg : c.accent} angle={interpolate(frame, [schedAt, runsEnd + 20], [0, 720], clamp)} />
              </div>
              <div
                style={{
                  fontFamily: c.fontStrong,
                  fontSize: 76,
                  lineHeight: 1,
                  color: c.text,
                  paddingTop: 6,
                  opacity: prog(frame, schedAt + 12, 10),
                  translate: `${(1 - prog(frame, schedAt + 12, 12)) * 24}px 0px`,
                }}
              >
                {params.label}
              </div>
              {/* the manual start button nobody has to press any more */}
              <div
                style={{
                  marginLeft: "auto",
                  position: "relative",
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  background: "#2c2c34",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  scale: `${frame < btnAt ? 0 : bounceIn(frame, btnAt, 10)}`,
                  opacity: frame < btnAt ? 0 : mix(1, 0.35, prog(frame, strikeAt + 8, 10)),
                }}
              >
                <svg width={56} height={56} viewBox="0 0 100 100" style={{ display: "block", marginLeft: 8 }}>
                  <path d="M25 14 L84 50 L25 86 Z" fill={LIGHT} stroke={LIGHT} strokeWidth="8" strokeLinejoin="round" />
                </svg>
                <div
                  style={{
                    position: "absolute",
                    left: 4,
                    top: 53,
                    width: 110,
                    height: 12,
                    borderRadius: 6,
                    background: c.accent,
                    rotate: "-45deg",
                    scale: `${strike} 1`,
                    opacity: strike > 0 ? 1 : 0,
                    boxShadow: `0 0 16px ${c.accent}88`,
                  }}
                />
              </div>
            </div>

            {/* the weeks: each one runs on its own and gets a new script */}
            <div style={{ position: "absolute", left: pad, right: pad, bottom: pad, height: cellH, display: "flex", gap: cellGap }}>
              {Array.from({ length: n }, (_, k) => {
                const r = runAt(k);
                const running = interpolate(frame, [r, r + 4, r + 16, r + 24], [0, 1, 1, 0], clamp);
                const filled = prog(frame, r + 4, 10);
                return (
                  <div
                    key={k}
                    style={{
                      position: "relative",
                      width: cellW,
                      height: cellH,
                      borderRadius: 26,
                      background: "#202027",
                      border: running > 0.05 ? `3px solid ${c.accent}` : "1px solid rgba(255,255,255,0.12)",
                      boxShadow: running > 0.05 ? `0 0 ${50 * running}px ${c.accent}66` : "none",
                      boxSizing: "border-box",
                      overflow: "visible",
                      opacity: prog(frame, schedAt + 14 + k * 3, 8),
                      scale: `${1 + interpolate(frame, [r, r + 5, r + 12], [0, 0.05, 0], clamp)}`,
                    }}
                  >
                    {/* calendar header */}
                    <div style={{ height: 52, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
                      <Bar w={cellW * 0.4} h={16} color={running > 0.5 ? c.accent : GREY} />
                    </div>
                    {/* the new script that arrives */}
                    <div style={{ position: "absolute", left: 0, right: 0, top: 52, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div
                        style={{
                          position: "absolute",
                          inset: 22,
                          borderRadius: 18,
                          border: `3px dashed ${GREY}`,
                          opacity: 1 - filled,
                        }}
                      />
                      <div style={{ scale: `${bounceIn(frame, r + 4, 10)}`, opacity: filled }}>
                        <ScriptIcon size={100} color={running > 0.5 ? c.accent : LIGHT} />
                      </div>
                    </div>
                    {frame >= r + 14 ? (
                      <div
                        style={{
                          position: "absolute",
                          right: -16,
                          top: -16,
                          width: 56,
                          height: 56,
                          borderRadius: 28,
                          background: GREY_HI,
                          border: `4px solid ${CARD_BG}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          scale: `${bounceIn(frame, r + 14, 10)}`,
                        }}
                      >
                        <CheckMark size={34} color={c.text} />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
