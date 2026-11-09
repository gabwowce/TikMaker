import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  DARK_BG,
  LIGHT_BG,
  LIGHT_TEXT,
  MONO,
  RecordingSlot,
  asset,
  useBrand,
} from "../../video/brand/kit";

// The creator's finished 12-second clip (Remotion + three.js, 9:16, 30 fps).
// Moments (clip frames): cracks 34–62, burst 62, city rises gold 64–112,
// day 152–236, dusk 236–276, night (windows on) 276–360.
export const CLIP_SRC = "/assets/custom/bulb-city-3d-claude-code-mw94l22h.mp4";
export const CLIP_SECONDS = 12;

export const clampAll = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);

// ── The clip, full bleed, from a given second of it ─────────────────────────
export function Clip({
  src,
  from,
  rate = 1,
  record,
  style,
}: {
  src: string;
  from: number; // seconds into the clip
  rate?: number;
  record: string;
  style?: CSSProperties;
}) {
  const { fps } = useVideoConfig();
  if (!src)
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <RecordingSlot src="" record={record} width={770} height={700} />
      </AbsoluteFill>
    );
  return (
    <AbsoluteFill style={style}>
      <OffthreadVideo
        src={asset(src)}
        startFrom={Math.round(from * fps)}
        playbackRate={rate}
        muted
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
}

// ── Painted background: navy (or off-white) + one breathing colour glow ────
export function Backdrop({
  color,
  light = false,
  x = 515,
  y = 700,
  fromX,
  fromY,
}: {
  color: string;
  light?: boolean;
  x?: number;
  y?: number;
  fromX?: number;
  fromY?: number;
}) {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 14], [0, 1], { ...clampAll, easing: OUT });
  const gx = interpolate(enter, [0, 1], [fromX ?? x, x]) + Math.sin(frame / 40) * 60;
  const gy = interpolate(enter, [0, 1], [fromY ?? y, y]) + Math.cos(frame / 52) * 40;
  const breathe = 0.45 + Math.sin(frame / 22) * 0.1;
  return (
    <AbsoluteFill style={{ background: light ? LIGHT_BG : DARK_BG }}>
      <div
        style={{
          position: "absolute",
          left: gx - 700,
          top: gy - 700,
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, ${color}00 65%)`,
          opacity: light ? breathe * 0.55 : breathe,
          filter: "blur(30px)",
        }}
      />
    </AbsoluteFill>
  );
}

// ── Glass card look ─────────────────────────────────────────────────────────
export function glass(width: number, light = false): CSSProperties {
  return light
    ? {
        background: "#ffffff",
        borderRadius: width * 0.06,
        boxShadow: "0 4px 12px rgba(20,30,60,0.08), 0 20px 50px rgba(20,30,60,0.14)",
        border: "1.5px solid rgba(20,30,60,0.06)",
      }
    : {
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRadius: width * 0.06,
        border: "1.5px solid rgba(255,255,255,0.14)",
        borderTop: "1.5px solid rgba(255,255,255,0.28)",
        boxShadow: "0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5)",
      };
}

// A card entering from below with its tilt revealing, then floating.
export function cardMotion(frame: number, start: number) {
  const t = frame - start;
  const p = interpolate(t, [0, 16], [0, 1], { ...clampAll, easing: OUT });
  const scale = interpolate(t, [0, 11, 16], [0.8, 1.03, 1], clampAll);
  const y = interpolate(p, [0, 1], [480, 0]);
  const rotX = interpolate(p, [0, 1], [8, 0]) + Math.sin(frame / 30) * 1.2;
  const rotY = interpolate(p, [0, 1], [-12, 0]) + Math.sin(frame / 26) * 2;
  const float = Math.sin(frame / 14) * 8 * p;
  const rotZ = Math.sin(frame / 19) * 0.6 * p;
  return {
    opacity: interpolate(t, [0, 4], [0, 1], clampAll),
    transform: `perspective(1200px) translateY(${y + float}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
  };
}

// A pill / icon popping in with a spring overshoot.
export function usePop(start: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - start, fps, config: { damping: 12, stiffness: 180 } });
  return {
    scale: interpolate(s, [0, 1], [0.5, 1]),
    opacity: interpolate(frame - start, [0, 3], [0, 1], clampAll),
  };
}

// The scene's camera: push in 1.00 → 1.04, with a punch on a key frame.
export function Camera({
  duration,
  punchAt,
  children,
}: {
  duration: number;
  punchAt?: number[];
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  let s = interpolate(frame, [0, duration], [1, 1.04], clampAll);
  for (const p of punchAt ?? [])
    s += interpolate(frame, [p - 1, p + 1, p + 9], [0, 0.03, 0], clampAll);
  return <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>;
}

// ── Headline: words pop in one by one; *word* is the key word ───────────────
export type HeadWord = { text: string; at: number };
export function Headline({
  lines,
  top = 270,
  size = 88,
  light = false,
  color,
  soft = false,
  shadow = false,
}: {
  lines: HeadWord[][];
  top?: number;
  size?: number;
  light?: boolean;
  color: string;
  soft?: boolean;
  shadow?: boolean;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: 130,
        width: 770,
        top,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size * 0.08,
      }}
    >
      {lines.map((line, li) => (
        <div
          key={li}
          style={{ display: "flex", gap: size * 0.26, flexWrap: "nowrap", justifyContent: "center" }}
        >
          {line.map((w, wi) => {
            const key = w.text.startsWith("*");
            const text = w.text.replace(/\*/g, "");
            const t = frame - (w.at - 2);
            const p = interpolate(t, [0, 10], [0, 1], { ...clampAll, easing: OUT });
            const punch = key ? interpolate(t, [8, 11, 18], [0, 0.04, 0], clampAll) : 0;
            const second = soft && li > 0;
            return (
              <span
                key={wi}
                style={{
                  fontFamily: c.fontUi,
                  fontWeight: 800,
                  fontSize: size * (second ? 0.82 : 1),
                  lineHeight: 1.08,
                  letterSpacing: -1.5,
                  color: key
                    ? color
                    : second
                      ? light
                        ? "#6b7280"
                        : "rgba(255,255,255,0.62)"
                      : light
                        ? LIGHT_TEXT
                        : "#ffffff",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 22}px) scale(${0.9 + p * 0.1 + punch})`,
                  filter: `blur(${(1 - p) * 6}px)`,
                  textShadow: shadow ? "0 2px 6px rgba(0,0,0,0.55), 0 6px 40px rgba(0,0,0,0.75)" : undefined,
                  display: "inline-block",
                  whiteSpace: "nowrap",
                }}
              >
                {text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// A big glass word pill (icon + word) popping in at the top of the zone.
export function WordPill({
  at,
  icon,
  word,
  color,
  top = 290,
}: {
  at: number;
  icon: ReactNode;
  word: string;
  color: string;
  top?: number;
}) {
  const c = useBrand();
  const pop = usePop(at);
  const frame = useCurrentFrame();
  const float = Math.sin(frame / 14) * 6;
  return (
    <div style={{ position: "absolute", left: 130, width: 770, top, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          height: 150,
          padding: "0 56px 0 44px",
          ...glass(420),
          borderRadius: 75,
          background: "rgba(8,12,22,0.5)",
          display: "flex",
          alignItems: "center",
          gap: 28,
          opacity: pop.opacity,
          transform: `translateY(${float}px) scale(${pop.scale})`,
          boxShadow: `0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5), 0 0 60px ${color}55`,
        }}
      >
        {icon}
        <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 96, color: "#fff", letterSpacing: 2 }}>
          {word}
        </span>
      </div>
    </div>
  );
}

// Dark gradient at the top of a full-bleed clip, so a headline reads.
export function TopShade({ height = 760, strength = 0.7 }: { height?: number; strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, rgba(4,6,12,${strength}) 0%, rgba(4,6,12,${strength * 0.6}) ${height * 0.45}px, rgba(4,6,12,0) ${height}px)`,
      }}
    />
  );
}

// ── Small drawn icons (no real picture exists for these) ────────────────────
type IconProps = { size: number; color: string; stroke?: number };
const svgBase = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 48 48",
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});
export function BulbIcon({ size, color, stroke = 3.2 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M17 31c-3.5-2.6-6-6.6-6-11.2C11 12.7 16.8 7 24 7s13 5.7 13 12.8c0 4.6-2.5 8.6-6 11.2v4H17z" />
      <path d="M18 40h12M20 44h8" />
    </svg>
  );
}
export function BurstIcon({ size, color, stroke = 3.2 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M24 5v9M24 34v9M5 24h9M34 24h9M10.5 10.5l6.4 6.4M31.1 31.1l6.4 6.4M37.5 10.5l-6.4 6.4M16.9 31.1l-6.4 6.4" />
      <circle cx="24" cy="24" r="4" />
    </svg>
  );
}
export function CityIcon({ size, color, stroke = 3.2 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M6 42h36M10 42V22h10v20M20 42V10h12v32M32 42V18h7v24" />
      <path d="M24 16h4M24 22h4M24 28h4M14 28h2M14 34h2" />
    </svg>
  );
}
export function MoonIcon({ size, color, stroke = 3.2 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M38 29.5A15 15 0 1 1 20.5 10a12 12 0 0 0 17.5 19.5z" />
    </svg>
  );
}
export function SunIcon({ size, color, stroke = 3.2 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <circle cx="24" cy="24" r="8" />
      <path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.6 10.6l3.5 3.5M33.9 33.9l3.5 3.5M37.4 10.6l-3.5 3.5M14.1 33.9l-3.5 3.5" />
    </svg>
  );
}
export function CubeIcon({ size, color, stroke = 3.2 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M24 5l17 9.5v19L24 43 7 33.5v-19z" />
      <path d="M7 14.5l17 9.5 17-9.5M24 24v19" />
    </svg>
  );
}
export function CheckIcon({ size, color, stroke = 5, progress = 1 }: IconProps & { progress?: number }) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M12 25l8 8 16-17" strokeDasharray={40} strokeDashoffset={40 * (1 - progress)} />
    </svg>
  );
}

// A few lines of the clip's real source (src/showcase/bulbCity) – only ever
// shown as a faint, blurred motif, never to be read.
export const REAL_CODE = `import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { Bulb, Shockwave } from "./Bulb";
import { Buildings } from "./Buildings";
import { Flare, Rays, Sparks } from "./Burst";
import { BULB_Y, clamp, nightAt, T } from "./kit";
import { nightGlow, Street } from "./Street";
import { Cars, Clouds, ParkedCars } from "./Traffic";
const ease = { ...clamp, easing: Easing.inOut(Easing.cubic) };
type Stops = [string, string];
const SKY: { at: number; stops: Stops }[] = [
  { at: 0, stops: ["#211a14", "#0b0907"] },
  { at: T.CRACK, stops: ["#241c16", "#0c0a08"] },
  { at: T.LAND, stops: ["#22324f", "#0d1526"] },
  { at: 152, stops: ["#93d8e4", "#2b88a8"] },
  { at: T.DUSK, stops: ["#93d8e4", "#2b88a8"] },
  { at: T.DUSK + 24, stops: ["#ffc08c", "#c46a7c"] },
  { at: T.NIGHT + 14, stops: ["#24366e", "#0a1230"] },
];
function skyAt(frame: number): Stops {
  let i = 0;
  while (i < SKY.length - 2 && frame > SKY[i + 1].at) i++;
  const t = interpolate(frame, [a.at, b.at], [0, 1], ease);
}
export const T = {
  SHAKE: 34, // the bulb burns brighter and cracks start to run
  CRACK: 62, // the glass bursts
  SLAB: 64, // the diorama's base grows out of the light
  BUILD: 68, // buildings rise, glowing gold
  LAND: 100, // the bulb's base lands on the crossroads
  DUSK: 236, // the sun goes down
  NIGHT: 276, // windows and lamps on
} as const;`;

// ── Code, coloured like VS Code's Dark+ theme ───────────────────────────────
const DARK_PLUS = {
  control: "#C586C0", // import, export, return…
  keyword: "#569CD6", // const, type, function…
  string: "#CE9178",
  number: "#B5CEA8",
  type: "#4EC9B0", // PascalCase names
  constant: "#4FC1FF", // ALL_CAPS names
  func: "#DCDCAA", // a name followed by (
  variable: "#9CDCFE",
  comment: "#6A9955",
  punct: "#D4D4D4",
  gutter: "#6E7681",
};
const CONTROL = new Set(["import", "from", "export", "return", "if", "else", "while", "for", "as"]);
const KEYWORD = new Set(["const", "let", "type", "function", "new", "true", "false", "null", "undefined", "typeof"]);
const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\sA-Za-z_$\d"'`]+)/g;

function tokens(line: string): { text: string; color: string }[] {
  const out: { text: string; color: string }[] = [];
  for (const m of line.matchAll(TOKEN)) {
    const [text, comment, str, num, word] = m;
    let color = DARK_PLUS.punct;
    if (comment) color = DARK_PLUS.comment;
    else if (str) color = DARK_PLUS.string;
    else if (num) color = DARK_PLUS.number;
    else if (word) {
      const after = line.slice((m.index ?? 0) + text.length).trimStart();
      if (CONTROL.has(word)) color = DARK_PLUS.control;
      else if (KEYWORD.has(word)) color = DARK_PLUS.keyword;
      else if (after.startsWith("(")) color = DARK_PLUS.func;
      else if (/^[A-Z][A-Z0-9_]+$/.test(word)) color = DARK_PLUS.constant;
      else if (/^[A-Z]/.test(word)) color = DARK_PLUS.type;
      else color = DARK_PLUS.variable;
    }
    out.push({ text, color });
  }
  return out;
}

// Code lines with line numbers, coloured like the editor people know.
export function CodeLines({
  code,
  fontSize = 22,
  lineHeight = 1.5,
}: {
  code: string;
  fontSize?: number;
  lineHeight?: number;
}) {
  return (
    <div style={{ fontFamily: MONO, fontSize, lineHeight, whiteSpace: "pre" }}>
      {code.split("\n").map((line, i) => (
        <div key={i} style={{ display: "flex" }}>
          <span style={{ width: fontSize * 2.4, color: DARK_PLUS.gutter, textAlign: "right", paddingRight: fontSize * 0.9, flexShrink: 0 }}>
            {i + 1}
          </span>
          <span>
            {tokens(line).map((t, k) => (
              <span key={k} style={{ color: t.color }}>
                {t.text}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
