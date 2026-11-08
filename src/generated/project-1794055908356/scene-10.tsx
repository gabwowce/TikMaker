import { z } from "zod";
import type { CSSProperties } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Badge, ChatBubble, clamp, EASE_IN, EASE_OUT, EASE_INOUT, LIGHT, mix, popScale, prog, pulse, Sheet, Stage } from "./shared";

export const description =
  "The chat bubble is struck through and falls away; the 'Content Strategist' ID badge slides in, gets a weekly-schedule clock, moves up and fills one content calendar after another, week after week";

export const schema = z.object({
  title: field.text("Badge title", "Content Strategist"),
  strikeOn: field.word("Strike-through on", "not"),
  badgeOn: field.word("Badge lands on", "employee"),
  scheduleOn: field.word("Schedule clock pops on", "schedule"),
  fillsOn: field.word("Calendar fills on", "fills"),
  weekOn: field.word("Next week starts on", "every"),
});
type Params = z.infer<typeof schema>;

const BUBBLE = { x: 220, y: 500, w: 640, h: 230 };
const BADGE_POS = { x: 160, y: 440, w: 760, h: 400 };
const ROWS = 6;

// Calendar poses: the blurred finished calendar behind, the front slot and two stack slots.
type Pose = { x: number; y: number; w: number; h: number; o: number; b: number };
const BG: Pose = { x: 90, y: 250, w: 900, h: 760, o: 0.3, b: 5 };
const FRONT: Pose = { x: 150, y: 590, w: 780, h: 460, o: 1, b: 0 };
const BACK1: Pose = { x: 195, y: 543, w: 690, h: 460, o: 0.6, b: 1 };
const BACK2: Pose = { x: 240, y: 502, w: 600, h: 460, o: 0.32, b: 2 };
const BELOW: Pose = { ...FRONT, y: 700, o: 0 };

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  w: mix(a.w, b.w, t),
  h: mix(a.h, b.h, t),
  o: mix(a.o, b.o, t),
  b: mix(a.b, b.b, t),
});

// Repeat arrow around a clock face: "runs on a schedule".
function ScheduleIcon({ size, color, bg }: { size: number; color: string; bg: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M50 10a40 40 0 1 1-34.6 20" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      <path d="M6 22l10 10 12-8" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="22" fill={color} />
      <path d="M50 38v13l9 6" fill="none" stroke={bg} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Scene10({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const strikeAt = wordFrame(words, params.strikeOn, 9) - 2;
  const badgeAt = wordFrame(words, params.badgeOn, 87) - 3;
  const scheduleAt = wordFrame(words, params.scheduleOn, 163) - 3;
  const fillsAt = wordFrame(words, params.fillsOn, 189) - 4;
  const weekAt = wordFrame(words, params.weekOn, 258) - 3;
  const dropAt = Math.max(strikeAt + 20, badgeAt - 16);

  // ── beat 1: the chatbot is struck out ──
  const strike = interpolate(frame, [strikeAt, strikeAt + 10], [0, 1], { ...clamp, easing: EASE_OUT });
  const drop = interpolate(frame, [dropAt, dropAt + 12], [0, 1], { ...clamp, easing: EASE_IN });
  const sx = BUBBLE.x + 30;
  const sy = BUBBLE.y + BUBBLE.h - 40;
  const ex = BUBBLE.x + BUBBLE.w - 30;
  const ey = BUBBLE.y + 40;

  // ── beat 2: the badge arrives, then makes room for the calendar ──
  const slide = interpolate(frame, [badgeAt - 12, badgeAt], [1, 0], { ...clamp, easing: EASE_OUT });
  const settle = interpolate(frame, [badgeAt - 2, badgeAt + 4, badgeAt + 10], [1, 1.025, 1], clamp);
  const up = prog(frame, fillsAt - 6, 16, EASE_INOUT);
  const badgeScale = settle * mix(1, 0.62, up);
  const badgeY = mix(0, -270, up);
  const badgeHot = prog(frame, badgeAt, 8) * (1 - prog(frame, scheduleAt, 8)) * (0.75 + 0.25 * pulse(frame, 30));

  // schedule clock on the badge's corner
  const clockIn = popScale(frame, scheduleAt, 0.4);
  const clockShow = prog(frame, scheduleAt, 6);
  const clockHot = Math.max(1 - prog(frame, fillsAt + 6, 10), prog(frame, weekAt, 6));
  const clockSpin = interpolate(frame, [weekAt, weekAt + 26], [0, 360], { ...clamp, easing: EASE_INOUT });

  // ── beat 3: calendars fill, week after week ──
  const toBack1 = prog(frame, fillsAt - 4, 16, EASE_INOUT);
  const toBack2 = prog(frame, weekAt, 14, EASE_INOUT);
  const week0 = lerpPose(lerpPose(BG, BACK1, toBack1), BACK2, toBack2);
  const week1 = lerpPose(lerpPose(BELOW, FRONT, prog(frame, fillsAt, 14)), BACK1, toBack2);
  const week2 = lerpPose(BELOW, FRONT, prog(frame, weekAt + 2, 14));

  const fill1 = (i: number) => prog(frame, fillsAt + 10 + i * 8, 12);
  const fill2 = (i: number) => prog(frame, weekAt + 12 + i * 5, 9);
  const hotRow = (f: (i: number) => number) => {
    for (let i = 0; i < ROWS; i++) if (f(i) < 1) return f(i) > 0 ? i : -1;
    return -1;
  };

  const sheetStyle = (p: Pose): CSSProperties => ({ opacity: p.o, filter: p.b > 0.2 ? `blur(${p.b}px)` : undefined });
  const sheetAt = (p: Pose, fill: (i: number) => number, hot: number) =>
    p.o > 0.01 ? <Sheet x={p.x} y={p.y} w={p.w} h={p.h} rows={ROWS} fill={fill} hot={hot} style={sheetStyle(p)} /> : null;

  const clockSize = 190;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {sheetAt(week0, () => 1, -1)}
        {sheetAt(week1, fill1, toBack2 > 0.1 ? -1 : hotRow(fill1))}
        {sheetAt(week2, fill2, hotRow(fill2))}

        {drop < 1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `0px ${drop * 260}px`,
              rotate: `${drop * 8}deg`,
              opacity: (1 - drop) * prog(frame, 0, 6),
            }}
          >
            <ChatBubble {...BUBBLE} side="left" bars={[0.9, 0.75, 0.5]} />
            <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
              <line
                x1={sx}
                y1={sy}
                x2={sx + (ex - sx) * strike}
                y2={sy + (ey - sy) * strike}
                stroke={c.accent}
                strokeWidth={16}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 12px ${c.accent}aa)` }}
              />
            </svg>
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: BADGE_POS.x,
            top: BADGE_POS.y,
            width: BADGE_POS.w,
            height: BADGE_POS.h,
            translate: `${slide * 900}px ${badgeY}px`,
            scale: `${badgeScale}`,
            opacity: frame < badgeAt - 12 ? 0 : 1,
          }}
        >
          <Badge x={0} y={0} w={BADGE_POS.w} h={BADGE_POS.h} title={params.title} titleIn={1} hot={badgeHot} />
          {clockShow > 0 ? (
            <div
              style={{
                position: "absolute",
                left: BADGE_POS.w - clockSize * 0.62,
                top: -clockSize * 0.36,
                width: clockSize,
                height: clockSize,
                borderRadius: clockSize / 2,
                background: clockHot > 0.5 ? c.accent : "#2a2a32",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.5)${clockHot > 0.5 ? `, 0 0 60px ${c.accent}77` : ""}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: `${clockIn}`,
                opacity: clockShow,
              }}
            >
              <div style={{ rotate: `${clockSpin}deg` }}>
                <ScheduleIcon size={clockSize * 0.66} color={clockHot > 0.5 ? c.bg : LIGHT} bg={clockHot > 0.5 ? c.accent : "#2a2a32"} />
              </div>
            </div>
          ) : null}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
