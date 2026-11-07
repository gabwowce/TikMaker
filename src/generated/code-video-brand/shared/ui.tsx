import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { Logo, MONO, useBrand } from "../../../video/brand/kit";
import { BOUNCE, EASE, EXIT, lerp, ramp } from "./anim";

export const INK = "#0F0F12"; // dark text on the accent
export const CARD_BORDER = "1px solid rgba(255,255,255,0.12)";
export const CARD_SHADOW =
  "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)";
export const TERM_BG = "#141418";

// ── Headline ──────────────────────────────────────────────────────────────
// Words rise in one after another; the key word sits in an accent box.
export type Part = { t: string; key?: boolean };

export function Headline({
  parts,
  inAt,
  outAt,
  top = 290,
  size = 96,
}: {
  parts: Part[];
  inAt: number;
  outAt: number;
  top?: number;
  size?: number;
}) {
  const f = useCurrentFrame();
  const c = useBrand();
  if (f < inAt - 1 || f > outAt + 8) return null;
  const out = ramp(f, outAt, outAt + 7, EXIT);
  const words = parts.flatMap((p) =>
    p.key ? [p] : p.t.split(" ").map((t) => ({ t, key: false })),
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        columnGap: size * 0.26,
        rowGap: size * 0.12,
        opacity: 1 - out,
        translate: `0px ${-40 * out}px`,
      }}
    >
      {words.map((wd, i) => {
        const p = ramp(f, inAt + i * 3, inAt + i * 3 + 11);
        return (
          <span
            key={i}
            style={{
              fontFamily: c.fontStrong,
              fontSize: size,
              lineHeight: 1.04,
              letterSpacing: -1,
              color: wd.key ? INK : c.text,
              background: wd.key ? c.accent : "transparent",
              padding: wd.key ? `0 ${size * 0.16}px` : 0,
              borderRadius: wd.key ? size * 0.14 : 0,
              rotate: wd.key ? "-2deg" : "0deg",
              opacity: p,
              translate: `0px ${(1 - p) * 46}px`,
              scale: wd.key ? `${0.85 + 0.15 * ramp(f, inAt + i * 3, inAt + i * 3 + 12, BOUNCE)}` : "1",
              display: "inline-block",
              boxShadow: wd.key ? "0 12px 30px rgba(0,0,0,0.45)" : "none",
            }}
          >
            {wd.t}
          </span>
        );
      })}
    </div>
  );
}

// ── Pattern label ("MISTAKE 01" / "FIX 01") – always the same place ─────────
export function Pill({ text, inAt, outAt, solid }: { text: string; inAt: number; outAt: number; solid?: boolean }) {
  const f = useCurrentFrame();
  const c = useBrand();
  if (f < inAt - 1 || f > outAt + 8) return null;
  const p = ramp(f, inAt, inAt + 10, BOUNCE);
  const out = ramp(f, outAt, outAt + 6, EXIT);
  return (
    <div style={{ position: "absolute", top: 206, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: c.fontSemi,
          fontSize: 34,
          letterSpacing: 4,
          padding: "10px 26px",
          borderRadius: 999,
          color: solid ? INK : c.accent,
          background: solid ? c.accent : "rgba(255,112,36,0.10)",
          border: `2px solid ${c.accent}`,
          scale: `${0.6 + 0.4 * p}`,
          opacity: Math.min(p * 2, 1) * (1 - out),
        }}
      >
        {text}
      </div>
    </div>
  );
}

// ── Sticker: a tilted punch that slams in on its word ──────────────────────
export function Sticker({
  text,
  at,
  outAt,
  x,
  y,
  rotate = -8,
  size = 76,
}: {
  text: string;
  at: number;
  outAt: number;
  x: number;
  y: number;
  rotate?: number;
  size?: number;
}) {
  const f = useCurrentFrame();
  const c = useBrand();
  const start = at - 3;
  if (f < start || f > outAt + 7) return null;
  const p = ramp(f, start, start + 10, BOUNCE);
  const out = ramp(f, outAt, outAt + 6, EXIT);
  const wobble = Math.sin((f - start) / 9) * 1.5;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: "-50% -50%",
        rotate: `${rotate + (1 - p) * -14 + wobble}deg`,
        scale: `${(0.2 + 0.8 * p) * (1 - out * 0.5)}`,
        opacity: Math.min(1, p * 3) * (1 - out),
        fontFamily: c.fontStrong,
        fontSize: size,
        lineHeight: 1,
        color: INK,
        background: c.accent,
        padding: `${size * 0.2}px ${size * 0.34}px`,
        borderRadius: size * 0.2,
        border: "6px solid #F4F4F6",
        boxShadow: "0 10px 24px rgba(0,0,0,0.45), 0 30px 60px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
        zIndex: 20,
      }}
    >
      {text}
    </div>
  );
}

// ── Window title bar (terminal / editor) ───────────────────────────────────
export function TitleBar({ title, right, logo = true }: { title: string; right?: ReactNode; logo?: boolean }) {
  const c = useBrand();
  return (
    <div
      style={{
        height: 64,
        display: "flex",
        alignItems: "center",
        padding: "0 26px",
        gap: 14,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
        flexShrink: 0,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.18)" }} />
      ))}
      <div style={{ width: 10 }} />
      {logo ? <Logo id="claude" size={30} /> : null}
      <div style={{ fontFamily: c.fontUi, fontSize: 26, color: c.textSoft, flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>
        {title}
      </div>
      {right}
    </div>
  );
}

// A blinking block cursor driven by the frame.
export function Cursor({ color, h = 34 }: { color?: string; h?: number }) {
  const f = useCurrentFrame();
  const c = useBrand();
  const on = Math.floor(f / 8) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: h * 0.5,
        height: h,
        marginLeft: 4,
        verticalAlign: "middle",
        background: color ?? c.accent,
        opacity: on ? 1 : 0.15,
      }}
    />
  );
}

export const mono = (size = 30, color?: string): CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  lineHeight: 1.45,
  color,
  whiteSpace: "pre",
});

// ── Fuel gauge – the bookend (empty at the start, full at the end) ──────────
export function Gauge({ value, size = 280, warn }: { value: number; size?: number; warn?: boolean }) {
  const f = useCurrentFrame();
  const c = useBrand();
  const r = 100;
  const angle = -90 + 180 * value; // -90 = E, +90 = F
  const arcLen = Math.PI * r;
  const blink = warn ? 0.45 + 0.55 * Math.abs(Math.sin(f / 5)) : 1;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: "radial-gradient(circle at 50% 40%, #26262E, #16161B 70%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: `${CARD_SHADOW}, 0 0 ${warn ? 70 : 40}px rgba(255,112,36,${warn ? 0.35 * blink : 0.18})`,
        position: "relative",
      }}
    >
      <svg viewBox="-130 -130 260 260" width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={18} strokeLinecap="round" />
        <path
          d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
          fill="none"
          stroke={c.accent}
          strokeOpacity={blink}
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray={`${arcLen * Math.max(0.001, value)} ${arcLen}`}
        />
        {Array.from({ length: 9 }).map((_, i) => {
          const a = ((-180 + i * 22.5) * Math.PI) / 180;
          return (
            <line key={i} x1={Math.cos(a) * 72} y1={Math.sin(a) * 72} x2={Math.cos(a) * 82} y2={Math.sin(a) * 82} stroke="rgba(255,255,255,0.35)" strokeWidth={i % 4 === 0 ? 5 : 3} />
          );
        })}
        <g transform={`rotate(${angle})`}>
          <line x1={0} y1={14} x2={0} y2={-80} stroke="#F4F4F6" strokeWidth={7} strokeLinecap="round" />
        </g>
        <circle r={14} fill="#F4F4F6" />
        <circle r={6} fill={c.accent} />
      </svg>
      <div style={{ position: "absolute", left: size * 0.12, top: size * 0.55, fontFamily: c.fontStrong, fontSize: size * 0.11, color: value < 0.2 ? c.accent : c.textSoft }}>E</div>
      <div style={{ position: "absolute", right: size * 0.12, top: size * 0.55, fontFamily: c.fontStrong, fontSize: size * 0.11, color: value > 0.8 ? c.accent : c.textSoft }}>F</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: size * 0.68, textAlign: "center", fontFamily: c.fontSemi, fontSize: size * 0.075, letterSpacing: 3, color: c.textSoft }}>
        TOKENS
      </div>
    </div>
  );
}

// Fades a state's content in after the cut and out before the next one.
export function useStateFade(inAt: number, outAt: number) {
  const f = useCurrentFrame();
  return ramp(f, inAt + 2, inAt + 12) * (1 - ramp(f, outAt - 6, outAt, EXIT));
}

export function counter(f: number, a: number, b: number, from: number, to: number) {
  return Math.round(lerp(f, a, b, from, to));
}
export const fmt = (n: number) => n.toLocaleString("en-US");
export { EASE };
