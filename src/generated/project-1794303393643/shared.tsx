import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  Img,
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
  LIGHT_TEXT_SOFT,
  RecordingSlot,
  asset,
  useBrand,
} from "../../video/brand/kit";

// ── Real pictures ───────────────────────────────────────────────────────────
// The creator's 20 s gameplay recording (9:16) – the default of every
// recording field. Never redrawn.
export const GAME = "/assets/custom/city-flight-game-played-claude-code-mw9l7aio.mp4";
export const GAME_RECORD =
  "Your phone game in portrait (9:16), full screen: fly the paper plane down the night street, through glowing rings, spiral round the glass tower, collect all 22 lights ('All 22 lights!', time 14.2 s) and let the fireworks play. One 20 s take.";
export const CLAUDE_LOGO = "/assets/agent/project-1794303393643/claude.svg";

export const clampAll = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const ZONE = { left: 130, width: 770, center: 515 };

// ── Full-bleed gameplay: edge to edge, from `startSec` of the recording at
// `rate`; optional freeze from scene frame `freezeAt`. The camera never
// stops: a slow push-in plus a punch on key frames. ─────────────────────────
export function Gameplay({
  src,
  startSec,
  rate = 1,
  duration,
  freezeAt,
  punchAt = [],
  zoom = [1.0, 1.06],
  origin = "50% 55%",
  fit,
  streak,
  hideTop,
  scrim,
  dim = 0,
  blur = 0,
}: {
  src: string;
  startSec: number;
  rate?: number;
  duration: number;
  freezeAt?: number;
  punchAt?: number[];
  zoom?: [number, number];
  origin?: string;
  // Shrink the recording a little around a point far below the frame, so its
  // HUD (score + timer, y 80–200 in the recording) lands below the app's top
  // bar; a blurred copy fills the edges.
  fit?: { scale: number; originY: number };
  // Re-place the recording's "×N streak!" line (recording y 270–380), smaller,
  // at `centerY` (frame px, after `fit`).
  streak?: { scale: number; centerY: number };
  // Paint the recording's top band (its finish headline) away with night sky.
  hideTop?: number;
  // A soft dark band behind the captions [top, bottom] in frame px.
  scrim?: [number, number];
  dim?: number;
  blur?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!src)
    return (
      <AbsoluteFill style={{ background: DARK_BG, alignItems: "center", justifyContent: "center" }}>
        <RecordingSlot src="" record={GAME_RECORD} width={770} height={800} />
      </AbsoluteFill>
    );
  let s = interpolate(frame, [0, duration], zoom, clampAll);
  for (const p of punchAt) s += interpolate(frame, [p - 1, p + 1, p + 9], [0, 0.03, 0], clampAll);
  const video = (
    <OffthreadVideo
      src={asset(src)}
      muted
      startFrom={Math.round(startSec * fps)}
      playbackRate={rate}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
  const frozen = freezeAt !== undefined && frame >= freezeAt;
  const play = (el: ReactNode) => (frozen ? <Freeze frame={freezeAt!}>{el}</Freeze> : el);
  const k = fit?.scale ?? 1;
  const oy = fit?.originY ?? 0;
  // frame y → recording y (inverse of `fit`)
  const toSrc = (y: number) => oy + (y - oy) / k;
  const band = { top: 268, bottom: 384, cy: 326 };
  const look = dim || blur ? `brightness(${1 - dim}) blur(${blur}px)` : undefined;
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {fit ? (
        <AbsoluteFill
          style={{ transform: "scale(1.35)", transformOrigin: "50% 100%", filter: "blur(30px) brightness(0.8)" }}
        >
          {play(video)}
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ transform: `scale(${s})`, transformOrigin: origin }}>
        <AbsoluteFill
          style={{
            transform: fit ? `scale(${k})` : undefined,
            transformOrigin: `50% ${oy}px`,
            filter: look,
            ...(fit ? feather("to bottom", 110) : {}),
          }}
        >
          <AbsoluteFill style={fit ? feather("to right", 70) : undefined}>
          {play(video)}
          {streak ? (
            <>
              {/* the original streak line, softened into a glow */}
              <AbsoluteFill
                style={{
                  filter: "blur(22px)",
                  WebkitMaskImage: `linear-gradient(to bottom, transparent ${band.top - 40}px, #000 ${band.top}px, #000 ${band.bottom}px, transparent ${band.bottom + 40}px)`,
                  maskImage: `linear-gradient(to bottom, transparent ${band.top - 40}px, #000 ${band.top}px, #000 ${band.bottom}px, transparent ${band.bottom + 40}px)`,
                }}
              >
                {play(video)}
              </AbsoluteFill>
              {/* …and re-placed smaller, sharp */}
              <AbsoluteFill
                style={{
                  WebkitMaskImage: `radial-gradient(ellipse 340px 88px at 540px ${band.cy}px, #000 72%, transparent 100%)`,
                  maskImage: `radial-gradient(ellipse 340px 88px at 540px ${band.cy}px, #000 72%, transparent 100%)`,
                  transform: `translateY(${toSrc(streak.centerY) - band.cy}px) scale(${streak.scale})`,
                  transformOrigin: `540px ${band.cy}px`,
                }}
              >
                {play(video)}
              </AbsoluteFill>
            </>
          ) : null}
          </AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
      {hideTop ? (
        <AbsoluteFill
          style={{
            background: `linear-gradient(to bottom, #0b1440 0px, #0d1a52f2 ${hideTop * 0.75}px, #0d1a5200 ${hideTop}px)`,
          }}
        />
      ) : null}
      {scrim ? <Scrim top={scrim[0]} bottom={scrim[1]} /> : null}
    </AbsoluteFill>
  );
}

// Soft edges on both ends of one axis (the framed recording melts into its fill).
function feather(dir: "to bottom" | "to right", px: number): CSSProperties {
  const g = `linear-gradient(${dir}, transparent 0px, #000 ${px}px, #000 calc(100% - ${px}px), transparent 100%)`;
  return { WebkitMaskImage: g, maskImage: g };
}

// A soft dark band so the captions read over a bright picture.
export function Scrim({ top, bottom, strength = 0.55 }: { top: number; bottom: number; strength?: number }) {
  const pad = 120;
  const h = bottom - top + pad * 2;
  const a = (y: number) => `${((y + pad) / h) * 100}%`;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: top - pad,
        height: h,
        background: `linear-gradient(to bottom, rgba(4,8,20,0) 0%, rgba(4,8,20,${strength}) ${a(0)}, rgba(4,8,20,${strength}) ${a(bottom - top)}, rgba(4,8,20,0) 100%)`,
      }}
    />
  );
}

// The recording framed for the stage: HUD below the top bar, streak smaller.
export const FIT = { scale: 0.9, originY: 2080 };

// A single still of the recording (for a motif or a link preview).
export function GameStill({ src, atSec, style }: { src: string; atSec: number; style?: CSSProperties }) {
  const { fps } = useVideoConfig();
  if (!src) return <div style={{ background: "#111", ...style }} />;
  return (
    <Freeze frame={0}>
      <OffthreadVideo
        src={asset(src)}
        muted
        startFrom={Math.round(atSec * fps)}
        style={{ objectFit: "cover", ...style }}
      />
    </Freeze>
  );
}

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

// The giant faint motif: the game itself, huge, blurred, tilted.
export function GameMotif({ src, atSec, opacity = 0.14 }: { src: string; atSec: number; opacity?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: -180,
          top: -120 + Math.sin(frame / 50) * 20,
          width: 1440,
          height: 2160,
          opacity,
          filter: "blur(16px)",
          transform: `rotate(-6deg) scale(${1 + frame / 3000})`,
        }}
      >
        <GameStill src={src} atSec={atSec} style={{ width: "100%", height: "100%" }} />
      </div>
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
  softLine = -1,
}: {
  lines: HeadWord[][];
  top?: number;
  size?: number;
  light?: boolean;
  color: string;
  softLine?: number;
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
            const soft = li === softLine;
            return (
              <span
                key={wi}
                style={{
                  fontFamily: c.fontUi,
                  fontWeight: 800,
                  fontSize: size,
                  lineHeight: 1.08,
                  letterSpacing: -1.5,
                  color: key
                    ? color
                    : soft
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

// ── A glass pill over the gameplay (icon + words), springing in ────────────
export function GlassPill({
  at,
  icon,
  text,
  top,
  color,
  size = 54,
  out,
  wrap = false,
}: {
  at: number;
  icon?: ReactNode;
  text: string;
  top: number;
  color: string;
  size?: number;
  out?: number;
  // a big pill may break onto two lines inside the zone (a rounded card)
  wrap?: boolean;
}) {
  const c = useBrand();
  const frame = useCurrentFrame();
  const pop = usePop(at);
  const gone = out === undefined ? 1 : interpolate(frame, [out, out + 6], [1, 0], clampAll);
  const float = Math.sin((frame + at) / 14) * 5;
  const h = size * 1.9;
  const keyed = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  if (frame < at - 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: ZONE.left,
        width: ZONE.width,
        top,
        display: "flex",
        justifyContent: "center",
        opacity: pop.opacity * gone,
        transform: `translateY(${float}px) scale(${pop.scale * (0.9 + gone * 0.1)})`,
      }}
    >
      <div
        style={{
          height: wrap ? undefined : h,
          maxWidth: wrap ? ZONE.width : undefined,
          padding: wrap
            ? `${size * 0.32}px ${size * 0.6}px ${size * 0.32}px ${icon ? size * 0.36 : size * 0.6}px`
            : `0 ${size * 0.8}px 0 ${icon ? size * 0.36 : size * 0.8}px`,
          borderRadius: wrap ? size * 0.7 : h / 2,
          display: "flex",
          alignItems: "center",
          gap: size * 0.36,
          background: "rgba(10,14,26,0.55)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1.5px solid rgba(255,255,255,0.18)",
          borderTop: "1.5px solid rgba(255,255,255,0.34)",
          boxShadow: `0 8px 16px rgba(0,0,0,0.3), 0 24px 60px rgba(0,0,0,0.45), 0 0 ${wrap ? 90 : 50}px ${color}${wrap ? "77" : "55"}`,
          whiteSpace: wrap ? "normal" : "nowrap",
        }}
      >
        {icon ? (
          <div
            style={{
              width: h - size * 0.5,
              height: h - size * 0.5,
              borderRadius: (h - size * 0.5) / 2,
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        ) : null}
        <span
          style={{
            fontFamily: c.fontUi,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.08,
            color: "#fff",
            letterSpacing: -0.5,
            textAlign: wrap ? "center" : undefined,
            textShadow: wrap ? "0 0 26px rgba(255,255,255,0.35)" : undefined,
          }}
        >
          {keyed.map((part, i) =>
            part.startsWith("*") ? (
              <span key={i} style={{ color }}>
                {part.replace(/\*/g, "")}
              </span>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </span>
      </div>
    </div>
  );
}

// ── Claude Code window: glass, three dots, logo + name in the title bar ────
export function ClaudeWindow({
  width = 770,
  height,
  glow,
  light = false,
  children,
  style,
}: {
  width?: number;
  height: number;
  glow: string;
  light?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const c = useBrand();
  const g = glass(width, light);
  return (
    <div
      style={{
        width,
        height,
        ...g,
        borderRadius: 44,
        overflow: "hidden",
        boxShadow: `${g.boxShadow}, 0 0 110px ${glow}55`,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          height: 78,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 30px",
          position: "relative",
          borderBottom: light ? "1.5px solid rgba(20,30,60,0.06)" : "1.5px solid rgba(255,255,255,0.08)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              marginRight: 12,
              background: light ? "rgba(20,30,60,0.18)" : "rgba(255,255,255,0.3)",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <Img src={asset(CLAUDE_LOGO)} style={{ width: 36, height: 36 }} />
          <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 32, color: light ? LIGHT_TEXT : "#fff" }}>
            Claude Code
          </span>
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
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
export function PlaneIcon({ size, color, stroke = 3.6 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M5 23 43 7 33 41 22 29 5 23z" />
      <path d="M43 7 22 29v11l6-6" />
    </svg>
  );
}
export function BulbIcon({ size, color, stroke = 3.6 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M17 31c-4-3-6-7-6-11a13 13 0 0 1 26 0c0 4-2 8-6 11v4H17v-4z" />
      <path d="M19 41h10" />
    </svg>
  );
}
export function RingIcon({ size, color, stroke = 3.6 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <ellipse cx="22" cy="24" rx="10" ry="16" />
      <path d="M30 24h14M38 18l6 6-6 6" />
    </svg>
  );
}
export function ClockIcon({ size, color, stroke = 3.6 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <circle cx="24" cy="26" r="16" />
      <path d="M24 17v9l6 4M19 5h10" />
    </svg>
  );
}
export function LinkIcon({ size, color, stroke = 3.6 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M20 28a8 8 0 0 0 11 1l7-7a8 8 0 0 0-11-11l-3 3" />
      <path d="M28 20a8 8 0 0 0-11-1l-7 7a8 8 0 0 0 11 11l3-3" />
    </svg>
  );
}
export function CheckIcon({ size, color, stroke = 5 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M11 25l9 9 17-19" />
    </svg>
  );
}
export function ChatIcon({ size, color, stroke = 3.6 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M8 10h32v22H22l-9 7v-7H8z" />
    </svg>
  );
}
export function TrophyIcon({ size, color, stroke = 3.6 }: IconProps) {
  return (
    <svg {...svgBase(size)} stroke={color} strokeWidth={stroke}>
      <path d="M15 7h18v10a9 9 0 0 1-18 0V7zM15 11H8c0 6 3 9 7 9M33 11h7c0 6-3 9-7 9M24 26v8M16 41h16M19 34h10v7H19z" />
    </svg>
  );
}

export { LIGHT_BG, LIGHT_TEXT, LIGHT_TEXT_SOFT, DARK_BG };
