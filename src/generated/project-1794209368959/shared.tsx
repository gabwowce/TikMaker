import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { useBrand } from "../../video/brand/kit";

// Shared pieces of "3 Claude Code skills": the one sample clip (an app window
// drawn with grey bars – the "plain screen recording") that every style
// preview works on, the numbered style pill, and small helpers.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const GREY = "#3a3d44";
export const CARD_BG = "#1c1e23";
export const LIGHT = "#e6e6e8";
export const BOARD = "#f3f4f6";
export const INK = "#2b2d33";

export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });
}
export function popScale(frame: number, at: number, from = 0.94) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], { ...clamp, easing: EASE_OUT });
}
export function bounceIn(frame: number, at: number, len = 10) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: EASE_BOUNCE });
}
export const pulse = (frame: number, period = 36) => (Math.sin((frame / period) * Math.PI * 2) + 1) / 2;

// mix two #rrggbb colours
const parseColor = (s: string) =>
  s.startsWith("rgb") ? (s.match(/\d+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number) : [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));

export function mixHex(a: string, b: string, t: number) {
  const pa = parseColor(a);
  const pb = parseColor(b);
  const k = Math.max(0, Math.min(1, t));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(",")})`;
}

export const cardShadow = "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)";

export function Bar({ w, h = 22, color = GREY, style }: { w: number | string; h?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: h / 2, background: color, flexShrink: 0, ...style }} />;
}

// ── The clip ───────────────────────────────────────────────────────────
// Drawn at 740 × 470 (local coordinates below), placed by its centre.
export const CLIP_W = 740;
export const CLIP_H = 470;
export const CLIP_CX = 515;
export const CLIP_CY = 675;
// The clip's one button (local coordinates) – zooms, circles and cursors aim here.
export const BTN = { x: 540, y: 392, w: 160, h: 50 };
export const BTN_C = { x: BTN.x + BTN.w / 2, y: BTN.y + BTN.h / 2 };
// The camera zooms about this point, so at 1.9× the button lands near the
// screen's centre (≈ 470, 330) instead of running off its edge.
export const ZOOM_O = { x: 787, y: 513 };
export const zoomed = (p: { x: number; y: number }, z: number) => ({
  x: ZOOM_O.x + z * (p.x - ZOOM_O.x),
  y: ZOOM_O.y + z * (p.y - ZOOM_O.y),
});
// The picture block inside the clip.
export const MEDIA = { x: 200, y: 82, w: 500, h: 180 };

export type ClipLook = {
  hot?: number; // 0 plain grey → 1 motion design (colour, moving shapes)
  light?: number; // 0 dark → 1 whiteboard white
  btnHot?: number; // the button in orange
  press?: number; // the button pressed
  zoom?: number; // the inner "camera" zoom onto the button (1 = none)
};

export function ClipContent({ frame, look }: { frame: number; look: ClipLook }) {
  const c = useBrand();
  const { hot = 0, light = 0, btnHot = 0, press = 0, zoom = 1 } = look;
  const bar = mixHex(GREY, "#c9ccd3", light);
  const barSoft = mixHex("#2e3036", "#dde0e5", light);
  const mediaBg = mixHex("#26282e", "#e4e6ea", light);
  const stagger = (i: number) => interpolate(hot, [i * 0.12, i * 0.12 + 0.6], [0, 1], clamp);
  const t = frame / 30;
  const playhead = (frame % 150) / 150;
  return (
    <div style={{ position: "absolute", inset: 0, scale: `${zoom}`, transformOrigin: `${ZOOM_O.x}px ${ZOOM_O.y}px` }}>
      {/* title bar */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 52, display: "flex", alignItems: "center", gap: 12, padding: "0 22px", borderBottom: `1px solid ${light > 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)"}` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: mixHex("#4a4d55", "#c3c6cc", light) }} />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <Bar w={160} h={14} color={barSoft} />
        </div>
      </div>
      {/* sidebar */}
      <div style={{ position: "absolute", left: 24, top: 82, display: "flex", flexDirection: "column", gap: 26 }}>
        {[0.9, 0.7, 0.8, 0.6].map((f, i) => (
          <Bar key={i} w={140 * f} h={18} color={i === 0 && hot > 0.5 ? mixHex(GREY, c.accent, hot * 0.7) : barSoft}
            style={{ translate: `${(1 - stagger(i)) * -14 * hot}px 0px` }} />
        ))}
      </div>
      {/* picture block */}
      <div style={{ position: "absolute", left: MEDIA.x, top: MEDIA.y, width: MEDIA.w, height: MEDIA.h, borderRadius: 16, background: mediaBg, overflow: "hidden" }}>
        {/* plain: a flat mountain-ish picture */}
        <div style={{ position: "absolute", left: 40, bottom: 0, width: 0, height: 0, borderLeft: "90px solid transparent", borderRight: "90px solid transparent", borderBottom: `100px solid ${mixHex("#34373e", "#cfd2d8", light)}`, opacity: 1 - hot }} />
        <div style={{ position: "absolute", left: 150, bottom: 0, width: 0, height: 0, borderLeft: "70px solid transparent", borderRight: "70px solid transparent", borderBottom: `70px solid ${mixHex("#2f3238", "#d6d9de", light)}`, opacity: 1 - hot }} />
        {/* motion: shapes that move */}
        <div style={{ position: "absolute", left: 70 + Math.sin(t * 2.2) * 26, top: 36 + Math.cos(t * 2.2) * 14, width: 108, height: 108, borderRadius: 54, background: c.accent, opacity: hot, scale: `${0.4 + hot * 0.6}`, boxShadow: `0 0 50px ${c.accent}88` }} />
        <div style={{ position: "absolute", left: 250, top: 46, width: 88, height: 88, borderRadius: 20, background: LIGHT, opacity: hot * 0.9, rotate: `${t * 70}deg`, scale: `${0.4 + hot * 0.6}` }} />
        <div style={{ position: "absolute", left: 380, top: 60 + Math.sin(t * 3) * 22, width: 70, height: 70, borderRadius: 35, border: `10px solid ${c.accent}`, boxSizing: "border-box", opacity: hot * 0.8 }} />
      </div>
      {/* text lines */}
      <div style={{ position: "absolute", left: MEDIA.x, top: 290, display: "flex", flexDirection: "column", gap: 20 }}>
        {[0.86, 0.64, 0.5].map((f, i) => (
          <Bar key={i} w={MEDIA.w * f} h={20} color={bar} style={{ translate: `${(1 - stagger(i + 1)) * 40 * hot}px 0px`, opacity: 1 - (1 - stagger(i + 1)) * hot }} />
        ))}
      </div>
      {/* the button */}
      <div style={{ position: "absolute", left: BTN.x, top: BTN.y, width: BTN.w, height: BTN.h, borderRadius: 25, background: mixHex(mixHex("#3f4249", "#c3c6cc", light), "#ff7024", Math.max(btnHot, hot)), scale: `${1 - press * 0.08}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Bar w={80} h={14} color={Math.max(btnHot, hot) > 0.5 ? "rgba(255,255,255,0.85)" : mixHex("#5a5d65", "#9a9ea6", light)} />
      </div>
      {/* the recording's progress strip */}
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 14, height: 6, borderRadius: 3, background: barSoft }}>
        <div style={{ width: `${playhead * 100}%`, height: "100%", borderRadius: 3, background: hot > 0.5 ? c.accent : mixHex("#5a5d65", "#9a9ea6", light) }} />
      </div>
    </div>
  );
}

// The clip card placed by its centre (cx, cy) at scale s. `children` are
// drawn on top in the clip's local coordinates (sketch strokes, callouts).
export function Clip({
  frame,
  cx = CLIP_CX,
  cy = CLIP_CY,
  s = 1,
  look = {},
  glow = 0,
  style,
  children,
}: {
  frame: number;
  cx?: number;
  cy?: number;
  s?: number;
  look?: ClipLook;
  glow?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const c = useBrand();
  const light = look.light ?? 0;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - CLIP_W / 2,
        top: cy - CLIP_H / 2,
        width: CLIP_W,
        height: CLIP_H,
        scale: `${s}`,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          overflow: "hidden",
          background: mixHex(CARD_BG, BOARD, light),
          border: glow > 0.02 ? `3px solid rgba(255,112,36,${glow})` : "1px solid rgba(255,255,255,0.12)",
          boxShadow: `${cardShadow}${glow > 0.02 ? `, 0 0 ${90 * glow}px ${c.accent}55` : ""}`,
        }}
      >
        <ClipContent frame={frame} look={look} />
      </div>
      {children}
    </div>
  );
}

// ── The numbered style pill (same place in every item scene) ───────────
export const PILL_Y = 268;

export function StylePill({ n, label, labelIn, numIn = 1 }: { n: string; label: string; labelIn: number; numIn?: number }) {
  const c = useBrand();
  return (
    <div style={{ position: "absolute", left: 130, width: 770, top: PILL_Y, height: 110, display: "flex", justifyContent: "center", alignItems: "center", gap: 28 }}>
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          background: c.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: c.fontStrong,
          fontSize: 52 * c.widthFactor,
          color: c.bg,
          scale: `${numIn}`,
          boxShadow: `0 0 40px ${c.accent}55`,
          flexShrink: 0,
          paddingTop: 4,
          boxSizing: "border-box",
        }}
      >
        {n}
      </div>
      <div
        style={{
          fontFamily: c.fontStrong,
          fontSize: 72 * c.widthFactor,
          color: c.text,
          whiteSpace: "nowrap",
          opacity: labelIn,
          translate: `${(1 - labelIn) * 30}px 0px`,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// A gentle drift + slow push-in for the whole picture.
export function Stage({ frame, duration, children }: { frame: number; duration: number; children: ReactNode }) {
  const push = interpolate(frame, [0, duration], [1, 1.025], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, scale: `${push}`, transformOrigin: "515px 665px", translate: `0px ${Math.sin(frame / 40) * 5}px` }}>
      {children}
    </div>
  );
}

// An SVG stroke that draws itself (t 0..1).
export function DrawPath({ d, t, color, width = 10, opacity = 1 }: { d: string; t: number; color: string; width?: number; opacity?: number }) {
  return (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1 1"
      strokeDashoffset={1 - t}
      opacity={t > 0.001 ? opacity : 0}
    />
  );
}

export function Check({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={color} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A mouse cursor.
export function Cursor({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>
      <path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.8L4 20z" fill="#fff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}
