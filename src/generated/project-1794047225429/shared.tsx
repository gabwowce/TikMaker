import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { useBrand } from "../../video/brand/kit";

// Shared pieces of "One sentence in, finished TikTok out": the pipeline (six
// stations – a curved pipe from the idea bubble to the phone in the hook and
// the proof, a straight progress rail at the top in the steps), the phone
// playing a finished video, the idea bubble, the orange token that travels
// the pipe, the mini scene frames and small icons.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const EASE_IN = Easing.bezier(0.5, 0, 0.75, 0);
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const GREY = "#3a3d44";
export const GREY_HI = "#4d5059";
export const CARD_BG = "#1b1b21";
export const LIGHT = "#d9d9df";

export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });
}
export function popScale(frame: number, at: number, from = 0.9) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], { ...clamp, easing: EASE_OUT });
}
export function bounceIn(frame: number, at: number, len = 10) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: EASE_BOUNCE });
}
export const pulse = (frame: number, period = 36) => (Math.sin((frame / period) * Math.PI * 2) + 1) / 2;
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export type Pt = { x: number; y: number };
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });

export const cardStyle = (w: number): CSSProperties => ({
  background: CARD_BG,
  borderRadius: w * 0.038,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
  boxSizing: "border-box",
});

export function Bar({ w, h = 24, color = GREY, style }: { w: number | string; h?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: h / 2, background: color, flexShrink: 0, ...style }} />;
}

// The whole picture: a slow push-in and a gentle drift.
export function Stage({ frame, duration, children }: { frame: number; duration: number; children: ReactNode }) {
  const push = interpolate(frame, [0, duration], [1, 1.025], clamp);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        scale: `${push}`,
        transformOrigin: "540px 640px",
        translate: `0px ${Math.sin(frame / 40) * 5}px`,
      }}
    >
      {children}
    </div>
  );
}

// ── Layout of the hook / proof ─────────────────────────────────────────
export const BUBBLE = { x: 90, y: 300, w: 380, h: 150 };
export const PHONE = { x: 570, y: 300, w: 400, h: 740 };

// The curved pipe: from under the bubble to the phone's left side.
const P0: Pt = { x: 280, y: 450 };
const P1: Pt = { x: 280, y: 900 };
const P2: Pt = { x: 430, y: 930 };
const P3: Pt = { x: 570, y: 700 };
export function pipePoint(t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
    y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
  };
}
export const PIPE_D = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`;
export const PIPE_LEN = 820; // approx. length for the draw-on

// ── The six stations ───────────────────────────────────────────────────
export const STEPS = 6;
export const RAIL_Y = 250;
export const railPoint = (i: number): Pt => ({ x: 190 + i * 140, y: RAIL_Y });
export const pathStation = (i: number): Pt => pipePoint((i + 1) / (STEPS + 1));

// The pipe drawn on (scene 1 / 8): a glowing orange curve.
export function Pipe({ draw, glow = 1, opacity = 1 }: { draw: number; glow?: number; opacity?: number }) {
  const c = useBrand();
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity }}>
      <path d={PIPE_D} fill="none" stroke={GREY} strokeWidth={18} strokeLinecap="round" strokeDasharray={PIPE_LEN} strokeDashoffset={PIPE_LEN * (1 - draw)} />
      <path
        d={PIPE_D}
        fill="none"
        stroke={c.accent}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={PIPE_LEN}
        strokeDashoffset={PIPE_LEN * (1 - draw)}
        style={{ opacity: glow, filter: `drop-shadow(0 0 14px ${c.accent})` }}
      />
    </svg>
  );
}

export function CheckMark({ size, color, stroke = 0.16 }: { size: number; color: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color} strokeWidth={24 * stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The rail: six dots. morph 0 = sitting on the curved pipe, 1 = the straight
// rail at the top. `done` dots are grey with a check; `active` is the big
// orange numbered one; `tick` 0..1 turns the active one done.
export function Rail({
  morph,
  done,
  active,
  tick = 0,
  appear,
  opacity = 1,
  showNumbers = true,
}: {
  morph: number;
  done: number;
  active: number;
  tick?: number;
  appear?: (i: number) => number;
  opacity?: number;
  showNumbers?: boolean;
}) {
  const c = useBrand();
  const pts = Array.from({ length: STEPS }, (_, i) => lerpPt(pathStation(i), railPoint(i), morph));
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: morph }}>
        <polyline points={line} fill="none" stroke={GREY} strokeWidth={6} strokeLinecap="round" />
      </svg>
      {pts.map((p, i) => {
        const s = appear ? appear(i) : 1;
        if (s <= 0.001) return null;
        const isDone = i < done || (i === active && tick >= 0.5);
        const isActive = i === active && tick < 0.5;
        const size = isActive ? interpolate(morph, [0, 1], [40, 88]) : interpolate(morph, [0, 1], [34, 56]);
        const tickPop = i === active ? interpolate(tick, [0.5, 0.75, 1], [1.25, 1.08, 1], clamp) : 1;
        // the active step is light, never orange: orange is the scene's focus
        const bg = isActive ? c.text : isDone ? GREY_HI : CARD_BG;
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
              background: bg,
              border: isActive || isDone ? "none" : `3px solid ${GREY}`,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scale: `${s * tickPop}`,
              boxShadow: isActive ? "0 0 30px rgba(255,255,255,0.18)" : undefined,
            }}
          >
            {isActive && showNumbers && morph > 0.6 ? (
              <span style={{ fontFamily: c.fontStrong, fontSize: 46, color: c.bg, lineHeight: 1, paddingTop: 4 }}>{i + 1}</span>
            ) : null}
            {isDone && morph > 0.6 ? <CheckMark size={size * 0.62} color={c.text} /> : null}
          </div>
        );
      })}
    </div>
  );
}

// The orange token travelling the pipeline.
export function Token({ p, size = 44, opacity = 1 }: { p: Pt; size?: number; opacity?: number }) {
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: p.x - size / 2,
        top: p.y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        background: c.accent,
        boxShadow: `0 0 24px ${c.accent}, 0 0 60px ${c.accent}88`,
        opacity,
      }}
    />
  );
}

// The idea: a chat bubble holding one sentence (one long bar).
export function IdeaBubble({ hot, style }: { hot: number; style?: CSSProperties }) {
  const c = useBrand();
  const { x, y, w, h } = BUBBLE;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>
      <div
        style={{
          ...cardStyle(w),
          width: w,
          height: h,
          borderRadius: 40,
          borderBottomLeftRadius: 10,
          background: "#24242c",
          display: "flex",
          alignItems: "center",
          padding: "0 44px",
        }}
      >
        <div style={{ position: "relative", width: w - 88, height: 34 }}>
          <Bar w="100%" h={34} color={GREY_HI} style={{ position: "absolute" }} />
          <Bar w="100%" h={34} color={c.accent} style={{ position: "absolute", opacity: hot, boxShadow: `0 0 24px ${c.accent}88` }} />
        </div>
      </div>
    </div>
  );
}

// The phone playing a finished vertical video: a flat shape bobbing, two
// bars, a kinetic caption pill that changes every 12 frames, a progress line.
export function Phone({
  frame,
  x,
  y,
  w,
  h,
  lit = 1,
  hot = 0,
  style,
}: {
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
  lit?: number;
  hot?: number;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const bezel = w * 0.035;
  const sw = w - bezel * 2;
  const sh = h - bezel * 2;
  const beat = Math.floor(frame / 12);
  const widths = [0.62, 0.48, 0.7, 0.54, 0.66, 0.44];
  const pillW = sw * widths[beat % widths.length];
  const pillPop = interpolate(frame % 12, [0, 4, 7], [0.85, 1.06, 1], clamp);
  const shapes = ["circle", "square", "card"] as const;
  const shape = shapes[Math.floor(frame / 36) % 3];
  const bob = Math.sin(frame / 9) * 8;
  const icon = sw * 0.42;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: w * 0.14,
        background: "#0a0a0c",
        border: `3px solid ${hot > 0.01 ? `rgba(255,112,36,${0.35 + hot * 0.65})` : "rgba(255,255,255,0.14)"}`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 30px 80px rgba(0,0,0,0.6)${hot > 0.01 ? `, 0 0 ${70 * hot}px rgba(255,112,36,${0.45 * hot})` : ""}`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bezel - 3,
          top: bezel - 3,
          width: sw,
          height: sh,
          borderRadius: w * 0.11,
          overflow: "hidden",
          background: "#17171c",
        }}
      >
        <div style={{ position: "absolute", inset: 0, opacity: lit }}>
          {/* the video's main shape */}
          <div
            style={{
              position: "absolute",
              left: (sw - icon) / 2,
              top: sh * 0.24 + bob,
              width: icon,
              height: shape === "card" ? icon * 0.72 : icon,
              borderRadius: shape === "circle" ? icon / 2 : icon * 0.2,
              background: LIGHT,
              rotate: `${Math.sin(frame / 14) * 4}deg`,
            }}
          />
          <Bar w={sw * 0.56} h={sw * 0.05} color={GREY_HI} style={{ position: "absolute", left: sw * 0.22, top: sh * 0.56 }} />
          <Bar w={sw * 0.4} h={sw * 0.05} color={GREY} style={{ position: "absolute", left: sw * 0.3, top: sh * 0.6 }} />
          {/* the kinetic caption */}
          <div
            style={{
              position: "absolute",
              left: (sw - pillW) / 2,
              top: sh * 0.72,
              width: pillW,
              height: sw * 0.13,
              borderRadius: sw * 0.03,
              background: c.text,
              scale: `${pillPop}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bar w={pillW * 0.7} h={sw * 0.045} color="#2a2a30" />
          </div>
          {/* playing */}
          <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: sw, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: sw * ((frame % 150) / 150), background: c.text }} />
        </div>
      </div>
    </div>
  );
}

// ── Mini vertical scene frames (the scene strip) ───────────────────────
export const FRAME_W = 94;
export const FRAME_H = 167;
export const FRAME_GAP = 6;
export const FRAMES = 9;
export const stripX = (i: number) => (1080 - (FRAMES * FRAME_W + (FRAMES - 1) * FRAME_GAP)) / 2 + i * (FRAME_W + FRAME_GAP);
export const STRIP_Y5 = 850; // scene 5: along the bottom
export const STRIP_Y6 = 560; // scene 6: in the middle

export function MiniFrame({ i, x, y, scale = 1, hot = 0, opacity = 1 }: { i: number; x: number; y: number; scale?: number; hot?: number; opacity?: number }) {
  const c = useBrand();
  const kinds = [0, 1, 2, 1, 0, 2, 1, 0, 2];
  const k = kinds[i % kinds.length];
  const w = FRAME_W;
  const h = FRAME_H;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 12,
        background: "#23232a",
        border: hot > 0.01 ? `3px solid rgba(255,112,36,${hot})` : "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.35), 0 16px 32px rgba(0,0,0,0.4)",
        boxSizing: "border-box",
        overflow: "hidden",
        scale: `${scale}`,
        opacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: w * 0.27,
          top: h * 0.2,
          width: w * 0.46,
          height: k === 2 ? w * 0.32 : w * 0.46,
          borderRadius: k === 0 ? w : 8,
          background: GREY_HI,
        }}
      />
      <Bar w={w * 0.6} h={8} color={GREY} style={{ position: "absolute", left: w * 0.2, top: h * 0.55 }} />
      <div style={{ position: "absolute", left: w * 0.15, top: h * 0.72, width: w * 0.7, height: 16, borderRadius: 4, background: c.text, opacity: 0.75 }} />
    </div>
  );
}
