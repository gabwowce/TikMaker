import { z } from "zod";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  BulbIcon,
  CalendarIcon,
  CARD_BG,
  cardStyle,
  clamp,
  EASE_OUT,
  GREY,
  GREY_HI,
  LIGHT,
  popScale,
  prog,
  pulse,
  ScriptIcon,
  Stage,
  StepPill,
} from "./shared";

export const description =
  "A weekly content calendar scrolls past week after week of the same idea + script task; it stops on this week, which gets circled in orange, a repeat badge pops on, and a pencil slowly fills its idea and script by hand";

export const schema = z.object({
  step: field.number("Step number", 1, { min: 1, max: 9 }),
  weeks: field.number("Weeks scrolled past", 6, { min: 2, max: 10 }),
  circleOn: field.word("Stops and circles on", "this"),
  repeatOn: field.word("Repeat badge on", "every"),
  ideaOn: field.word("Pencil writes the idea on", "filling"),
  scriptOn: field.word("Pencil writes the script on", "scripts"),
});
type Params = z.infer<typeof schema>;

const CARD = { x: 150, y: 330, w: 780, h: 720 };
const HEAD = 100;
const VIEW_H = CARD.h - HEAD;
const ROW_H = 155;
const PAD = 40;
const CHIP_W = 620;
const CHIP_H = 100;
const SLOT_BAR = 180;
// the row that ends in the middle of the window
const STOP_ROW = 8;

function PencilIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M70 8l22 22-52 52-28 6 6-28z" fill={color} />
      <path d="M18 60l22 22" stroke={CARD_BG} strokeWidth="5" />
      <path d="M60 18l22 22" stroke={CARD_BG} strokeWidth="5" />
    </svg>
  );
}

function RepeatIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M22 46a28 28 0 0 1 50-17" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <path d="M78 54a28 28 0 0 1-50 17" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      <path d="M62 22l14 8-4 16" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 78l-14-8 4-16" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// One slot of the weekly task: an icon and its bar (0..1 filled).
function Slot({ icon, fill, on, track }: { icon: "idea" | "script"; fill: number; on: boolean; track: boolean }) {
  const c = useBrand();
  const col = on ? c.bg : LIGHT;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {icon === "idea" ? <BulbIcon size={46} color={col} /> : <ScriptIcon size={46} color={col} />}
      <div style={{ position: "relative", width: SLOT_BAR, height: 24 }}>
        {track ? <Bar w={SLOT_BAR} h={24} color={on ? "rgba(0,0,0,0.18)" : GREY} style={{ position: "absolute" }} /> : null}
        <Bar w={SLOT_BAR * fill} h={24} color={col} style={{ position: "absolute" }} />
      </div>
    </div>
  );
}

// One week: the same task chip (idea + script). Past weeks are done (grey,
// full); this week starts empty and is filled by hand.
function WeekRow({ top, hot, dim, idea, script, isThis }: { top: number; hot: number; dim: number; idea: number; script: number; isThis: boolean }) {
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
          borderRadius: 24,
          background: on ? c.accent : "#34343d",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 30px",
          boxSizing: "border-box",
          flexShrink: 0,
          scale: `${1 + hot * 0.04}`,
          boxShadow: on ? `0 0 40px ${c.accent}66` : "none",
        }}
      >
        <Slot icon="idea" fill={isThis ? idea : 1} on={on} track={isThis} />
        <Slot icon="script" fill={isThis ? script : 1} on={on} track={isThis} />
      </div>
    </div>
  );
}

// A hand-written fill: slow, in small uneven strokes.
function handFill(frame: number, from: number, to: number) {
  const t = interpolate(frame, [from, to], [0, 1], clamp);
  const steps = 7;
  const k = Math.floor(t * steps);
  const within = t * steps - k;
  return Math.min(1, (k + Easing.bezier(0.3, 0, 0.2, 1)(within)) / steps);
}

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const stopAt = wordFrame(words, params.circleOn, 84) - 3;
  const repeatAt = wordFrame(words, params.repeatOn, 114) - 2;
  const ideaAt = wordFrame(words, params.ideaOn, 146) - 2;
  const scriptAt = wordFrame(words, params.scriptOn, 225) - 4;
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

  // by hand: the idea fills up to the script word, the script to the end
  const ideaEnd = Math.min(scriptAt - 6, ideaAt + 70);
  const idea = handFill(frame, ideaAt + 4, ideaEnd);
  const script = handFill(frame, scriptAt, Math.max(scriptAt + 20, durationInFrames - 20));

  const first = Math.floor(p / ROW_H) - 1;
  const rows = Array.from({ length: Math.ceil(VIEW_H / ROW_H) + 3 }, (_, i) => first + i);

  // the circled chip's centre on the canvas
  const cx = CARD.x + CARD.w / 2;
  const cy = CARD.y + HEAD + VIEW_H / 2;

  // the pencil sits on the tip of the bar being written
  const chipLeft = cx - CHIP_W / 2;
  const ideaBarX = chipLeft + 30 + 46 + 16;
  const scriptBarX = cx + CHIP_W / 2 - 30 - SLOT_BAR;
  const writingScript = frame >= scriptAt;
  const tipX = writingScript ? scriptBarX + SLOT_BAR * script : ideaBarX + SLOT_BAR * idea;
  const wiggle = Math.sin(frame * 0.9) * 6;
  const pencilIn = prog(frame, ideaAt, 10);
  const pencilOut = 1 - prog(frame, durationInFrames - 12, 8);
  const PEN = 130;

  const repeatS = bounceIn(frame, repeatAt, 12);

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
                  idea={idea}
                  script={script}
                  isThis={isStop}
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
            rx={370}
            ry={98}
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

        {/* every single week: a repeat badge on the card's corner */}
        <div
          style={{
            position: "absolute",
            left: CARD.x + CARD.w - 100,
            top: CARD.y - 60,
            width: 150,
            height: 150,
            borderRadius: 75,
            background: "#2a2a32",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: `${repeatS}`,
            opacity: frame >= repeatAt ? 1 : 0,
            rotate: `${interpolate(frame, [repeatAt, repeatAt + 30], [-120, 0], { ...clamp, easing: EASE_OUT })}deg`,
          }}
        >
          <RepeatIcon size={96} color={LIGHT} />
        </div>

        {/* by hand: a pencil writing on the bar's tip */}
        <div
          style={{
            position: "absolute",
            left: tipX - PEN * 0.12,
            top: cy - PEN * 0.88 + 2 + wiggle,
            opacity: pencilIn * pencilOut,
            translate: `0px ${(1 - pencilIn) * 40}px`,
            filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.55))",
          }}
        >
          <PencilIcon size={PEN} color={LIGHT} />
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
