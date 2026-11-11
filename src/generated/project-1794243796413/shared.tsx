import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  DARK_BG,
  LIGHT_BG,
  LIGHT_TEXT,
  LIGHT_TEXT_SOFT,
  RecordingSlot,
  asset,
  useBrand,
} from "../../video/brand/kit";

// Real pictures fetched with scripts/asset.ts (sizes in px of the PNG).
const A = "/assets/agent/project-1794243796413/";
export const ASSETS = {
  catcopter: { src: `${A}catcopter.png`, w: 2560, h: 1600 },
  ghR2d2: { src: `${A}gh-r2d2.png`, w: 2200, h: 2600 },
  ghNes: { src: `${A}gh-nes.png`, w: 2200, h: 2600 },
  // whole pages (dark), the camera scrolls down them into the README
  ghR2d2Full: { src: `${A}gh-r2d2-full.png`, w: 2200, h: 10502 },
  ghNesFull: { src: `${A}gh-nes-full.png`, w: 2200, h: 20624 },
  hnR2d2: { src: `${A}hn-r2d2.png`, w: 1520, h: 1040 },
  hnNes: { src: `${A}hn-nes.png`, w: 1520, h: 1040 },
  scrollR2d2: `${A}scroll-r2d2.mp4`,
  scrollNes: `${A}scroll-nes.mp4`,
  claude: `${A}claude.svg`,
  github: `${A}github.svg`,
  hn: `${A}hn.svg`,
};

export const clampAll = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const ZONE = { left: 130, width: 770, center: 515 };

// ── Painted background: navy (or off-white) + one breathing colour glow ────
export function Backdrop({
  color,
  light = false,
  x = 515,
  y = 680,
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
          opacity: light ? breathe * 0.6 : breathe,
          filter: "blur(30px)",
        }}
      />
    </AbsoluteFill>
  );
}

// A giant faint motif behind the focal card: a real screenshot, blurred.
export function Motif({ src, light = false, rotate = -8 }: { src: string; light?: boolean; rotate?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={asset(src)}
        style={{
          position: "absolute",
          left: -260,
          top: 120 + Math.sin(frame / 50) * 20,
          width: 1600,
          opacity: light ? 0.1 : 0.08,
          filter: "blur(14px)",
          transform: `rotate(${rotate}deg)`,
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
        borderRadius: width * 0.055,
        boxShadow: "0 4px 12px rgba(20,30,60,0.08), 0 20px 50px rgba(20,30,60,0.14)",
        border: "1.5px solid rgba(20,30,60,0.06)",
      }
    : {
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRadius: width * 0.055,
        border: "1.5px solid rgba(255,255,255,0.14)",
        borderTop: "1.5px solid rgba(255,255,255,0.28)",
        boxShadow: "0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5)",
      };
}

// A card entering from below with its tilt revealing, then floating.
// start < 0: already in place on the first frame (only the idle float).
export function cardMotion(frame: number, start: number): CSSProperties {
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

// The scene's camera: push in 1.00 → 1.04, with a punch on key frames.
export function Camera({ duration, punchAt, children }: { duration: number; punchAt?: number[]; children: ReactNode }) {
  const frame = useCurrentFrame();
  let s = interpolate(frame, [0, duration], [1, 1.04], clampAll);
  for (const p of punchAt ?? []) s += interpolate(frame, [p - 1, p + 1, p + 9], [0, 0.03, 0], clampAll);
  return <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: "515px 660px" }}>{children}</AbsoluteFill>;
}

// Shown from `from` until `to` (then shrinks away in 6 frames).
export function Swap({ from = -100, to = 99999, children }: { from?: number; to?: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  if (frame < from - 2 || frame > to + 6) return null;
  const out = interpolate(frame, [to, to + 6], [1, 0], clampAll);
  return (
    <AbsoluteFill style={{ opacity: out, transform: `translateY(${(1 - out) * -20}px) scale(${0.94 + out * 0.06})` }}>
      {children}
    </AbsoluteFill>
  );
}

// ── Headline: words pop in one by one; *word* is the key word ───────────────
export type HeadWord = { text: string; at: number };
export const words = (text: string, at: number, step = 3): HeadWord[] =>
  text.split(" ").map((t, i) => ({ text: t, at: at + i * step }));

export function Headline({
  lines,
  top = 265,
  size = 88,
  light = false,
  color,
}: {
  lines: HeadWord[][];
  top?: number;
  size?: number;
  light?: boolean;
  color: string;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: ZONE.left,
        width: ZONE.width,
        top,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size * 0.06,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", gap: size * 0.26, justifyContent: "center" }}>
          {line.map((w, wi) => {
            const key = w.text.startsWith("*");
            const text = w.text.replace(/\*/g, "");
            const t = frame - (w.at - 2);
            const p = interpolate(t, [0, 10], [0, 1], { ...clampAll, easing: OUT });
            const punch = key ? interpolate(t, [8, 11, 18], [0, 0.04, 0], clampAll) : 0;
            const second = li > 0;
            return (
              <span
                key={wi}
                style={{
                  fontFamily: c.fontUi,
                  fontWeight: 800,
                  fontSize: size * (second ? 0.72 : 1),
                  lineHeight: 1.08,
                  letterSpacing: -1.5,
                  color: key
                    ? color
                    : second
                      ? light
                        ? LIGHT_TEXT_SOFT
                        : "rgba(255,255,255,0.62)"
                      : light
                        ? LIGHT_TEXT
                        : "#ffffff",
                  opacity: p,
                  transform: `translateY(${(1 - p) * 22}px) scale(${0.9 + p * 0.1 + punch})`,
                  filter: `blur(${(1 - p) * 6}px)`,
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

// ── A real image seen through a window: centred on (cx, cy) in the image's
// own pixels, at `s` screen px per image px; edges never show. Children are
// laid over the image in image pixels (x, y, w, h × s).
export function Pan({
  src,
  nw,
  nh,
  w,
  h,
  cx,
  cy,
  s,
  children,
}: {
  src: string;
  nw: number;
  nh: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  s: number;
  children?: (s: number) => ReactNode;
}) {
  const W = nw * s;
  const H = nh * s;
  const left = W <= w ? (w - W) / 2 : Math.min(0, Math.max(w - W, w / 2 - cx * s));
  const top = H <= h ? (h - H) / 2 : Math.min(0, Math.max(h - H, h / 2 - cy * s));
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden" }}>
      <div style={{ position: "absolute", left, top, width: W, height: H }}>
        <Img src={asset(src)} style={{ width: W, height: H, display: "block" }} />
        {children?.(s)}
      </div>
    </div>
  );
}

// ── Browser card: glass, three dots, the URL in a pill, the page below ─────
export function BrowserCard({
  url,
  icon,
  width = 770,
  bodyHeight,
  light = false,
  glow,
  style,
  children,
}: {
  url: string;
  icon?: string;
  width?: number;
  bodyHeight: number;
  light?: boolean;
  glow?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const c = useBrand();
  const bar = 74;
  const g = glass(width, light);
  return (
    <div
      style={{
        width,
        ...g,
        borderRadius: 40,
        overflow: "hidden",
        boxShadow: glow ? `${g.boxShadow}, 0 0 90px ${glow}66` : g.boxShadow,
        ...style,
      }}
    >
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: 12, padding: "0 26px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ width: 16, height: 16, borderRadius: 8, background: light ? "rgba(20,30,60,0.18)" : "rgba(255,255,255,0.3)" }}
          />
        ))}
        <div
          style={{
            marginLeft: 14,
            height: 46,
            borderRadius: 23,
            background: light ? "rgba(20,30,60,0.06)" : "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 22px",
            maxWidth: width - 160,
          }}
        >
          {icon ? (
            <Img src={asset(icon)} style={{ width: 28, height: 28 }} />
          ) : null}
          <span
            style={{
              fontFamily: c.fontUi,
              fontWeight: 700,
              fontSize: 27,
              color: light ? LIGHT_TEXT : "rgba(255,255,255,0.9)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {url}
          </span>
        </div>
      </div>
      <div style={{ height: bodyHeight, overflow: "hidden", position: "relative" }}>{children}</div>
    </div>
  );
}

// ── The creator's name (and link) – pinned under the card ──────────────────
export function CreatorChip({
  name,
  link,
  top,
  light = false,
  at = -20,
  color,
  align = "center",
}: {
  name: string;
  link?: string;
  top: number;
  light?: boolean;
  at?: number;
  color: string;
  align?: "center" | "left";
}) {
  const c = useBrand();
  const pop = usePop(at);
  return (
    <div
      style={{
        position: "absolute",
        left: ZONE.left,
        width: ZONE.width,
        top,
        display: "flex",
        justifyContent: align === "left" ? "flex-start" : "center",
      }}
    >
      <div
        style={{
          height: 76,
          padding: "0 32px 0 14px",
          borderRadius: 38,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: light ? "#ffffff" : "rgba(10,14,26,0.6)",
          border: light ? "1.5px solid rgba(20,30,60,0.08)" : "1.5px solid rgba(255,255,255,0.14)",
          boxShadow: light ? "0 10px 30px rgba(20,30,60,0.12)" : "0 10px 30px rgba(0,0,0,0.4)",
          opacity: pop.opacity,
          transform: `scale(${pop.scale})`,
          maxWidth: ZONE.width,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: c.fontUi,
            fontWeight: 800,
            fontSize: 28,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 32, color: light ? LIGHT_TEXT : "#fff", whiteSpace: "nowrap" }}>
          {name}
        </span>
        {link ? (
          <span
            style={{
              fontFamily: c.fontUi,
              fontWeight: 600,
              fontSize: 26,
              color: light ? LIGHT_TEXT_SOFT : "rgba(255,255,255,0.6)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {link}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── A counter running up (fast, then slowing) ──────────────────────────────
export function useCount(target: number, start: number, length = 24) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, start + length], [0, 1], { ...clampAll, easing: Easing.out(Easing.cubic) });
  return Math.round(target * p);
}

// A huge number with the Hacker News logo next to it, a grey line below.
export function BigStat({
  value,
  at,
  label,
  light = false,
  color,
  top = 212,
}: {
  value: number;
  at: number;
  label: string;
  light?: boolean;
  color: string;
  top?: number;
}) {
  const c = useBrand();
  const frame = useCurrentFrame();
  const n = useCount(value, at - 2, 24);
  const pop = usePop(at - 2);
  const land = interpolate(frame, [at + 20, at + 24, at + 32], [0, 0.12, 0], clampAll);
  const p = interpolate(frame, [at + 4, at + 14], [0, 1], { ...clampAll, easing: OUT });
  return (
    <div
      style={{
        position: "absolute",
        left: ZONE.left,
        width: ZONE.width,
        top,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 34, opacity: pop.opacity, transform: `scale(${pop.scale})` }}>
        <span
          style={{
            fontFamily: c.fontUi,
            fontWeight: 800,
            fontSize: 210,
            lineHeight: 1,
            letterSpacing: -6,
            color: light ? LIGHT_TEXT : "#fff",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {n}
        </span>
        <Img
          src={asset(ASSETS.hn)}
          style={{ width: 120, height: 120, borderRadius: 26, transform: `scale(${1 + land})`, boxShadow: `0 10px 40px ${color}88` }}
        />
      </div>
      <div
        style={{
          fontFamily: c.fontUi,
          fontWeight: 800,
          fontSize: 58,
          marginTop: 6,
          color: light ? LIGHT_TEXT_SOFT : "rgba(255,255,255,0.62)",
          opacity: p,
          transform: `translateY(${(1 - p) * 20}px)`,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── A hand-drawn ring drawing itself around a box (image px × s) ───────────
export function Ring({
  x,
  y,
  w,
  h,
  s,
  at,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  s: number;
  at: number;
  color: string;
}) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 14], [0, 1], { ...clampAll, easing: Easing.inOut(Easing.cubic) });
  const pad = 14;
  const W = w * s + pad * 4;
  const H = h * s + pad * 3;
  const rx = W / 2 - 6;
  const ry = H / 2 - 6;
  const len = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))) * 1.12;
  return (
    <svg
      width={W}
      height={H}
      style={{ position: "absolute", left: x * s - pad * 2, top: y * s - pad * 1.5, overflow: "visible", opacity: p > 0 ? 1 : 0 }}
    >
      <path
        d={`M ${W / 2 + rx * 0.2} ${H / 2 - ry} A ${rx} ${ry} 0 1 1 ${W / 2 - rx * 0.35} ${H / 2 - ry * 0.96} L ${W / 2 + rx * 0.45} ${H / 2 - ry * 1.08}`}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - p)}
      />
    </svg>
  );
}

// ── A Hacker News post seen up close: first the line that tells the story
// (with a soft glow), then the camera flies to "N points" and rings it. ──────
export type HnShot = { src: string; w: number; h: number };
export type Box = { x: number; y: number; w: number; h: number };
export function HnZoom({
  shot,
  story,
  points,
  moveAt,
  width,
  height,
  color,
}: {
  shot: HnShot;
  story: Box; // the sentence that tells the story
  points: Box; // "N points"
  moveAt: number;
  width: number;
  height: number;
  color: string;
}) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [moveAt, moveAt + 18], [0, 1], { ...clampAll, easing: Easing.inOut(Easing.cubic) });
  const sA = Math.min(1.05, (width - 60) / story.w);
  const sB = 2.5;
  const s = interpolate(p, [0, 1], [sA, sB]) * (1 + interpolate(frame, [0, moveAt], [0, 0.04], clampAll));
  const cx = interpolate(p, [0, 1], [story.x + story.w / 2, points.x + 120]);
  const cy = interpolate(p, [0, 1], [story.y + story.h / 2 - 20, points.y + points.h / 2 - 6]);
  const glowA = interpolate(frame, [4, 16], [0, 1], clampAll) * (1 - p);
  return (
    <Pan src={shot.src} nw={shot.w} nh={shot.h} w={width} h={height} cx={cx} cy={cy} s={s}>
      {(sc) => (
        <>
          <div
            style={{
              position: "absolute",
              left: (story.x - 20) * sc,
              top: (story.y - 12) * sc,
              width: (story.w + 40) * sc,
              height: (story.h + 24) * sc,
              borderRadius: 18 * sc,
              background: `radial-gradient(ellipse at center, ${color}55 0%, ${color}22 55%, ${color}00 80%)`,
              opacity: glowA,
              mixBlendMode: "multiply",
            }}
          />
          <Ring x={points.x} y={points.y} w={points.w} h={points.h} s={sc} at={moveAt + 14} color={color} />
        </>
      )}
    </Pan>
  );
}

// ── Catcopter: the creator's gameplay recording, or – until it is there –
// the real catcopter.com page, the camera moving over it. ──────────────────
export const CAT_RECORD =
  "catcopter.com in your browser, full screen (16:10, zoom so the cat is big): press Play, fly the cat through pterodactyls, chickens and angry penguins – ideally with another player's cat flying past. Record 10–15 s; it runs on through scenes 1 and 2.";
export type Focus = { cx: number; cy: number; s: number };
export function CatScreen({
  src,
  at,
  width,
  height,
  focus,
}: {
  src: string;
  at: number;
  width: number;
  height: number;
  focus: Focus;
}) {
  if (src)
    return <RecordingSlot src={src} record={CAT_RECORD} at={at} width={width} height={height} style={{ borderRadius: 0 }} />;
  const a = ASSETS.catcopter;
  return <Pan src={a.src} nw={a.w} nh={a.h} w={width} h={height} cx={focus.cx} cy={focus.cy} s={focus.s} />;
}
// Interpolates a camera path of [frame, focus] keys (eased).
export function focusAt(frame: number, keys: [number, Focus][]): Focus {
  const f = keys.map((k) => k[0]);
  const e = { ...clampAll, easing: Easing.inOut(Easing.cubic) };
  if (keys.length === 1) return keys[0][1];
  let i = 0;
  while (i < keys.length - 2 && frame > f[i + 1]) i++;
  const [f0, a] = keys[i];
  const [f1, b] = keys[i + 1];
  const p = interpolate(frame, [f0, f1], [0, 1], e);
  return { cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p, s: a.s + (b.s - a.s) * p };
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
export function AppIcon({ size, color, stroke = 3.4 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <rect x="13" y="4" width="22" height="40" rx="5" />
      <path d="M21 38h6" />
      <rect x="18" y="11" width="5" height="5" rx="1.2" />
      <rect x="25" y="11" width="5" height="5" rx="1.2" />
      <rect x="18" y="19" width="5" height="5" rx="1.2" />
    </svg>
  );
}
export function TvIcon({ size, color, stroke = 3.4 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <rect x="5" y="10" width="38" height="25" rx="4" />
      <path d="M17 43h14M24 35v8M18 4l6 6 6-6" />
    </svg>
  );
}
export function PadIcon({ size, color, stroke = 3.4 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M14 14h20c5.5 0 9 4.5 9.5 11l.6 7c.4 4.3-4.6 6.6-7.6 3.6L32 31H16l-4.5 4.6c-3 3-8-.7-7.6-3.6l.6-7C5 18.5 8.5 14 14 14z" />
      <path d="M14 20v7M10.5 23.5h7" />
      <circle cx="33" cy="21" r="1.4" fill={color} />
      <circle cx="37" cy="25" r="1.4" fill={color} />
    </svg>
  );
}
// The "annoyed" mark (the comic anger vein)
export function AngerIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={4.4}>
      <path d="M8 18c6 0 10-4 10-10M30 8c0 6 4 10 10 10M40 30c-6 0-10 4-10 10M18 40c0-6-4-10-10-10" />
    </svg>
  );
}
