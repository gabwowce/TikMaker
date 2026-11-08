import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, CalendarIcon, cardStyle, clamp, EASE_IN, EASE_OUT, GREY, GREY_HI, LIGHT, popScale, prog, Stage, StepPill } from "./shared";

export const description =
  "A weekly planner flips through identical weeks, each with the same 'plan content' block on Monday; the flipping stops and that block gets circled in orange";

export const schema = z.object({
  step: field.number("Step number", 1, { min: 1, max: 9 }),
  flips: field.number("Weeks flipped", 6, { min: 2, max: 10 }),
  flipOn: field.word("Flipping starts on", "repetitive"),
  circleOn: field.word("Circle drawn on", "planning"),
});
type Params = z.infer<typeof schema>;

const PAGE = { x: 160, y: 360, w: 760, h: 640 };
const HEAD = 100;
const ROWS = 5;

function Page({ hot }: { hot: number }) {
  const c = useBrand();
  const rowH = (PAGE.h - HEAD - 30) / ROWS;
  return (
    <div style={{ position: "absolute", inset: 0, ...cardStyle(PAGE.w), background: "#202027", overflow: "hidden" }}>
      <div style={{ height: HEAD, display: "flex", alignItems: "center", gap: 22, padding: "0 40px", background: "rgba(255,255,255,0.05)" }}>
        <CalendarIcon size={56} color={GREY_HI} />
        <Bar w={240} h={24} color={GREY_HI} />
      </div>
      {Array.from({ length: ROWS }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: HEAD + 15 + i * rowH,
            height: rowH,
            display: "flex",
            alignItems: "center",
            gap: 28,
            borderBottom: i < ROWS - 1 ? "1px solid rgba(255,255,255,0.07)" : "none",
          }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 23, background: i === 0 ? GREY_HI : GREY }} />
          {i === 0 ? (
            <div
              style={{
                width: 430,
                height: 74,
                borderRadius: 20,
                background: hot > 0.5 ? c.accent : "#34343d",
                display: "flex",
                alignItems: "center",
                padding: "0 28px",
                gap: 18,
                boxShadow: hot > 0.5 ? `0 0 40px ${c.accent}55` : "none",
              }}
            >
              <Bar w={260} h={22} color={hot > 0.5 ? c.bg : LIGHT} />
            </div>
          ) : (
            <Bar w={[0, 180, 260, 140, 220][i]} h={18} color={GREY} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const flipStart = wordFrame(words, params.flipOn, 33) - 6;
  const circleAt = wordFrame(words, params.circleOn, 77) - 3;
  const flipLen = 9;
  const flipEnd = Math.min(flipStart + params.flips * flipLen, circleAt - 6);
  const perFlip = (flipEnd - flipStart) / params.flips;

  const pageIn = popScale(frame, 4);
  const inFlip = frame >= flipStart && frame < flipEnd;
  const local = inFlip ? ((frame - flipStart) % perFlip) / perFlip : 0;
  const rot = interpolate(local, [0, 1], [0, -100], { ...clamp, easing: EASE_IN });

  const hot = prog(frame, circleAt, 4);
  const draw = interpolate(frame, [circleAt, circleAt + 14], [0, 1], { ...clamp, easing: EASE_OUT });
  const ringLen = 1700;

  // the circled block's centre on the page
  const rowH = (PAGE.h - HEAD - 30) / ROWS;
  const bx = PAGE.x + 40 + 46 + 28 + 215;
  const by = PAGE.y + HEAD + 15 + rowH / 2;

  return (
    <AbsoluteFill>
      <StepPill n={params.step} frame={frame} />
      <Stage frame={frame} duration={durationInFrames}>
        <div style={{ position: "absolute", left: PAGE.x, top: PAGE.y, width: PAGE.w, height: PAGE.h, scale: `${pageIn}`, opacity: prog(frame, 4, 6) }}>
          {/* the stack of pages under */}
          <div style={{ position: "absolute", left: 24, right: 24, top: 24, bottom: -24, borderRadius: 30, background: "#18181d", border: "1px solid rgba(255,255,255,0.08)" }} />
          <div style={{ position: "absolute", left: 12, right: 12, top: 12, bottom: -12, borderRadius: 30, background: "#1c1c22", border: "1px solid rgba(255,255,255,0.08)" }} />
          <Page hot={hot} />
          {inFlip ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                transformOrigin: "50% 0%",
                transform: `perspective(1600px) rotateX(${-rot}deg)`,
                opacity: interpolate(local, [0.7, 1], [1, 0], clamp),
              }}
            >
              <Page hot={0} />
              <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: `rgba(0,0,0,${local * 0.5})` }} />
            </div>
          ) : null}
        </div>

        {/* the orange circle drawn round the task */}
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
          <ellipse
            cx={bx}
            cy={by}
            rx={300}
            ry={78}
            fill="none"
            stroke={c.accent}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={ringLen}
            strokeDashoffset={ringLen * (1 - draw)}
            transform={`rotate(-3 ${bx} ${by})`}
            style={{ filter: `drop-shadow(0 0 12px ${c.accent}88)` }}
          />
        </svg>
      </Stage>
    </AbsoluteFill>
  );
}
