import { z } from "zod";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, CalendarIcon, cardStyle, clamp, EASE_OUT, GREY_HI, LIGHT, popScale, prog, pulse, ScriptIcon, Stage, StepPill } from "./shared";

export const description =
  "An endless calendar scrolls smoothly upward, week after week carrying the same 'plan content' task; it glides to a stop and that week's task lights up orange and gets circled";

export const schema = z.object({
  step: field.number("Step number", 1, { min: 1, max: 9 }),
  weeks: field.number("Weeks scrolled past", 6, { min: 2, max: 10 }),
  circleOn: field.word("Stops and circles on", "planning"),
});
type Params = z.infer<typeof schema>;

const CARD = { x: 150, y: 330, w: 780, h: 720 };
const HEAD = 100;
const VIEW_H = CARD.h - HEAD;
const ROW_H = 155;
const PAD = 40;
const CHIP_W = 560;
const CHIP_H = 92;
// the row that ends in the middle of the window
const STOP_ROW = 8;

// One week: a week marker, the same task chip, the rest of the week empty.
function WeekRow({ top, hot, dim }: { top: number; hot: number; dim: number }) {
  const c = useBrand();
  const on = hot > 0.5;
  return (
    <div
      style={{
        position: "absolute",
        left: PAD,
        right: PAD,
        top,
        height: ROW_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        opacity: dim,
      }}
    >
      <div
        style={{
          width: CHIP_W,
          height: CHIP_H,
          borderRadius: 22,
          background: on ? c.accent : "#34343d",
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: "0 28px",
          boxSizing: "border-box",
          flexShrink: 0,
          scale: `${1 + hot * 0.04}`,
          boxShadow: on ? `0 0 40px ${c.accent}66` : "none",
        }}
      >
        <ScriptIcon size={44} color={on ? c.bg : LIGHT} />
        <Bar w={360} h={24} color={on ? c.bg : LIGHT} />
      </div>
    </div>
  );
}

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const stopAt = wordFrame(words, params.circleOn, 77) - 3;
  const scrollStart = 6;

  // one smooth glide: picks up speed, cruises, settles exactly on STOP_ROW
  const pEnd = STOP_ROW * ROW_H - (VIEW_H / 2 - ROW_H / 2);
  const pStart = pEnd - params.weeks * ROW_H;
  const p = interpolate(frame, [scrollStart, stopAt], [pStart, pEnd], {
    ...clamp,
    easing: Easing.bezier(0.42, 0, 0.2, 1),
  });

  const hot = prog(frame, stopAt, 8);
  const draw = interpolate(frame, [stopAt + 2, stopAt + 18], [0, 1], { ...clamp, easing: EASE_OUT });
  const glow = 0.6 + 0.4 * pulse(frame, 40);

  const first = Math.floor(p / ROW_H) - 1;
  const rows = Array.from({ length: Math.ceil(VIEW_H / ROW_H) + 3 }, (_, i) => first + i);

  // the circled chip's centre on the canvas
  const cx = CARD.x + CARD.w / 2;
  const cy = CARD.y + HEAD + VIEW_H / 2;

  return (
    <AbsoluteFill>
      <StepPill n={params.step} frame={frame} />
      <Stage frame={frame} duration={durationInFrames}>
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            ...cardStyle(CARD.w),
            background: "#202027",
            overflow: "hidden",
            scale: `${popScale(frame, 2)}`,
            opacity: prog(frame, 2, 8),
          }}
        >
          <div
            style={{
              height: HEAD,
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "0 40px",
              background: "rgba(255,255,255,0.05)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <CalendarIcon size={56} color={GREY_HI} />
            <Bar w={240} h={24} color={GREY_HI} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: HEAD,
              height: VIEW_H,
              overflow: "hidden",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
            }}
          >
            {rows.map((k) => {
              const isStop = k === STOP_ROW;
              return (
                <WeekRow
                  key={k}
                  top={k * ROW_H - p}
                  hot={isStop ? hot : 0}
                  dim={isStop ? 1 : interpolate(hot, [0, 1], [1, 0.35])}
                />
              );
            })}
          </div>
        </div>

        {/* the orange circle drawn round this week's task */}
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
          <ellipse
            cx={cx}
            cy={cy}
            rx={340}
            ry={92}
            fill="none"
            stroke={c.accent}
            strokeWidth={10}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - draw}
            opacity={draw > 0 ? 1 : 0}
            transform={`rotate(-3 ${cx} ${cy})`}
            style={{ filter: `drop-shadow(0 0 ${10 + 10 * glow}px ${c.accent}88)` }}
          />
        </svg>
      </Stage>
    </AbsoluteFill>
  );
}
