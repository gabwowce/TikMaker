import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { Logo, MONO, useBrand } from "../../video/brand/kit";

// Shared pieces of "3 Claude Code commands": the row of three command slots
// (it carries through scenes 2–6), the terminal window, the file cards that
// break and come back clean, the chat history, keycaps and small icons.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const EASE_IN = Easing.bezier(0.5, 0, 0.75, 0);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const GREY = "#3a3d44";
export const CARD_BG = "#1c1e23";
export const LIGHT = "#e6e6e8";

// 0 → 1 over `len` frames from `at`.
export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });
}

// A card entrance with a 1.02 overshoot.
export function popScale(frame: number, at: number, from = 0.94) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], { ...clamp, easing: EASE_OUT });
}

// A small icon / sticker entrance (bouncy).
export function bounceIn(frame: number, at: number, len = 10) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: EASE_BOUNCE });
}

// A slow pulse 0..1 (for the focus).
export const pulse = (frame: number, period = 36) => (Math.sin((frame / period) * Math.PI * 2) + 1) / 2;

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export type Rect = { x: number; y: number; w: number; h: number };
export const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  w: mix(a.w, b.w, t),
  h: mix(a.h, b.h, t),
});
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

// A grey skeleton line (text drawn as a bar).
export function Bar({ w, h = 22, color = GREY, style }: { w: number | string; h?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: h / 2, background: color, flexShrink: 0, ...style }} />;
}

// The whole picture: a slow push-in and a gentle drift (calm, never frozen).
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

// ── The three command slots ────────────────────────────────────────────
// A row at the top of the picture zone; the active one is wide and shows its
// command, the others are narrow and show their number.
export const ROW_Y = 215;
export const SLOT_H = 132;

// The slot rects for: -1 = three equal empty slots, 0/1/2 = that one wide.
export function rowRects(active: number): Rect[] {
  const gap = 15;
  const widths = active < 0 ? [290, 290, 290] : [0, 1, 2].map((i) => (i === active ? 560 : 155));
  let x = 90;
  return widths.map((w) => {
    const r = { x, y: ROW_Y, w, h: SLOT_H };
    x += w + gap;
    return r;
  });
}

// The slots as a column on the left (the CTA).
export function columnRects(): Rect[] {
  return [0, 1, 2].map((i) => ({ x: 90, y: 300 + i * 200, w: 300, h: 170 }));
}

export type SlotLook = {
  rect: Rect;
  label?: string; // shown when there is room
  hot?: number; // 0..1 – orange focus
  filled?: number; // 0..1 – the slot has its command (number turns light)
  dim?: number; // opacity
  labelFont?: "mono" | "strong";
};

export function Slot({ n, look }: { n: number; look: SlotLook }) {
  const c = useBrand();
  const { rect, label, hot = 0, filled = 0, dim = 1, labelFont = "mono" } = look;
  const labelOp = interpolate(rect.w, [330, 520], [0, 1], clamp);
  const badge = Math.min(84, rect.h - 40);
  return (
    <div
      style={{
        ...rectStyle(rect),
        ...cardStyle(560),
        borderRadius: 30,
        border: hot > 0.01 ? `3px solid rgba(255,112,36,${hot})` : "1px solid rgba(255,255,255,0.12)",
        display: "flex",
        alignItems: "center",
        gap: 26,
        paddingLeft: interpolate(labelOp, [0, 1], [(rect.w - badge) / 2, 26]),
        opacity: dim,
      }}
    >
      <div
        style={{
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          flexShrink: 0,
          background: hot > 0.5 ? c.accent : filled > 0.5 ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.06)",
          border: filled > 0.5 || hot > 0.5 ? "none" : "3px dashed rgba(255,255,255,0.18)",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: c.fontStrong,
          fontSize: badge * 0.55,
          color: hot > 0.5 || filled > 0.5 ? c.bg : c.textSoft,
          paddingTop: 4,
        }}
      >
        {n}
      </div>
      {label ? (
        <div
          style={{
            fontFamily: labelFont === "mono" ? MONO : c.fontStrong,
            fontWeight: 700,
            fontSize: 64 * (labelFont === "mono" ? 1 : c.widthFactor),
            color: hot > 0.5 ? c.accent : c.text,
            whiteSpace: "nowrap",
            opacity: labelOp,
            translate: `${(1 - labelOp) * 20}px 0px`,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

// ── The terminal ───────────────────────────────────────────────────────
export function Terminal({ rect, children, style }: { rect: Rect; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...rectStyle(rect), ...cardStyle(rect.w), ...style }}>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 28px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: "#4a4d55" }} />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Bar w={180} h={16} color="#34373e" />
        </div>
        <Logo id="claude" size={38} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, bottom: 0 }}>{children}</div>
    </div>
  );
}

// A typed command line: "›" + the typed part of `text` + a cursor.
export function CommandLine({
  text,
  frame,
  typedFrom,
  perChar = 1.4,
  color,
  size = 76,
}: {
  text: string;
  frame: number;
  typedFrom: number;
  perChar?: number;
  color?: string;
  size?: number;
}) {
  const c = useBrand();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - typedFrom) / perChar)));
  const blink = Math.floor(frame / 15) % 2 === 0 || n < text.length;
  return (
    <div style={{ display: "flex", alignItems: "center", fontFamily: MONO, fontWeight: 700, fontSize: size, whiteSpace: "nowrap" }}>
      <span style={{ color: c.textSoft, marginRight: 26 }}>›</span>
      <span style={{ color: color ?? c.text }}>{text.slice(0, n)}</span>
      <span
        style={{
          width: size * 0.5,
          height: size * 0.95,
          marginLeft: 6,
          background: color ?? c.text,
          opacity: blink ? 0.85 : 0,
          borderRadius: 4,
        }}
      />
    </div>
  );
}

// ── A file card ────────────────────────────────────────────────────────
// broken: orange edge, bars knocked out of line, a "!" badge;
// clean: grey bars in line, a check badge.
const FILE_BARS = [0.78, 0.55, 0.7, 0.42];
const KNOCK = [34, -16, 26, -10];

export function FileCard({
  rect,
  clean,
  hot = 1,
  locked = 0,
  lockHot = 0,
  badge: showBadge = 1,
  style,
}: {
  rect: Rect;
  clean: number; // 0 broken → 1 clean
  hot?: number; // how orange the broken state is
  locked?: number; // 0..1 padlock badge
  lockHot?: number;
  badge?: number; // 0..1 how visible the badge is
  style?: CSSProperties;
}) {
  const c = useBrand();
  const broken = 1 - clean;
  const glow = broken * hot;
  const inner = rect.w - 60;
  const badge = Math.round(Math.min(rect.w, 300) * 0.3);
  return (
    <div
      style={{
        ...rectStyle(rect),
        ...cardStyle(rect.w),
        border: glow > 0.02 ? `3px solid rgba(255,112,36,${glow})` : "1px solid rgba(255,255,255,0.12)",
        background: `linear-gradient(rgba(255,112,36,${glow * 0.1}), rgba(255,112,36,${glow * 0.1})), ${CARD_BG}`,
        overflow: "visible",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: rect.w * 0.038,
          padding: `${rect.h * 0.14}px 30px`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: rect.h * 0.1,
        }}
      >
        {FILE_BARS.map((f, i) => (
          <Bar
            key={i}
            w={inner * f}
            h={Math.max(14, rect.h * 0.065)}
            color={glow > 0.4 ? `rgba(255,112,36,${0.35 + glow * 0.4})` : GREY}
            style={{ translate: `${KNOCK[i] * broken}px 0px`, rotate: `${(i % 2 ? -4 : 5) * broken}deg` }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          right: -badge * 0.28,
          bottom: -badge * 0.28,
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          background: locked > 0.01 ? (lockHot > 0.5 ? c.accent : LIGHT) : broken > 0.5 ? c.accent : LIGHT,
          opacity: (locked > 0.01 ? locked : glow > 0.5 || clean > 0.5 ? 1 : 0.5) * showBadge,
          scale: `${locked > 0.01 ? interpolate(locked, [0, 1], [0.5, 1]) : interpolate(showBadge, [0, 1], [0.5, 1])}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
        }}
      >
        {locked > 0.01 ? (
          <Padlock size={badge * 0.56} color={c.bg} />
        ) : broken > 0.5 ? (
          <span style={{ fontFamily: c.fontStrong, fontSize: badge * 0.62, color: c.bg, paddingTop: 6 }}>!</span>
        ) : (
          <Check size={badge * 0.5} color={c.bg} />
        )}
      </div>
    </div>
  );
}

export function Check({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Padlock({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" />
      <rect x={4.5} y={10.5} width={15} height={11} rx={2.5} fill={color} />
    </svg>
  );
}

// The three files of the hook and of /rewind – a row in the given band.
export function fileRects(y: number, h: number, w = 260): Rect[] {
  const gap = (900 - 3 * w) / 2;
  return [0, 1, 2].map((i) => ({ x: 90 + i * (w + gap), y, w, h }));
}

// The hook's layout (scene 1) – scene 2 starts from it.
export const HOOK_FILES_Y = 330;
export const HOOK_FILES_H = 340;
export const HOOK_TERM: Rect = { x: 90, y: 780, w: 900, h: 260 };
// The big Claude Code window of the bridge (scene 2).
export const S2_TERM: Rect = { x: 90, y: 420, w: 900, h: 620 };
// /rewind (scene 3): the terminal under the slot row, the files below it.
export const S3_TERM: Rect = { x: 90, y: 400, w: 900, h: 340 };
export const S3_FILES_Y = 800;
export const S3_FILES_H = 250;

// The U-turn "undo" arrow over the hook's files: from the right file round
// to the left one. `t` 0..1 – how much of it is drawn.
export function UTurnArrow({ t, color, opacity = 1 }: { t: number; color: string; opacity?: number }) {
  const path = "M 860 316 C 860 160, 220 160, 220 300";
  const head = t > 0.96 ? 1 : 0;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity, overflow: "visible" }}>
      <path
        d={path}
        pathLength={1}
        fill="none"
        stroke={color}
        strokeWidth={22}
        strokeLinecap="round"
        strokeDasharray="1 1"
        strokeDashoffset={1 - t}
        style={{ filter: `drop-shadow(0 0 18px ${color}66)` }}
      />
      <path
        d="M 186 268 L 220 322 L 254 268"
        fill="none"
        stroke={color}
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={head}
      />
    </svg>
  );
}

// A keycap.
export function Key({ label, w, h, press, hot, style }: { label: string; w: number; h: number; press: number; hot: number; style?: CSSProperties }) {
  const c = useBrand();
  const depth = 18 * (1 - press) + 4;
  return (
    <div style={{ position: "relative", width: w, height: h + 22, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, borderRadius: 30, background: hot > 0.5 ? "#9a4519" : "#15161a" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 22 - depth + 4,
          height: h,
          borderRadius: 30,
          background: hot > 0.5 ? c.accent : "#2a2c32",
          border: "1px solid rgba(255,255,255,0.14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: c.fontStrong,
          fontSize: 76 * c.widthFactor,
          color: hot > 0.5 ? c.bg : c.text,
          paddingTop: 6,
          boxSizing: "border-box",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── The chat history (scene 4) ─────────────────────────────────────────
// Message rows as grey bars, alternating "you" (right) and "Claude" (left).
const MSG = [0.62, 0.8, 0.45, 0.72, 0.55, 0.85, 0.4, 0.68, 0.76, 0.5, 0.64, 0.82];
export const MSG_ROW = 74;

export function ChatRows({ width, offset, count = 36 }: { width: number; offset: number; count?: number }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: -offset }}>
      {Array.from({ length: count }).map((_, i) => {
        const mine = i % 3 === 1;
        const f = MSG[i % MSG.length];
        return (
          <div
            key={i}
            style={{ height: MSG_ROW, display: "flex", alignItems: "center", justifyContent: mine ? "flex-end" : "flex-start" }}
          >
            <Bar w={width * f * (mine ? 0.7 : 1)} h={30} color={mine ? "#4a4d55" : GREY} />
          </div>
        );
      })}
    </div>
  );
}
