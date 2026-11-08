import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  CARD_BG,
  cardStyle,
  CheckMark,
  clamp,
  EASE_OUT,
  GREY,
  GREY_HI,
  hotGlow,
  IconChip,
  LIGHT,
  popScale,
  prog,
  pulse,
  RobotIcon,
  Stage,
} from "./shared";

export const description =
  "An employee ID badge prints itself – robot photo, name, title – while a thin orange 60s timeline fills under it; when it is full the badge lights up as hired and a clock and a coin pop out";

export const schema = z.object({
  seconds: field.number("Timeline length (s)", 60, { min: 5, max: 99 }),
  timerOn: field.word("60s label lights on", "60"),
  photoOn: field.word("Photo prints on", "AI"),
  doneOn: field.word("Badge is done on", "seconds"),
});
type Params = z.infer<typeof schema>;

const BADGE = { x: 130, y: 300, w: 820, h: 440 };
const AV = 240;
const TRACK = { x: 250, y: 830, w: 520, h: 16 };
const CHIP = { size: 150, y: 905, xs: [400, 680] };

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const photoAt = wordFrame(words, params.photoOn, 18) - 4;
  const timerAt = wordFrame(words, params.timerOn, 41) - 3;
  const doneAt = wordFrame(words, params.doneOn, 51) + 4;

  // the badge card lands empty (a blueprint), then gets filled in
  const cardIn = popScale(frame, 0, 0.88);
  const cardDrop = interpolate(frame, [0, 12], [-60, 0], { ...clamp, easing: EASE_OUT });
  const print = interpolate(frame, [photoAt, photoAt + 20], [0, 1], clamp);
  const nameIn = prog(frame, photoAt + 12, 12);
  const titleIn = prog(frame, photoAt + 20, 12);

  // the 60-second timeline: fills from the start to the "done" word
  const fill = interpolate(frame, [4, doneAt], [0, 1], clamp);
  const done = prog(frame, doneAt, 8);
  const labelHot = interpolate(frame, [timerAt, timerAt + 4], [0, 1], clamp) * (1 - done);
  const labelPunch = interpolate(frame, [timerAt, timerAt + 5, timerAt + 12], [1, 1.14, 1], clamp);

  const glow = hotGlow(c.accent, done * (0.75 + pulse(frame, 30) * 0.25));
  const checkIn = bounceIn(frame, doneAt + 2, 10);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* ── the employee ID badge ── */}
        <div
          style={{
            position: "absolute",
            left: BADGE.x,
            top: BADGE.y,
            width: BADGE.w,
            height: BADGE.h,
            scale: `${cardIn * (1 + done * 0.02)}`,
            translate: `0px ${cardDrop}px`,
            opacity: prog(frame, 0, 6),
          }}
        >
          {/* lanyard strap and clip */}
          <div style={{ position: "absolute", left: BADGE.w / 2 - 110, top: -110, width: 40, height: 90, background: GREY, rotate: "18deg", borderRadius: 8 }} />
          <div style={{ position: "absolute", left: BADGE.w / 2 + 70, top: -110, width: 40, height: 90, background: GREY, rotate: "-18deg", borderRadius: 8 }} />
          <div style={{ position: "absolute", left: BADGE.w / 2 - 70, top: -54, width: 140, height: 80, borderRadius: 20, background: GREY_HI }} />
          <div style={{ position: "absolute", left: BADGE.w / 2 - 40, top: -30, width: 80, height: 22, borderRadius: 11, background: CARD_BG }} />

          <div
            style={{
              position: "absolute",
              inset: 0,
              ...cardStyle(BADGE.w),
              background: "#202027",
              overflow: "hidden",
              boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${glow ? `, ${glow}` : ""}`,
            }}
          >
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 56, background: "rgba(255,255,255,0.05)" }} />

            {/* the photo: an empty dashed frame, then printed top to bottom */}
            <div style={{ position: "absolute", left: 60, top: 120, width: AV, height: AV }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: AV * 0.24, border: `4px dashed ${GREY_HI}`, opacity: 1 - print }} />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: AV * 0.24,
                  background: "#2c2c34",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  clipPath: `inset(0 0 ${(1 - print) * 100}% 0 round ${AV * 0.24}px)`,
                }}
              >
                <RobotIcon size={AV * 0.72} color={LIGHT} />
              </div>
              {print > 0 && print < 1 ? (
                <div
                  style={{
                    position: "absolute",
                    left: -10,
                    right: -10,
                    top: AV * print - 3,
                    height: 6,
                    borderRadius: 3,
                    background: c.text,
                    boxShadow: `0 0 24px ${c.text}`,
                  }}
                />
              ) : null}
            </div>

            {/* name and title: dashed slots that fill with bars */}
            <div style={{ position: "absolute", left: 350, right: 60, top: 140, display: "flex", flexDirection: "column", gap: 34 }}>
              <div style={{ position: "relative", height: 34 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 17, border: `3px dashed ${GREY}`, opacity: 1 - nameIn }} />
                <Bar w={`${78 * nameIn}%`} h={34} color={GREY_HI} />
              </div>
              <div style={{ position: "relative", height: 26 }}>
                <div style={{ position: "absolute", inset: 0, width: "55%", borderRadius: 13, border: `3px dashed ${GREY}`, opacity: 1 - titleIn }} />
                <Bar w={`${55 * titleIn}%`} h={26} color={GREY} />
              </div>
              <div style={{ position: "relative", height: 26 }}>
                <Bar w={`${40 * titleIn}%`} h={26} color={GREY} />
              </div>
            </div>
          </div>

          {/* "hired": the check on the photo's corner */}
          {checkIn > 0.001 ? (
            <div
              style={{
                position: "absolute",
                left: 60 + AV - 50,
                top: 120 + AV - 50,
                width: 84,
                height: 84,
                borderRadius: 42,
                background: c.accent,
                border: "6px solid #202027",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: `${checkIn}`,
                boxSizing: "border-box",
              }}
            >
              <CheckMark size={50} color={c.bg} stroke={0.2} />
            </div>
          ) : null}
        </div>

        {/* ── the 60-second timeline ── */}
        <div style={{ opacity: prog(frame, 4, 8) }}>
          {/* stopwatch */}
          <svg width={92} height={92} viewBox="0 0 100 100" style={{ position: "absolute", left: 130, top: TRACK.y - 46 + 8 }}>
            <rect x="40" y="2" width="20" height="10" rx="4" fill={LIGHT} />
            <circle cx="50" cy="56" r="36" fill="none" stroke={LIGHT} strokeWidth="9" />
            <line
              x1="50"
              y1="56"
              x2={50 + Math.sin(fill * Math.PI * 2) * 24}
              y2={56 - Math.cos(fill * Math.PI * 2) * 24}
              stroke={LIGHT}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          {/* track, ticks, fill */}
          <div style={{ position: "absolute", left: TRACK.x, top: TRACK.y, width: TRACK.w, height: TRACK.h, borderRadius: 8, background: GREY }} />
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: TRACK.x + (TRACK.w * i) / 6 - 3,
                top: TRACK.y + TRACK.h + 12,
                width: 6,
                height: 18,
                borderRadius: 3,
                background: fill >= i / 6 ? (done > 0.5 ? LIGHT : c.accent) : GREY,
                opacity: 0.8,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: TRACK.x,
              top: TRACK.y,
              width: Math.max(TRACK.h, TRACK.w * fill),
              height: TRACK.h,
              borderRadius: 8,
              background: done > 0.5 ? LIGHT : c.accent,
              opacity: fill > 0 ? 1 : 0,
              boxShadow: done > 0.5 ? "none" : `0 0 24px ${c.accent}88`,
            }}
          />
          {/* the head */}
          <div
            style={{
              position: "absolute",
              left: TRACK.x + TRACK.w * fill - 18,
              top: TRACK.y + TRACK.h / 2 - 18,
              width: 36,
              height: 36,
              borderRadius: 18,
              background: done > 0.5 ? LIGHT : c.accent,
              border: "5px solid #141419",
              boxSizing: "border-box",
              opacity: 1 - done,
            }}
          />
          {/* the one number */}
          <div
            style={{
              position: "absolute",
              left: TRACK.x + TRACK.w + 30,
              top: TRACK.y - 52,
              fontFamily: c.fontStrong,
              fontSize: 96,
              lineHeight: 1,
              color: labelHot > 0.5 ? c.accent : c.text,
              opacity: 0.55 + 0.45 * Math.max(labelHot, done),
              scale: `${labelPunch}`,
              transformOrigin: "0% 50%",
              paddingTop: 8,
            }}
          >
            {params.seconds}
            <span style={{ fontSize: 56 }}>s</span>
          </div>
        </div>

        {/* ── what it brings: time back, money ── */}
        {CHIP.xs.map((x, i) => {
          const s = bounceIn(frame, doneAt + 6 + i * 5, 10);
          if (s <= 0.001) return null;
          return (
            <IconChip
              key={i}
              size={CHIP.size}
              hot={0}
              style={{
                position: "absolute",
                left: x - CHIP.size / 2,
                top: CHIP.y,
                scale: `${s}`,
                translate: `0px ${(1 - Math.min(1, s)) * -50}px`,
              }}
            >
              {i === 0 ? <ClockBackIcon size={CHIP.size * 0.58} color={LIGHT} /> : <CoinIcon size={CHIP.size * 0.6} color={LIGHT} />}
            </IconChip>
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}

// A clock with an arrow running around it (= time back).
function ClockBackIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M20 30A38 38 0 1 1 12 54" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" />
      <path d="M8 18l12 14 15-8" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 30v22l14 10" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A coin with a dollar sign (= money).
function CoinIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="42" fill={color} />
      <circle cx="50" cy="50" r="31" fill="none" stroke={CARD_BG} strokeWidth="4" opacity="0.5" />
      <path
        d="M62 36c-3-5-8-7-13-7-7 0-12 4-12 10 0 13 26 8 26 21 0 6-6 11-13 11-6 0-11-3-14-8M50 22v56"
        fill="none"
        stroke={CARD_BG}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
