import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { Logo, MONO, useBrand } from "../../video/brand/kit";

// Shared pieces of "How to build an AI employee in 60 seconds": the Claude
// Code terminal, the Google Sheet content calendar, the chat bubble that
// becomes an employee ID badge, the step pill and a few flat icons.

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

export const cardStyle = (w: number): CSSProperties => ({
  background: CARD_BG,
  borderRadius: w * 0.038,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
  boxSizing: "border-box",
});

export const hotGlow = (accent: string, t: number) =>
  t > 0.01 ? `0 0 0 3px ${accent}, 0 0 ${60 * t}px ${accent}66` : "";

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

// The step counter: always the same place, small.
export function StepPill({ n, frame }: { n: number; frame: number }) {
  const c = useBrand();
  const s = popScale(frame, 0, 0.8);
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - 70,
        top: 210,
        width: 140,
        height: 72,
        borderRadius: 36,
        background: c.text,
        color: c.bg,
        fontFamily: c.fontStrong,
        fontSize: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 4,
        boxSizing: "border-box",
        scale: `${s}`,
        opacity: prog(frame, 0, 6),
      }}
    >
      {String(n).padStart(2, "0")}
    </div>
  );
}

// ── Claude Code terminal ───────────────────────────────────────────────
export function Terminal({
  x,
  y,
  w,
  h,
  children,
  hot = 0,
  style,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  children?: ReactNode;
  hot?: number;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const glow = hotGlow(c.accent, hot);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        ...cardStyle(w),
        background: "#141419",
        overflow: "hidden",
        boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${glow ? `, ${glow}` : ""}`,
        ...style,
      }}
    >
      <div
        style={{
          height: 64,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          padding: "0 26px",
          gap: 12,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: GREY_HI }} />
        ))}
        <div style={{ marginLeft: 20, display: "flex", alignItems: "center", gap: 14 }}>
          <Logo id="claude" size={36} />
          <Bar w={150} h={16} color={GREY} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, bottom: 0 }}>{children}</div>
    </div>
  );
}

// A terminal prompt line: ">" and a bar that grows as it is "typed".
export function PromptLine({
  typed,
  width,
  color,
  cursor = true,
  frame,
  style,
}: {
  typed: number;
  width: number;
  color: string;
  cursor?: boolean;
  frame: number;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const blink = Math.floor(frame / 15) % 2 === 0 || (typed > 0 && typed < 1);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18, ...style }}>
      <span style={{ fontFamily: MONO, fontSize: 40, color: c.accent, lineHeight: 1 }}>{">"}</span>
      <Bar w={Math.max(0, width * typed)} h={26} color={color} />
      {cursor ? <div style={{ width: 16, height: 40, background: c.text, opacity: blink ? 0.9 : 0 }} /> : null}
    </div>
  );
}

// ── Google Sheet content calendar ──────────────────────────────────────
export function SheetIcon({ size, hot = 0 }: { size: number; hot?: number }) {
  const c = useBrand();
  const col = hot > 0.5 ? c.accent : LIGHT;
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M22 6h40l22 22v62a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill={col} />
      <path d="M62 6v16a6 6 0 0 0 6 6h16" fill="rgba(0,0,0,0.25)" />
      <rect x="28" y="44" width="44" height="36" rx="3" fill="none" stroke={CARD_BG} strokeWidth="5" />
      <line x1="28" y1="56" x2="72" y2="56" stroke={CARD_BG} strokeWidth="5" />
      <line x1="28" y1="68" x2="72" y2="68" stroke={CARD_BG} strokeWidth="5" />
      <line x1="44" y1="44" x2="44" y2="80" stroke={CARD_BG} strokeWidth="5" />
    </svg>
  );
}

// The calendar: a header row and `rows` rows of date | idea | script.
// `fill(i)` 0..1 types row i in; `hot` is the row in orange.
export function Sheet({
  x,
  y,
  w,
  h,
  rows,
  fill,
  hot = -1,
  style,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rows: number;
  fill: (i: number) => number;
  hot?: number;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const head = 84;
  const colHead = 56;
  const rowH = (h - head - colHead) / rows;
  const dateW = w * 0.18;
  const ideaW = w * 0.34;
  const ideaWidths = [0.8, 0.62, 0.72, 0.55, 0.78, 0.66, 0.7, 0.6];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...cardStyle(w), overflow: "hidden", ...style }}>
      <div style={{ height: head, display: "flex", alignItems: "center", gap: 18, padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <SheetIcon size={48} />
        <Bar w={220} h={20} color={GREY_HI} />
      </div>
      <div style={{ height: colHead, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: dateW, paddingLeft: 28, boxSizing: "border-box" }}>
          <Bar w={dateW * 0.45} h={14} color={GREY} />
        </div>
        <div style={{ width: ideaW, paddingLeft: 24, boxSizing: "border-box", borderLeft: "1px solid rgba(255,255,255,0.08)", height: "100%", display: "flex", alignItems: "center" }}>
          <Bar w={ideaW * 0.3} h={14} color={GREY} />
        </div>
        <div style={{ flex: 1, paddingLeft: 24, borderLeft: "1px solid rgba(255,255,255,0.08)", height: "100%", display: "flex", alignItems: "center" }}>
          <Bar w={(w - dateW - ideaW) * 0.3} h={14} color={GREY} />
        </div>
      </div>
      {Array.from({ length: rows }, (_, i) => {
        const f = fill(i);
        const isHot = i === hot;
        const barCol = isHot ? c.accent : GREY_HI;
        const t1 = interpolate(f, [0, 0.35], [0, 1], clamp);
        const t2 = interpolate(f, [0.2, 0.65], [0, 1], clamp);
        const t3 = interpolate(f, [0.45, 1], [0, 1], clamp);
        const scriptW = w - dateW - ideaW - 48;
        return (
          <div
            key={i}
            style={{
              height: rowH,
              display: "flex",
              alignItems: "center",
              borderBottom: i < rows - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              background: isHot ? `${c.accent}1f` : "transparent",
            }}
          >
            <div style={{ width: dateW, paddingLeft: 28, boxSizing: "border-box" }}>
              <Bar w={dateW * 0.55 * t1} h={18} color={isHot ? c.accent : GREY} />
            </div>
            <div style={{ width: ideaW, paddingLeft: 24, boxSizing: "border-box", borderLeft: "1px solid rgba(255,255,255,0.06)", height: "100%", display: "flex", alignItems: "center" }}>
              <Bar w={(ideaW - 48) * ideaWidths[i % ideaWidths.length] * t2} h={18} color={barCol} />
            </div>
            <div style={{ flex: 1, paddingLeft: 24, borderLeft: "1px solid rgba(255,255,255,0.06)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
              <Bar w={scriptW * 0.9 * t3} h={12} color={isHot ? c.accent : GREY} />
              <Bar w={scriptW * 0.6 * t3} h={12} color={isHot ? c.accent : GREY} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chat bubble ────────────────────────────────────────────────────────
export function ChatBubble({
  x,
  y,
  w,
  h,
  side,
  bars,
  barColor = GREY_HI,
  bg = "#24242c",
  style,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  side: "left" | "right";
  bars: number[];
  barColor?: string;
  bg?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        ...cardStyle(w),
        background: bg,
        borderRadius: 40,
        borderBottomLeftRadius: side === "left" ? 10 : 40,
        borderBottomRightRadius: side === "right" ? 10 : 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 18,
        padding: "0 44px",
        ...style,
      }}
    >
      {bars.map((b, i) => (
        <Bar key={i} w={(w - 88) * b} h={24} color={barColor} />
      ))}
    </div>
  );
}

// ── Employee ID badge ──────────────────────────────────────────────────
export const BADGE = { x: 160, y: 330, w: 760, h: 420 };

export function Badge({
  x = BADGE.x,
  y = BADGE.y,
  w = BADGE.w,
  h = BADGE.h,
  title,
  titleIn = 0,
  hot = 0,
  style,
}: {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  title?: string;
  titleIn?: number;
  hot?: number;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const glow = hotGlow(c.accent, hot);
  const av = h * 0.5;
  const textX = 60 + av + 50;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>
      {/* lanyard clip */}
      <div style={{ position: "absolute", left: w / 2 - 70, top: -54, width: 140, height: 80, borderRadius: 20, background: GREY_HI }} />
      <div style={{ position: "absolute", left: w / 2 - 40, top: -30, width: 80, height: 22, borderRadius: 11, background: CARD_BG }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          ...cardStyle(w),
          background: "#202027",
          overflow: "hidden",
          boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${glow ? `, ${glow}` : ""}`,
        }}
      >
        {/* top stripe */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 56, background: "rgba(255,255,255,0.05)" }} />
        {/* avatar: a robot head */}
        <div
          style={{
            position: "absolute",
            left: 60,
            top: (h - av) / 2 + 20,
            width: av,
            height: av,
            borderRadius: av * 0.24,
            background: "#2c2c34",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RobotIcon size={av * 0.72} color={LIGHT} />
        </div>
        {/* name + title */}
        <div style={{ position: "absolute", left: textX, right: 50, top: 100, bottom: 50, display: "flex", flexDirection: "column", gap: 22 }}>
          <Bar w="70%" h={30} color={GREY_HI} />
          <div style={{ position: "relative", flex: 1, marginTop: 10 }}>
            {/* empty title slot */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                border: `3px dashed ${GREY}`,
                opacity: 1 - titleIn,
              }}
            />
            {title ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: c.fontStrong,
                  fontSize: 64,
                  lineHeight: 1.0,
                  color: c.accent,
                  opacity: titleIn,
                  translate: `0px ${(1 - titleIn) * 16}px`,
                  paddingTop: 6,
                }}
              >
                {title}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Icons (flat, one colour) ───────────────────────────────────────────
type IconP = { size: number; color: string };

export function RobotIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <line x1="50" y1="8" x2="50" y2="22" stroke={color} strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="8" r="6" fill={color} />
      <rect x="14" y="24" width="72" height="58" rx="16" fill={color} />
      <circle cx="36" cy="52" r="8" fill={CARD_BG} />
      <circle cx="64" cy="52" r="8" fill={CARD_BG} />
      <rect x="36" y="68" width="28" height="6" rx="3" fill={CARD_BG} />
    </svg>
  );
}

export function PersonIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <circle cx="50" cy="34" r="18" fill={color} />
      <path d="M16 88c0-20 15-32 34-32s34 12 34 32z" fill={color} />
    </svg>
  );
}

export function ListIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      {[22, 50, 78].map((cy) => (
        <g key={cy}>
          <path d={`M12 ${cy}l6 6 10-12`} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="40" y={cy - 5} width="50" height="10" rx="5" fill={color} />
        </g>
      ))}
    </svg>
  );
}

export function WrenchIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path
        d="M66 10a24 24 0 0 0-22 32L12 74a10 10 0 0 0 14 14l32-32a24 24 0 0 0 32-22l-14 14-14-4-4-14 14-14a24 24 0 0 0-6 0z"
        fill={color}
      />
    </svg>
  );
}

export function GlobeIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="7" />
      <ellipse cx="50" cy="50" rx="17" ry="40" fill="none" stroke={color} strokeWidth="6" />
      <line x1="10" y1="50" x2="90" y2="50" stroke={color} strokeWidth="6" />
      <path d="M17 30h66M17 70h66" stroke={color} strokeWidth="5" />
    </svg>
  );
}

export function SearchIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <circle cx="42" cy="42" r="26" fill="none" stroke={color} strokeWidth="10" />
      <line x1="62" y1="62" x2="86" y2="86" stroke={color} strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

export function TrendIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M10 76l26-26 16 16 32-34" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 28h24v24" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BulbIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <path d="M50 8a30 30 0 0 0-18 54c4 3 6 7 6 12h24c0-5 2-9 6-12A30 30 0 0 0 50 8z" fill={color} />
      <rect x="38" y="80" width="24" height="8" rx="4" fill={color} />
      <rect x="42" y="91" width="16" height="6" rx="3" fill={color} />
    </svg>
  );
}

export function ScriptIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <rect x="18" y="8" width="64" height="84" rx="10" fill={color} />
      {[28, 42, 56, 70].map((yy, i) => (
        <rect key={yy} x="30" y={yy} width={i === 3 ? 24 : 40} height="7" rx="3.5" fill={CARD_BG} />
      ))}
    </svg>
  );
}

export function CalendarIcon({ size, color }: IconP) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <rect x="12" y="18" width="76" height="72" rx="12" fill={color} />
      <rect x="12" y="18" width="76" height="20" rx="10" fill={color} />
      <rect x="28" y="8" width="8" height="20" rx="4" fill={color} />
      <rect x="64" y="8" width="8" height="20" rx="4" fill={color} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((k) => <rect key={`${r}${k}`} x={24 + k * 20} y={46 + r * 14} width="12" height="9" rx="2" fill={CARD_BG} />),
      )}
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

// A round icon chip (grey, or orange when hot).
export function IconChip({
  size,
  hot,
  children,
  style,
}: {
  size: number;
  hot: number;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const c = useBrand();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: hot > 0.5 ? c.accent : "#2a2a32",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.5)${hot > 0.5 ? `, 0 0 50px ${c.accent}66` : ""}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
