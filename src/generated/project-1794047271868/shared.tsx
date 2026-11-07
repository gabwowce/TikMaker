import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { RecordingSlot, useBrand } from "../../video/brand/kit";

// Shared pieces of "One sentence → finished TikTok": the five-station
// pipeline (Idea, Hooks, Script, Scenes, MP4 – drawn as icons, no words),
// the orange token that travels it, the phone and a few small parts.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const GREY = "#3a3d44";
export const GREY_HI = "#555862";
export const CARD_BG = "#1c1c22";
export const LIGHT = "#d9d9df";
export const DARK = "#141414";

export function alpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// 0..1 over [at, at+len]
export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + Math.max(1, len)], [0, 1], { ...clamp, easing });
}
// a card entrance with the 1.02 overshoot
export function popScale(frame: number, at: number, from = 0.88) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], { ...clamp, easing: EASE_OUT });
}
export function bounce(frame: number, at: number, len = 10) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: EASE_BOUNCE });
}
export function press(frame: number, at: number) {
  return interpolate(frame, [at - 3, at, at + 6], [1, 0.93, 1], clamp);
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
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        scale: `${interpolate(frame, [0, duration], [1, 1.025], clamp)}`,
        transformOrigin: "540px 640px",
        translate: `0px ${Math.sin(frame / 40) * 5}px`,
      }}
    >
      {children}
    </div>
  );
}

export function CheckMark({ size, color, stroke = 0.16 }: { size: number; color: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color} strokeWidth={24 * stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── The pipeline ──────────────────────────────────────────────────────
export const STATIONS = 5;
export const TILE = 150;
export const GAP = 187.5; // centre to centre: 165 … 915, edges 90 … 990
export const stationX = (i: number) => 540 + (i - 2) * GAP;
// where the pipeline sits: at the top of a step scene, mid-frame in the setup
export const TOP_Y = 300;
export const SETUP_Y = 420;
export const PANEL_Y = 700;
export const PANEL_SCALE = 0.84;

// A station's icon: 0 idea (a bubble), 1 hooks (three rows), 2 script (a
// page), 3 scenes (two vertical frames), 4 MP4 (a play button).
function Glyph({ i, color, cut = CARD_BG }: { i: number; color: string; cut?: string }) {
  if (i === 0)
    return (
      <svg width={76} height={70} viewBox="0 0 76 70">
        <path d="M14 4h48a10 10 0 0 1 10 10v28a10 10 0 0 1-10 10H30l-14 13V52h-2A10 10 0 0 1 4 42V14A10 10 0 0 1 14 4z" fill={color} />
        <rect x={18} y={23} width={40} height={10} rx={5} fill={cut} opacity={0.75} />
      </svg>
    );
  if (i === 1)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[64, 64, 64].map((w, k) => (
          <div key={k} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: color }} />
            <Bar w={w - 22} h={14} color={color} />
          </div>
        ))}
      </div>
    );
  if (i === 2)
    return (
      <div style={{ width: 62, height: 78, borderRadius: 10, border: `6px solid ${color}`, boxSizing: "border-box", padding: "12px 9px", display: "flex", flexDirection: "column", gap: 7 }}>
        {[1, 1, 0.6].map((f, k) => (
          <Bar key={k} w={`${f * 100}%`} h={8} color={color} />
        ))}
      </div>
    );
  if (i === 3)
    return (
      <div style={{ display: "flex", gap: 10 }}>
        {[0, 1].map((k) => (
          <div key={k} style={{ width: 36, height: 64, borderRadius: 8, background: color }} />
        ))}
      </div>
    );
  return (
    <svg width={74} height={74} viewBox="0 0 74 74">
      <circle cx={37} cy={37} r={34} fill={color} />
      <path d="M30 23l22 14-22 14z" fill={cut} />
    </svg>
  );
}

// One tile. `hot` 0..1 turns it orange; `done` gives the small check;
// `dim` fades the stations that are not the point.
export function Station({
  i,
  y,
  appear = 1,
  hot = 0,
  done = false,
  dim = 1,
}: {
  i: number;
  y: number;
  appear?: number;
  hot?: number;
  done?: boolean;
  dim?: number;
}) {
  const c = useBrand();
  if (appear <= 0.001) return null;
  const glyph = hot > 0.5 ? DARK : done ? LIGHT : GREY_HI;
  return (
    <div
      style={{
        position: "absolute",
        left: stationX(i) - TILE / 2,
        top: y - TILE / 2,
        width: TILE,
        height: TILE,
        borderRadius: 36,
        background: hot > 0.01 ? `color-mix(in srgb, ${c.accent} ${hot * 100}%, ${CARD_BG})` : CARD_BG,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${hot > 0.01 ? `, 0 0 ${60 * hot}px ${alpha(c.accent, 0.5 * hot)}` : ""}`,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        scale: `${interpolate(appear, [0, 0.7, 1], [0.6, 1.04, 1])}`,
        opacity: Math.min(1, appear * 1.6) * dim,
      }}
    >
      <Glyph i={i} color={glyph} cut={hot > 0.5 ? c.accent : CARD_BG} />
      {done && hot < 0.5 ? (
        <div
          style={{
            position: "absolute",
            right: -12,
            top: -12,
            width: 46,
            height: 46,
            borderRadius: 23,
            background: GREY_HI,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 14px rgba(0,0,0,0.4)",
          }}
        >
          <CheckMark size={28} color={c.text} />
        </div>
      ) : null}
    </div>
  );
}

// The five stations on one grey pipe. `active` – the station lit (−1: none),
// `hot` – how lit it is; stations before it are done. `draw` 0..1 builds the
// pipe left to right (the setup scene).
export function Pipeline({
  y,
  active = -1,
  hot = 1,
  draw = 1,
  dimRest = true,
  allDone = false,
}: {
  y: number;
  active?: number;
  hot?: number;
  draw?: number;
  dimRest?: boolean;
  allDone?: boolean;
}) {
  const x0 = stationX(0);
  const x1 = stationX(STATIONS - 1);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: x0,
          top: y - 5,
          width: (x1 - x0) * draw,
          height: 10,
          borderRadius: 5,
          background: GREY,
        }}
      />
      {Array.from({ length: STATIONS }, (_, i) => {
        const appear = interpolate(draw, [i / STATIONS, i / STATIONS + 0.22], [0, 1], clamp);
        const isActive = i === active;
        const done = allDone || (active >= 0 && i < active);
        const dim = dimRest && active >= 0 && i > active ? 0.5 : 1;
        return <Station key={i} i={i} y={y} appear={appear} hot={isActive ? hot : 0} done={done} dim={dim} />;
      })}
    </>
  );
}

// Scales what is drawn around the point (540, y) – the pipeline as one piece.
export function ScaleAt({ y, scale = 1, opacity = 1, children }: { y: number; scale?: number; opacity?: number; children: ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, scale: `${scale}`, transformOrigin: `540px ${y}px`, opacity }}>
      {children}
    </div>
  );
}

// A station's centre on screen, for a pipeline at `y` scaled by `scale`.
export const stationPt = (i: number, y: number, scale = 1): Pt => ({ x: 540 + (stationX(i) - 540) * scale, y });

// The orange token travelling the pipeline.
export function Token({ p, size = 56, opacity = 1 }: { p: Pt; size?: number; opacity?: number }) {
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
        boxShadow: `0 0 24px ${c.accent}, 0 0 60px ${alpha(c.accent, 0.55)}`,
        opacity,
      }}
    />
  );
}

// The phone: empty (lit 0) or playing a finished vertical video – a flat
// shape bobbing, two bars, a kinetic caption pill, a progress line.
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
  const bezel = w * 0.045;
  const sw = w - bezel * 2;
  const sh = h - bezel * 2;
  const beat = Math.floor(frame / 12);
  const widths = [0.62, 0.48, 0.7, 0.54, 0.66, 0.44];
  const pillW = sw * widths[beat % widths.length];
  const pillPop = interpolate(frame % 12, [0, 4, 7], [0.85, 1.06, 1], clamp);
  const shapes = ["circle", "square", "card"] as const;
  const shape = shapes[Math.floor(frame / 30) % 3];
  const bob = Math.sin(frame / 9) * 8;
  const icon = sw * 0.44;
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
        border: `4px solid ${hot > 0.01 ? alpha(c.accent, 0.3 + hot * 0.7) : "rgba(255,255,255,0.16)"}`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 30px 80px rgba(0,0,0,0.6)${hot > 0.01 ? `, 0 0 ${80 * hot}px ${alpha(c.accent, 0.45 * hot)}` : ""}`,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: bezel - 4,
          top: bezel - 4,
          width: sw,
          height: sh,
          borderRadius: w * 0.11,
          overflow: "hidden",
          background: "#18181d",
        }}
      >
        <div style={{ position: "absolute", left: sw * 0.37, top: sh * 0.025, width: sw * 0.26, height: sw * 0.07, borderRadius: sw * 0.035, background: "#0a0a0c" }} />
        <div style={{ position: "absolute", inset: 0, opacity: lit }}>
          <div
            style={{
              position: "absolute",
              left: (sw - icon) / 2,
              top: sh * 0.2 + bob,
              width: icon,
              height: shape === "card" ? icon * 0.72 : icon,
              borderRadius: shape === "circle" ? icon / 2 : icon * 0.2,
              background: LIGHT,
              rotate: `${Math.sin(frame / 14) * 4}deg`,
            }}
          />
          <Bar w={sw * 0.56} h={sw * 0.05} color={GREY_HI} style={{ position: "absolute", left: sw * 0.22, top: sh * 0.55 }} />
          <Bar w={sw * 0.4} h={sw * 0.05} color={GREY} style={{ position: "absolute", left: sw * 0.3, top: sh * 0.6 }} />
          <div
            style={{
              position: "absolute",
              left: (sw - pillW) / 2,
              top: sh * 0.71,
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
          <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, width: sw, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ position: "absolute", left: 0, bottom: 0, height: 8, width: sw * ((frame % 150) / 150), background: c.text }} />
        </div>
      </div>
    </div>
  );
}

// A big button with one real word.
export function Button({ label, w, h, hot, scale = 1, style }: { label: string; w: number; h: number; hot: number; scale?: number; style?: CSSProperties }) {
  const c = useBrand();
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: h * 0.28,
        background: hot > 0.5 ? c.accent : GREY,
        boxShadow: hot > 0.5 ? `0 0 ${50 * hot}px ${alpha(c.accent, 0.55)}, 0 12px 30px rgba(0,0,0,0.4)` : "0 12px 30px rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: c.fontStrong,
        fontSize: h * 0.46,
        color: hot > 0.5 ? DARK : c.text,
        scale: `${scale}`,
        paddingTop: h * 0.04,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

// The empty phone at the end of the setup pipeline.
export const PHONE2 = { x: 390, y: 530, w: 300, h: 530 };

// The 'AI agent' card the pipeline sits in (scene 3, leaving in scene 4).
export const PANEL = { x: 90, y: 400, w: 900, h: 450 };

// A four-point spark: the agent's icon.
export function Spark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <path d="M12 1.5c.7 5.6 4.9 9.8 10.5 10.5-5.6.7-9.8 4.9-10.5 10.5C11.3 16.9 7.1 12.7 1.5 12 7.1 11.3 11.3 7.1 12 1.5z" fill={color} />
    </svg>
  );
}

// The recording area under the pipeline in the step scenes (≥ 860 wide).
export const REC = { x: 90, y: 450, w: 900, h: 610 };

// A step scene with the creator's recording: the pipeline on top lights
// station `active` at `lightAt`, the recording rises in under it.
export function StepRecording({
  frame,
  duration,
  active,
  lightAt,
  src,
  record,
}: {
  frame: number;
  duration: number;
  active: number;
  lightAt: number;
  src: string;
  record: string;
}) {
  const rise = interpolate(frame, [0, 14], [0, 1], { ...clamp, easing: EASE_OUT });
  return (
    <Stage frame={frame} duration={duration}>
      <Pipeline y={TOP_Y} active={active} hot={prog(frame, lightAt, 8)} />
      <div
        style={{
          position: "absolute",
          left: REC.x,
          top: REC.y,
          width: REC.w,
          height: REC.h,
          borderRadius: 28,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
          translate: `0px ${(1 - rise) * 120}px`,
          opacity: Math.min(1, rise * 1.5),
        }}
      >
        <RecordingSlot src={src} record={record} width={REC.w} height={REC.h} />
      </div>
    </Stage>
  );
}
