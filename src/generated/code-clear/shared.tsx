import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { Logo, MONO, useBrand } from "../../video/brand/kit";

// Shared pieces of "3 Claude Code commands": the row of three command slots
// (it carries through scenes 2–6), the terminal window, the file cards that
// break and come back clean, keycaps and small icons.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const GREY = "#3a3d44";
export const CARD_BG = "#1c1e23";

// 0 → 1 over `len` frames from `at`.
export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });
}

// A card entrance with a 1.02 overshoot.
export function popScale(frame: number, at: number, from = 0.94) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], { ...clamp, easing: EASE_OUT });
}

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

// ── The three command slots ────────────────────────────────────────────
// The slots sit in a row at the top of the picture zone; the active one is
// wide and shows its command, the others are narrow and show their number.
export const ROW_Y = 215;
export const SLOT_H = 132;

// The slot rects for: -1 = three equal empty slots, 0/1/2 = that one wide.
export function rowRects(active: number): Rect[] {
  const gap = 15;
  const widths =
    active < 0 ? [290, 290, 290] : [0, 1, 2].map((i) => (i === active ? 560 : 155));
  let x = 90;
  return widths.map((w) => {
    const r = { x, y: ROW_Y, w, h: SLOT_H };
    x += w + gap;
    return r;
  });
}

// The slots as a column on the left (the CTA).
export function columnRects(): Rect[] {
  return [0, 1, 2].map((i) => ({ x: 90, y: 330 + i * 190, w: 330, h: 160 }));
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
        background: CARD_BG,
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

export function Slots({ looks }: { looks: SlotLook[] }) {
  return (
    <>
      {looks.map((l, i) => (
        <Slot key={i} n={i + 1} look={l} />
      ))}
    </>
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
  perChar = 1.6,
  color,
  size = 68,
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
  style,
}: {
  rect: Rect;
  clean: number; // 0 broken → 1 clean
  hot?: number; // how orange the broken state is
  locked?: number; // 0..1 padlock badge
  lockHot?: number;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const broken = 1 - clean;
  const glow = broken * hot;
  const inner = rect.w - 60;
  const badge = Math.round(rect.w * 0.3);
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
          padding: `${rect.h * 0.13}px 30px`,
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
            h={Math.max(14, rect.h * 0.06)}
            color={glow > 0.4 ? `rgba(255,112,36,${0.35 + glow * 0.4})` : GREY}
            style={{ translate: `${KNOCK[i] * broken}px 0px`, rotate: `${(i % 2 ? -4 : 5) * broken}deg` }}
          />
        ))}
      </div>
      {/* badge: ! when broken, ✓ when clean */}
      <div
        style={{
          position: "absolute",
          right: -badge * 0.28,
          bottom: -badge * 0.28,
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          background: locked > 0.01 ? (lockHot > 0.5 ? c.accent : "#e6e6e8") : broken > 0.5 ? c.accent : "#e6e6e8",
          opacity: locked > 0.01 ? locked : glow > 0.5 || clean > 0.5 ? 1 : 0.5,
          scale: `${locked > 0.01 ? interpolate(locked, [0, 1], [0.5, 1]) : 1}`,
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
export function fileRects(y: number, h: number): Rect[] {
  const w = 260;
  const gap = (900 - 3 * w) / 2;
  return [0, 1, 2].map((i) => ({ x: 90 + i * (w + gap), y, w, h }));
}

// The hook's layout (scene 1) – scene 2 starts from it.
export const FILES_Y = 360;
export const FILES_H = 320;
export const HOOK_TERM: Rect = { x: 90, y: 770, w: 900, h: 260 };
// The big Claude Code window of the bridge (scene 2).
export const S2_TERM: Rect = { x: 90, y: 420, w: 900, h: 620 };
// The terminal of the item scenes (3–5) sits under the slot row.
export const ITEM_TERM: Rect = { x: 90, y: 420, w: 900, h: 330 };

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
