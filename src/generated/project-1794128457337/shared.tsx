import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { useBrand } from "../../video/brand/kit";

// Shared pieces of "one sentence in, one video out": the agent panel with its
// five-step progress bar (scenes 3, 5, 6), the step pill, grey bars, the
// cursor, small icons.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const GREY = "#3a3d44";
export const GREY_LIGHT = "#4a4d55";
export const CARD_BG = "#1c1e23";
export const LIGHT = "#e6e6e8";

// 0 → 1 over `len` frames from `at`.
export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });
}
// A card entrance with a 1.02 overshoot.
export function popScale(frame: number, at: number, from = 0.92) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], { ...clamp, easing: EASE_OUT });
}
// A small icon entrance (bouncy).
export function bounceIn(frame: number, at: number, len = 10) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: EASE_BOUNCE });
}
export const pulse = (frame: number, period = 36) => (Math.sin((frame / period) * Math.PI * 2) + 1) / 2;

export type Rect = { x: number; y: number; w: number; h: number };
export const rectStyle = (r: Rect): CSSProperties => ({
  position: "absolute",
  left: r.x,
  top: r.y,
  width: r.w,
  height: r.h,
});

export const cardStyle = (w: number): CSSProperties => ({
  background: CARD_BG,
  borderRadius: w * 0.038,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
  overflow: "hidden",
  boxSizing: "border-box",
});

export function Bar({ w, h = 22, color = GREY, style }: { w: number | string; h?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: h / 2, background: color, flexShrink: 0, ...style }} />;
}

// The whole picture: a slow push-in and a gentle drift.
export function Stage({ frame, duration, children }: { frame: number; duration: number; children: ReactNode }) {
  const push = interpolate(frame, [0, duration], [1, 1.03], clamp);
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

// The step number, always in the same place at the top of the picture zone.
export function StepPill({ n }: { n: number }) {
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - 50,
        top: 205,
        width: 100,
        height: 100,
        borderRadius: 50,
        background: LIGHT,
        color: c.bg,
        fontFamily: c.fontStrong,
        fontSize: 60 * c.widthFactor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 6,
        boxSizing: "border-box",
        boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
      }}
    >
      {n}
    </div>
  );
}

export function Check({ size, color, t = 1 }: { size: number; color: string; t?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M4 12.5l5 5L20 6.5"
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - t}
        fill="none"
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The mouse pointer; (x, y) is its tip. `press` 0..1 shrinks it a little.
export function Cursor({ x, y, press = 0, opacity = 1 }: { x: number; y: number; press?: number; opacity?: number }) {
  return (
    <svg
      width={70}
      height={70}
      viewBox="0 0 24 24"
      style={{
        position: "absolute",
        left: x - 6,
        top: y - 3,
        opacity,
        scale: `${1 - press * 0.15}`,
        transformOrigin: "6px 3px",
        filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))",
      }}
    >
      <path d="M2 1 L2 19 L7 14.5 L10.5 22 L14 20.5 L10.5 13 L17 13 Z" fill="#fff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

// A click ripple: an orange ring that grows and fades from `at`.
export function Ripple({ x, y, frame, at }: { x: number; y: number; frame: number; at: number }) {
  const c = useBrand();
  const t = prog(frame, at, 14);
  if (frame < at || t >= 1) return null;
  const r = 30 + t * 70;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        border: `6px solid ${c.accent}`,
        opacity: 1 - t,
        boxSizing: "border-box",
      }}
    />
  );
}

// ── The agent panel ────────────────────────────────────────────────────
// A tall card: a title bar, the five-step progress bar (Idea, Angle,
// Script, Building, Result) as dots on a line, then a body.
// `done` – how many dots are ticked (fractional = the next one is ticking);
// `active` – the dot that is the focus right now (orange, pulsing).
export const PANEL: Rect = { x: 140, y: 345, w: 800, h: 720 };
export const PANEL_HEAD = 150;

export function AgentPanel({
  rect = PANEL,
  frame,
  done,
  active,
  children,
}: {
  rect?: Rect;
  frame: number;
  done: number;
  active: number;
  children?: ReactNode;
}) {
  const c = useBrand();
  const dot = 56;
  const left = 70;
  const span = rect.w - left * 2;
  const step = span / 4;
  // the line runs to the active dot
  const fill = Math.max(0, Math.min(4, Math.max(done - 1, active)));
  return (
    <div style={{ ...rectStyle(rect), ...cardStyle(rect.w) }}>
      {/* title bar */}
      <div
        style={{
          height: 54,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 26px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <Sparkle size={30} color={c.textSoft} />
        <Bar w={150} h={16} color="#34373e" />
      </div>
      {/* progress */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 54, height: PANEL_HEAD - 54 }}>
        <div style={{ position: "absolute", left: left, width: span, top: 48 - 3, height: 6, borderRadius: 3, background: GREY }} />
        <div
          style={{
            position: "absolute",
            left: left,
            width: (span * fill) / 4,
            top: 48 - 3,
            height: 6,
            borderRadius: 3,
            background: LIGHT,
          }}
        />
        {[0, 1, 2, 3, 4].map((i) => {
          const tick = Math.max(0, Math.min(1, done - i));
          const isActive = i === active && tick < 1;
          const glow = isActive ? 0.55 + pulse(frame, 30) * 0.45 : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: left + i * step - dot / 2,
                top: 48 - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                background: tick > 0.5 ? LIGHT : isActive ? c.accent : CARD_BG,
                border: tick > 0.5 || isActive ? "none" : `5px solid ${GREY}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                scale: `${1 + Math.sin(tick * Math.PI) * 0.2}`,
                boxShadow: isActive ? `0 0 ${30 * glow}px ${c.accent}` : "none",
              }}
            >
              {tick > 0.01 ? <Check size={34} color={c.bg} t={tick} /> : null}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: PANEL_HEAD, bottom: 0 }}>{children}</div>
    </div>
  );
}

// A card inside the panel body: an icon square + bars, optional right part.
export function PanelCard({
  icon,
  bars = [0.6, 0.38],
  hot = 0,
  height = 120,
  right,
  style,
}: {
  icon: ReactNode;
  bars?: number[];
  hot?: number;
  height?: number;
  right?: ReactNode;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const w = 680;
  return (
    <div
      style={{
        width: w,
        height,
        borderRadius: 26,
        background: "#24262c",
        border: hot > 0.02 ? `3px solid rgba(255,112,36,${hot})` : "1px solid rgba(255,255,255,0.1)",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "0 28px",
        ...style,
      }}
    >
      <div
        style={{
          width: height - 40,
          height: height - 40,
          borderRadius: 20,
          background: hot > 0.5 ? c.accent : "#33363d",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        {bars.map((f, i) => (
          <Bar key={i} w={`${f * 100}%`} h={i === 0 ? 22 : 18} color={i === 0 ? GREY_LIGHT : GREY} />
        ))}
      </div>
      {right}
    </div>
  );
}

// ── Icons (flat, one colour) ───────────────────────────────────────────
export function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill={color} />
    </svg>
  );
}
// A template: a 9:16 frame split into blocks.
export function TemplateIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x={6} y={2} width={12} height={20} rx={2.4} fill="none" stroke={color} strokeWidth={2} />
      <rect x={8.5} y={5} width={7} height={5} rx={1} fill={color} />
      <rect x={8.5} y={12} width={7} height={1.8} rx={0.9} fill={color} />
      <rect x={8.5} y={15.5} width={4.5} height={1.8} rx={0.9} fill={color} />
    </svg>
  );
}
export function PictureIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x={2.5} y={4} width={19} height={16} rx={2.5} fill="none" stroke={color} strokeWidth={2} />
      <circle cx={8.5} cy={9.5} r={2} fill={color} />
      <path d="M4 18 L10 12.5 L14 16 L17 13.5 L20.5 17 L20.5 18.5 L4 18.5 Z" fill={color} />
    </svg>
  );
}
export function MotionIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx={15} cy={12} r={5.5} fill={color} />
      <path d="M2.5 9 H7.5 M1.5 12 H7 M2.5 15 H7.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
export function WaveIcon({ size, color }: { size: number; color: string }) {
  const hs = [6, 12, 18, 10, 15, 7];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {hs.map((h, i) => (
        <rect key={i} x={2.5 + i * 3.5} y={12 - h / 2} width={2.2} height={h} rx={1.1} fill={color} />
      ))}
    </svg>
  );
}
export function Chevron({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M8 5 L15 12 L8 19" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function DownloadIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 3 V15 M6.5 10 L12 15.5 L17.5 10" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20 H20" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  );
}
