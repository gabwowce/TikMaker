import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { FreeScene } from "../FreeVideo";

// Palette and type for this one video. Nothing here is shared with the app.
export const C = {
  bg: "#09090D",
  panel: "#13131A",
  panel2: "#1A1A23",
  line: "#2B2B38",
  text: "#F5F2EB",
  dim: "#8C8C9C",
  faint: "#55556A",
  burn: "#FF5A36",
  amber: "#FFB224",
  good: "#3BE08F",
  claude: "#E0835E",
  yellow: "#FFE14D",
  blue: "#7AB8FF",
};
export const SANS = '"Segoe UI", "Segoe UI Variable Display", Arial, sans-serif';
export const MONO = '"Cascadia Mono", "Cascadia Code", Consolas, monospace';

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// 0→1 between two local frames with the house ease-out.
export const prog = (f: number, a: number, b: number, easing = easeOut) =>
  interpolate(f, [a, b], [0, 1], { ...CL, easing });

// A springy 0→1 (with overshoot) that starts at `at`.
export function usePop(at: number, damping = 11) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 170, mass: 0.7 } });
}

// Local frame of the scene's i-th spoken word (fallback when the voice has none).
export const wordAt = (s: FreeScene, i: number, fallback: number) =>
  s.words[i] ? s.words[i].frame - s.from : fallback;

// Text revealed character by character from `start` at `cps` chars per frame.
export const typed = (text: string, f: number, start: number, perFrame = 1.2) =>
  text.slice(0, Math.max(0, Math.floor((f - start) * perFrame)));

export function Cursor({ color = C.text, h = 34 }: { color?: string; h?: number }) {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        display: "inline-block",
        width: h * 0.5,
        height: h,
        marginLeft: 4,
        verticalAlign: "middle",
        background: color,
        opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0.15,
      }}
    />
  );
}

// Section label at the top: "MISTAKE 01", "FIX 01" …
export function Chip({ label, tone, at = 0 }: { label: string; tone: "burn" | "good"; at?: number }) {
  const p = usePop(at);
  const color = tone === "burn" ? C.burn : C.good;
  return (
    <div
      style={{
        position: "absolute",
        top: 210,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          scale: String(interpolate(p, [0, 1], [0.4, 1])),
          opacity: Math.min(1, p * 2),
          padding: "14px 30px",
          borderRadius: 999,
          border: `3px solid ${color}`,
          background: `${color}22`,
          color,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 34,
          letterSpacing: 6,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// Big headline under the chip, words rising in one after another.
export function Headline({
  text,
  at = 0,
  top = 310,
  size = 104,
  accent,
}: {
  text: string;
  at?: number;
  top?: number;
  size?: number;
  accent?: string; // a word drawn in the accent colour
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 70,
        right: 70,
        textAlign: "center",
        fontFamily: SANS,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -2,
        color: C.text,
      }}
    >
      {words.map((w, i) => {
        const p = prog(frame, at + i * 4, at + i * 4 + 14);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: size * 0.24,
              opacity: p,
              translate: `0px ${(1 - p) * 50}px`,
              color: accent === w ? C.burn : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

// A dark terminal window. Children render inside the body.
export function Window({
  title,
  style,
  children,
  right,
  glow,
}: {
  title: string;
  style?: CSSProperties;
  children?: ReactNode;
  right?: ReactNode;
  glow?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        background: C.panel,
        borderRadius: 28,
        border: `2px solid ${glow ?? C.line}`,
        boxShadow: `0 40px 90px rgba(0,0,0,0.6)${glow ? `, 0 0 60px ${glow}55` : ""}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "0 26px",
          background: C.panel2,
          borderBottom: `2px solid ${C.line}`,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
        ))}
        <div style={{ marginLeft: 14, fontFamily: MONO, fontSize: 24, color: C.dim, flex: 1 }}>{title}</div>
        {right}
      </div>
      <div style={{ position: "relative", flex: 1, fontFamily: MONO, fontSize: 28, color: C.text }}>
        {children}
      </div>
    </div>
  );
}

// The Claude Code input box: rounded outline with a ">" prompt.
export function PromptBox({ children, active = true }: { children?: ReactNode; active?: boolean }) {
  return (
    <div
      style={{
        border: `2px solid ${active ? C.dim : C.line}`,
        borderRadius: 14,
        padding: "18px 22px",
        fontFamily: MONO,
        fontSize: 30,
        color: C.text,
        display: "flex",
        alignItems: "center",
        minHeight: 40,
      }}
    >
      <span style={{ color: C.dim, marginRight: 16 }}>&gt;</span>
      <span>{children}</span>
    </div>
  );
}

// A fuel gauge. `value` 0 (empty) … 1 (full).
export function Gauge({ value, size = 520, label = "TOKENS" }: { value: number; size?: number; label?: string }) {
  const frame = useCurrentFrame();
  const r = size * 0.42;
  const cx = size / 2;
  const cy = size * 0.55;
  const angle = interpolate(value, [0, 1], [-160, -20]); // degrees, 0 = right
  const rad = (angle * Math.PI) / 180;
  const arc = (a0: number, a1: number) => {
    const p0 = [cx + r * Math.cos((a0 * Math.PI) / 180), cy + r * Math.sin((a0 * Math.PI) / 180)];
    const p1 = [cx + r * Math.cos((a1 * Math.PI) / 180), cy + r * Math.sin((a1 * Math.PI) / 180)];
    return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`;
  };
  const needleColor = interpolate(value, [0, 0.35, 1], [0, 0.5, 1]);
  const col = needleColor < 0.5 ? C.burn : needleColor < 0.8 ? C.amber : C.good;
  const low = value < 0.18;
  return (
    <svg width={size} height={size * 0.72} viewBox={`0 0 ${size} ${size * 0.72}`}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={C.burn} />
          <stop offset="0.5" stopColor={C.amber} />
          <stop offset="1" stopColor={C.good} />
        </linearGradient>
      </defs>
      <path d={arc(-160, -20)} stroke="#22222D" strokeWidth={size * 0.075} fill="none" strokeLinecap="round" />
      <path d={arc(-160, -20)} stroke="url(#gaugeGrad)" strokeWidth={size * 0.05} fill="none" strokeLinecap="round" opacity={0.9} />
      {Array.from({ length: 9 }).map((_, i) => {
        const a = ((-160 + i * 17.5) * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={cx + (r - size * 0.07) * Math.cos(a)}
            y1={cy + (r - size * 0.07) * Math.sin(a)}
            x2={cx + (r - size * 0.1) * Math.cos(a)}
            y2={cy + (r - size * 0.1) * Math.sin(a)}
            stroke={C.faint}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}
      <text x={cx - r * 0.98} y={cy + size * 0.12} fill={C.burn} fontFamily={SANS} fontWeight={900} fontSize={size * 0.09} textAnchor="middle">
        E
      </text>
      <text x={cx + r * 0.98} y={cy + size * 0.12} fill={C.good} fontFamily={SANS} fontWeight={900} fontSize={size * 0.09} textAnchor="middle">
        F
      </text>
      <line
        x1={cx}
        y1={cy}
        x2={cx + (r - size * 0.12) * Math.cos(rad)}
        y2={cy + (r - size * 0.12) * Math.sin(rad)}
        stroke={col}
        strokeWidth={size * 0.028}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={size * 0.045} fill={col} />
      <circle cx={cx} cy={cy} r={size * 0.018} fill={C.bg} />
      <text
        x={cx}
        y={cy + size * 0.13}
        fill={low ? C.burn : C.dim}
        opacity={low ? (Math.floor(frame / 5) % 2 ? 1 : 0.35) : 1}
        fontFamily={MONO}
        fontWeight={700}
        fontSize={size * 0.055}
        letterSpacing={6}
        textAnchor="middle"
      >
        {low ? "LOW FUEL" : label}
      </text>
    </svg>
  );
}

// Rotated sticker that slams onto the frame.
export function Stamp({
  at,
  children,
  color,
  style,
  rotate = -7,
}: {
  at: number;
  children: ReactNode;
  color: string;
  style?: CSSProperties;
  rotate?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  if (frame < at) return null;
  return (
    <div
      style={{
        position: "absolute",
        scale: String(interpolate(p, [0, 1], [2.4, 1])),
        opacity: Math.min(1, p * 3),
        rotate: `${rotate}deg`,
        background: color,
        color: C.bg,
        fontFamily: SANS,
        fontWeight: 900,
        borderRadius: 18,
        padding: "16px 30px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
        letterSpacing: -1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
