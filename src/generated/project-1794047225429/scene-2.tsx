import { z } from "zod";
import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  BUBBLE,
  CARD_BG,
  cardStyle,
  CheckMark,
  clamp,
  EASE_IN,
  EASE_INOUT,
  GREY,
  GREY_HI,
  IdeaBubble,
  lerpPt,
  pathStation,
  PHONE,
  Phone,
  Pipe,
  popScale,
  prog,
  railPoint,
  STEPS,
  Token,
} from "./shared";

export const description =
  "Picking up exactly where the hook ends, the six dots slide off the curved pipe into a step rail at the top; in the agent panel one sentence types itself into the idea box, the big Start button is pressed and the sentence flies up as a token to tick step 1";

export const schema = z.object({
  button: field.text("Button", "Start"),
  typeOn: field.word("Typing starts on", "type"),
  typedBy: field.word("Typing ends on", "box"),
  pressOn: field.word("Button pressed on", "Start"),
});
type Params = z.infer<typeof schema>;

const PANEL = { x: 110, y: 380, w: 860, h: 650 };
const BOX = { x: 50, y: 60, w: 760, h: 170 }; // inside the panel
const WORDS = [100, 60, 130, 80, 110, 70];
// Scene 1's length: its last frame is where this scene picks up (the stage
// zoom and drift, the phone's playback and glow continue from there).
const HOOK_LEN = 108;

// The stage, continued from the hook: it starts at the hook's end zoom
// (1.025) and drift, eases back to 1 while the rail forms, then pushes in.
function ContinuedStage({ frame, duration, children }: { frame: number; duration: number; children: ReactNode }) {
  const settle = interpolate(frame, [0, 20], [1.025, 1], { ...clamp, easing: EASE_INOUT });
  const push = interpolate(frame, [20, duration], [1, 1.02], clamp);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        scale: `${settle * push}`,
        transformOrigin: "540px 640px",
        translate: `0px ${Math.sin((frame + HOOK_LEN - 1) / 40) * 5}px`,
      }}
    >
      {children}
    </div>
  );
}

// The step dots. At morph 0 they are exactly the hook's last frame (small
// dark dots with a grey ring on the pipe, none active); while they slide to
// the rail at the top the first one grows and turns light, its number fading
// in. tick 0..1 turns step 1 done (grey with a check), as the shared Rail does.
function StepRail({ morph, tick }: { morph: number; tick: number }) {
  const c = useBrand();
  const pts = Array.from({ length: STEPS }, (_, i) => lerpPt(pathStation(i), railPoint(i), morph));
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const done = tick >= 0.5;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: morph }}>
        <polyline points={line} fill="none" stroke={GREY} strokeWidth={6} strokeLinecap="round" />
      </svg>
      {pts.map((p, i) => {
        const first = i === 0;
        const size = first ? interpolate(morph, [0, 1], [34, 88]) : interpolate(morph, [0, 1], [34, 56]);
        const light = first && !done ? morph : 0;
        const pop = first ? interpolate(tick, [0.5, 0.75, 1], [1.25, 1.08, 1], clamp) : 1;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x - size / 2,
              top: p.y - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              background: first && done ? GREY_HI : CARD_BG,
              border: first && done ? "none" : `3px solid ${GREY}`,
              boxSizing: "border-box",
              scale: `${pop}`,
            }}
          >
            {light > 0.001 ? (
              <div
                style={{
                  position: "absolute",
                  inset: -3,
                  borderRadius: size / 2,
                  background: c.text,
                  opacity: light,
                  boxShadow: `0 0 30px rgba(255,255,255,${0.18 * light})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: c.fontStrong,
                    fontSize: 46,
                    color: c.bg,
                    lineHeight: 1,
                    paddingTop: 4,
                    opacity: interpolate(morph, [0.6, 0.9], [0, 1], clamp),
                  }}
                >
                  1
                </span>
              </div>
            ) : null}
            {first && done ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckMark size={size * 0.62} color={c.text} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typeOn, 18) - 2;
  const typedAt = Math.max(typeAt + 20, wordFrame(words, params.typedBy, 68) + 4);
  const pressAt = wordFrame(words, params.pressOn, 96, 10) - 2;

  // the hook leaves; its dots slide off the pipe into the rail at the top
  // (the hook clears first, then the panel rises, so the two never cross-fade)
  const morph = interpolate(frame, [0, 18], [0, 1], { ...clamp, easing: EASE_INOUT });
  const out = prog(frame, 0, 8, EASE_IN);
  const panelIn = prog(frame, 10, 14);
  // the phone keeps the glow it had at the end of the hook while it leaves
  const phoneHot = (0.7 + 0.3 * Math.sin((frame + HOOK_LEN - 1) / 8)) * (1 - out);

  // typing: word bars appear one by one
  const typed = interpolate(frame, [typeAt, typedAt], [0, WORDS.length], clamp);
  const typing = frame >= typeAt && frame < pressAt;
  const boxHot = interpolate(frame, [typeAt - 4, typeAt, pressAt - 18, pressAt - 12], [0, 1, 1, 0], clamp);
  const btnHot = interpolate(frame, [pressAt - 16, pressAt - 10], [0, 1], clamp);
  const press = interpolate(frame, [pressAt, pressAt + 3, pressAt + 9], [1, 0.9, 1], clamp);

  // the sentence leaves the box as a token and ticks step 1
  const fly = prog(frame, pressAt + 2, 14, EASE_IN);
  const from = { x: PANEL.x + BOX.x + 60 + 320, y: PANEL.y + BOX.y + BOX.h / 2 };
  const tickAt = pressAt + 16;
  const tick = prog(frame, tickAt, 8);
  const textGone = frame >= pressAt + 2;

  let wx = 0;
  return (
    <AbsoluteFill>
      <ContinuedStage frame={frame} duration={durationInFrames}>
        {out < 1 ? (
          <>
            <Pipe draw={1} glow={0.12} opacity={1 - out} />
            <IdeaBubble hot={0} style={{ opacity: 1 - out, translate: `${-out * 120}px 0px`, transformOrigin: `0px ${BUBBLE.h}px` }} />
            <Phone frame={frame + 80} {...PHONE} hot={phoneHot} style={{ opacity: 1 - out, translate: `${out * 200}px 0px` }} />
          </>
        ) : null}
        <StepRail morph={morph} tick={tick} />

        <div
          style={{
            position: "absolute",
            left: PANEL.x,
            top: PANEL.y,
            width: PANEL.w,
            height: PANEL.h,
            ...cardStyle(PANEL.w),
            opacity: panelIn,
            translate: `0px ${(1 - panelIn) * 120}px`,
            scale: `${popScale(frame, 10, 0.96)}`,
          }}
        >
          {/* the idea box */}
          <div
            style={{
              position: "absolute",
              left: BOX.x,
              top: BOX.y,
              width: BOX.w,
              height: BOX.h,
              borderRadius: 28,
              background: "#121216",
              border: `4px solid ${boxHot > 0.5 ? c.accent : GREY}`,
              boxShadow: boxHot > 0.5 ? `0 0 40px ${c.accent}44` : undefined,
              boxSizing: "border-box",
            }}
          >
            {!textGone
              ? WORDS.map((w, i) => {
                  const left = 52 + wx;
                  wx += w + 16;
                  const show = typed > i;
                  if (!show) return null;
                  return <Bar key={i} w={w} h={36} color={c.text} style={{ position: "absolute", left, top: (BOX.h - 36) / 2 }} />;
                })
              : null}
            {typing && Math.floor(frame / 8) % 2 === 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: 52 + WORDS.slice(0, Math.ceil(typed)).reduce((a, b) => a + b + 16, 0),
                  top: (BOX.h - 64) / 2,
                  width: 6,
                  height: 64,
                  background: c.accent,
                  borderRadius: 3,
                }}
              />
            ) : null}
          </div>
          {/* the other fields, as grey rows */}
          {[0, 1].map((r) => (
            <div key={r} style={{ position: "absolute", left: BOX.x, top: 280 + r * 100, display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: GREY }} />
              <Bar w={r === 0 ? 300 : 420} h={26} color={GREY} />
            </div>
          ))}
          {/* Start */}
          <div
            style={{
              position: "absolute",
              left: (PANEL.w - 420) / 2,
              top: 480,
              width: 420,
              height: 120,
              borderRadius: 30,
              background: btnHot > 0.5 ? c.accent : GREY_HI,
              boxShadow: btnHot > 0.5 ? `0 0 ${40 + 30 * (1 - press)}px ${c.accent}88` : undefined,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scale: `${press}`,
              opacity: interpolate(btnHot, [0, 1], [0.55, 1]),
            }}
          >
            <span style={{ fontFamily: c.fontStrong, fontSize: 68 * c.widthFactor, color: btnHot > 0.5 ? c.bg : c.text, paddingTop: 6 }}>
              {params.button}
            </span>
          </div>
        </div>

        {frame >= pressAt + 2 && frame < tickAt + 1 ? <Token p={lerpPt(from, railPoint(0), fly)} /> : null}
      </ContinuedStage>
    </AbsoluteFill>
  );
}
