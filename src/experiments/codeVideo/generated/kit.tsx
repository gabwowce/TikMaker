import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneWord } from "../types";

// Shared motion + parts for the generated scenes, so all nine read as one style.

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const POP = Easing.bezier(0.34, 1.56, 0.64, 1);
export const EXIT = Easing.bezier(0.7, 0, 0.84, 0);
export const MONO =
  '"JetBrains Mono", "Cascadia Code", Consolas, "Courier New", monospace';
export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// Frame of the i-th spoken word; the brief's frame when the audio has none.
export const wordAt = (words: SceneWord[], i: number, fallback: number) =>
  words[i]?.frame ?? fallback;

// 0 → 1 over [start, start + dur].
export const ramp = (f: number, start: number, dur: number, easing = EASE) =>
  interpolate(f, [start, start + dur], [0, 1], { ...CLAMP, easing });

// Standard entrance: rise 20px, scale 0.94 → 1 (optional 1.02 overshoot).
export function enter(
  f: number,
  start: number,
  opts: { dur?: number; y?: number; overshoot?: boolean } = {},
): CSSProperties {
  const { dur = 12, y = 20, overshoot = false } = opts;
  const p = ramp(f, start, dur);
  const scale = overshoot
    ? interpolate(f, [start, start + dur * 0.6, start + dur], [0.94, 1.02, 1], {
        ...CLAMP,
        easing: EASE,
      })
    : 0.94 + 0.06 * p;
  return {
    opacity: interpolate(p, [0, 0.35], [0, 1], CLAMP),
    transform: `translateY(${(1 - p) * y}px) scale(${scale})`,
  };
}

// Fast accelerating exit: fade + rise 10px over 7 frames.
export function leave(f: number, start: number, dur = 7): CSSProperties {
  const p = ramp(f, start, dur, EXIT);
  return { opacity: 1 - p, transform: `translateY(${-10 * p}px)` };
}

// Small pop for dots/icons.
export const pop = (f: number, start: number, dur = 10) =>
  interpolate(f, [start, start + dur], [0, 1], { ...CLAMP, easing: POP });

// Idle float, ±amp px on a 75-frame sine.
export const float = (f: number, seed = 0, amp = 8) =>
  Math.sin(((f + seed * 23) / 75) * Math.PI * 2) * amp;

export const typed = (text: string, f: number, start: number, perChar = 2) =>
  text.slice(0, Math.max(0, Math.floor((f - start) / perChar)));

export const blink = (f: number) => (Math.floor(f / 14) % 2 === 0 ? 1 : 0);

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

// The scene wrapper: slow camera push-in and a fast exit before the cut.
// `offsetY` moves the whole picture down for scenes whose stage type puts the
// captions at the top of the frame (stage "bottom": captions from y 300).
export function Stage({
  duration,
  offsetY = 0,
  children,
}: {
  duration: number;
  offsetY?: number;
  children: ReactNode;
}) {
  const f = useCurrentFrame();
  const push = interpolate(f, [0, duration], [1, 1.025], CLAMP);
  const out = ramp(f, duration - 7, 7, EXIT);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: `540px ${655 + offsetY}px`,
        transform: `translateY(${offsetY - 10 * out}px) scale(${push})`,
        opacity: 1 - out,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

export function Abs({ style, children }: { style: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: "absolute", ...style }}>{children}</div>;
}

export function useCard() {
  const c = usePack();
  return (width: number): CSSProperties => ({
    width,
    borderRadius: width * 0.038,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
    background: `linear-gradient(180deg, ${c.surfaceHi} 0%, ${c.surface} 100%)`,
    overflow: "hidden",
  });
}

// HUD eyebrow at the top of the picture zone: accent square + tag, index right.
export function Eyebrow({ tag, index, at = 0 }: { tag: string; index?: string; at?: number }) {
  const f = useCurrentFrame();
  const c = usePack();
  const label: CSSProperties = {
    fontFamily: c.fontSemi,
    fontSize: 40,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  };
  return (
    <Abs style={{ left: 90, right: 90, top: 236, display: "flex", justifyContent: "space-between", alignItems: "center", ...enter(f, at, { y: 12 }) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 18, height: 18, background: c.accent, transform: `scale(${pop(f, at + 2)})` }} />
        <div
          style={{
            ...label,
            color: c.text,
            padding: "8px 20px",
            border: "1px solid rgba(255,255,255,0.22)",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 10,
          }}
        >
          {tag}
        </div>
      </div>
      {index ? <div style={{ ...label, color: c.textSoft, opacity: 0.6, fontFamily: MONO }}>{index}</div> : null}
    </Abs>
  );
}

// A hairline tag.
export function Tag({ children, accent, style }: { children: ReactNode; accent?: boolean; style?: CSSProperties }) {
  const c = usePack();
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        fontFamily: c.fontSemi,
        fontSize: 40,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "12px 26px",
        borderRadius: 12,
        color: accent ? c.bg : c.text,
        background: accent ? c.accent : "rgba(255,255,255,0.08)",
        border: accent ? "none" : "1px solid rgba(255,255,255,0.22)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Window chrome: three grey dots and a title, then the body.
export function Window({
  width,
  height,
  title,
  right,
  children,
}: {
  width: number;
  height: number;
  title: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  const c = usePack();
  const card = useCard();
  return (
    <div style={{ ...card(width), height, position: "relative" }}>
      <div
        style={{
          height: 74,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          borderBottom: `1px solid ${c.border}`,
          gap: 12,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.18)" }} />
        ))}
        <div style={{ flex: 1, textAlign: "center", fontFamily: MONO, fontSize: 30, color: c.textSoft, opacity: 0.7 }}>
          {title}
        </div>
        <div style={{ minWidth: 78, display: "flex", justifyContent: "flex-end" }}>{right}</div>
      </div>
      <div style={{ position: "relative", height: height - 74 }}>{children}</div>
    </div>
  );
}

// Corner brackets around a box (HUD bounding box).
export function Corners({ w, h, color, len = 36, p = 1 }: { w: number; h: number; color: string; len?: number; p?: number }) {
  const l = len * p;
  const s = { position: "absolute" as const, borderColor: color, borderStyle: "solid", width: l, height: l };
  return (
    <>
      <div style={{ ...s, left: 0, top: 0, borderWidth: "4px 0 0 4px" }} />
      <div style={{ ...s, left: w - l, top: 0, borderWidth: "4px 4px 0 0" }} />
      <div style={{ ...s, left: 0, top: h - l, borderWidth: "0 0 4px 4px" }} />
      <div style={{ ...s, left: w - l, top: h - l, borderWidth: "0 4px 4px 0" }} />
    </>
  );
}

// The fuel gauge shared by the opening and the closing scene (same place,
// same size), level 0 = empty (left), 1 = full (right).
export const GAUGE = { left: 160, top: 300, width: 760 };
export function Gauge({ level, warn }: { level: number; warn: number }) {
  const c = usePack();
  const W = GAUGE.width;
  const cx = W / 2;
  const cy = 360;
  const r = 320;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const len = Math.PI * r;
  const angle = Math.PI * (1 - level);
  const nl = r - 70;
  return (
    <svg width={W} height={cy + 70} style={{ overflow: "visible" }}>
      <path d={arc} stroke="rgba(255,255,255,0.09)" strokeWidth={30} fill="none" strokeLinecap="round" />
      <path
        d={arc}
        stroke={c.accent}
        strokeWidth={30}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - Math.max(0.001, level))}
      />
      {Array.from({ length: 11 }).map((_, i) => {
        const a = Math.PI * (1 - i / 10);
        const major = i % 5 === 0;
        const r1 = r - 44;
        const r2 = r - (major ? 84 : 66);
        return (
          <line
            key={i}
            x1={cx + r1 * Math.cos(a)}
            y1={cy - r1 * Math.sin(a)}
            x2={cx + r2 * Math.cos(a)}
            y2={cy - r2 * Math.sin(a)}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth={major ? 6 : 3}
          />
        );
      })}
      <line
        x1={cx}
        y1={cy}
        x2={cx + nl * Math.cos(angle)}
        y2={cy - nl * Math.sin(angle)}
        stroke={c.text}
        strokeWidth={10}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={26} fill={c.surfaceHi} stroke={c.accent} strokeWidth={6} />
      <text x={cx - r} y={cy + 66} textAnchor="middle" fontFamily={c.fontStrong} fontSize={52} fill={c.accent} opacity={0.45 + 0.55 * warn}>
        E
      </text>
      <text x={cx + r} y={cy + 66} textAnchor="middle" fontFamily={c.fontStrong} fontSize={52} fill={c.text}>
        F
      </text>
    </svg>
  );
}
