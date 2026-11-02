import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getSfx } from "../../../registries/sfxRegistry";
import { standardEasing } from "../../motion/easing";
import { SFX_VOLUME } from "../../motion/sfxDefaults";
import {
  colors,
  fontFamilies,
  fontSizes,
  safeArea,
} from "../../typography/tokens";
import { Pill } from "../../typography/Text";

// The style kit of ONE video, "AI agents explained": every scene of it is
// drawn with these parts, so the nine scenes read as one piece – the same
// grid canvas, the same cards, the same two characters (the agent, a new
// employee; the manager, plain code), the same way things arrive.

// Ticks and crosses: the only colours besides the brand's.
export const OK = "#3DDC84";
export const NO = "#FF4D4D";

// The voiceover is spoken at VO_WORDS_PER_SECOND (src/utils/pacing.ts):
// word n of a scene's line starts at about n × 9.4 frames. Each scene times
// its events with this, so things arrive on the word they illustrate.
export const word = (n: number) => Math.round((n * 30) / 3.2);

// 0 → 1 with a little overshoot, from `start`.
export function useArrive(start: number, damping = 13) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - start, fps, config: { damping, mass: 0.7 } });
}

// 0 → 1 over `length` frames, eased.
export function useDraw(start: number, length = 18) {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
}

// The canvas every scene sits on: dark, a faint grid that drifts slowly, a
// warm glow, and a slow push-in so the frame is never still.
export function Canvas({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const drift = (frame * 0.4) % 72;
  return (
    <AbsoluteFill style={{ background: colors.background, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${colors.border} 2px, transparent 2px), linear-gradient(90deg, ${colors.border} 2px, transparent 2px)`,
          backgroundSize: "72px 72px",
          backgroundPosition: `0 ${drift}px`,
          opacity: 0.55,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, ${colors.accentSoft} 0%, transparent 55%)`,
        }}
      />
      <AbsoluteFill
        style={{
          transform: `scale(${1 + frame * 0.0006})`,
          transformOrigin: "50% 50%",
        }}
      >
        {children}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,.55) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}

// The scene's title: big, one word at a time, one word in the highlight pill.
export function Title({
  text,
  highlight,
  y = 17,
  start = 0,
  size = fontSizes.headline,
}: {
  text: string;
  highlight?: string;
  y?: number;
  start?: number;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <div
      style={{
        position: "absolute",
        top: `${y}%`,
        left: safeArea.left,
        right: safeArea.right,
        transform: "translateY(-50%)",
        textAlign: "center",
        fontFamily: fontFamilies.tanker,
        fontSize: size,
        lineHeight: 1.05,
        color: colors.textPrimary,
        textTransform: "uppercase",
      }}
    >
      {words.map((w, i) => {
        const t = spring({
          frame: frame - start - i * 3,
          fps,
          config: { damping: 12, mass: 0.6 },
        });
        // "AGENTS," still matches the highlight "AGENTS"; the comma stays outside.
        const bare = w.replace(/[^\p{L}\p{N}]+$/u, "");
        const content =
          bare === highlight ? (
            <>
              <Pill>{bare}</Pill>
              {w.slice(bare.length)}
            </>
          ) : (
            w
          );
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: "0.25em",
              opacity: Math.min(1, t * 1.4),
              transform: `translateY(${(1 - t) * 40}px) scale(${0.7 + t * 0.3})`,
            }}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

// The one card look of this video.
export function Card({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: CSSProperties;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? colors.accentSoft : colors.surface,
        border: `3px solid ${accent ? colors.accent : colors.border}`,
        borderRadius: 36,
        boxShadow: "0 30px 70px rgba(0,0,0,.45)",
        padding: 36,
        boxSizing: "border-box",
        fontFamily: fontFamilies.clashSemibold,
        color: colors.textPrimary,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// A small rounded label.
export function Chip({
  children,
  on = true,
  style,
}: {
  children: ReactNode;
  on?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 30px",
        borderRadius: 999,
        fontFamily: fontFamilies.clashSemibold,
        fontSize: fontSizes.label,
        background: on ? colors.accent : colors.surfaceElevated,
        color: on ? colors.background : colors.textSecondary,
        border: `3px solid ${on ? colors.accent : colors.border}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// The big step number of the three steps.
export function StepNumber({ n, start }: { n: number; start: number }) {
  const t = useArrive(start, 10);
  return (
    <div
      style={{
        width: 170,
        height: 170,
        borderRadius: "50%",
        background: colors.accent,
        color: colors.background,
        fontFamily: fontFamilies.tanker,
        fontSize: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${t}) rotate(${(1 - t) * -40}deg)`,
        boxShadow: "0 20px 50px rgba(255,112,36,.4)",
      }}
    >
      {n}
    </div>
  );
}

// A tick or a cross that draws itself, from `start`.
export function Mark({
  ok,
  start,
  size = 120,
}: {
  ok: boolean;
  start: number;
  size?: number;
}) {
  const t = useDraw(start, 14);
  const pop = useArrive(start, 9);
  const path = ok ? "M20 55 L45 80 L90 25" : "M25 25 L85 85 M85 25 L25 85";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 110 110"
      style={{ transform: `scale(${0.6 + pop * 0.4})` }}
    >
      <circle cx="55" cy="55" r="50" fill={ok ? OK : NO} opacity={pop} />
      <path
        d={path}
        fill="none"
        stroke={colors.background}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - t}
      />
    </svg>
  );
}

// The agent: a new employee, drawn as a friendly robot with an orange tie
// and a "NEW" badge. It bobs gently and blinks, so it is never a sticker.
export function Agent({
  size = 360,
  badge = true,
}: {
  size?: number;
  badge?: boolean;
}) {
  const frame = useCurrentFrame();
  const bob = Math.sin(frame / 12) * 8;
  const blink = frame % 90 > 84 ? 0.15 : 1;
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 200 250"
      style={{ transform: `translateY(${bob}px)`, overflow: "visible" }}
    >
      <line
        x1="100"
        y1="10"
        x2="100"
        y2="34"
        stroke={colors.accent}
        strokeWidth="6"
      />
      <circle cx="100" cy="10" r="9" fill={colors.accent} />
      <rect
        x="30"
        y="34"
        width="140"
        height="110"
        rx="36"
        fill={colors.surfaceElevated}
        stroke={colors.textPrimary}
        strokeWidth="6"
      />
      <rect
        x="50"
        y="58"
        width="100"
        height="58"
        rx="22"
        fill={colors.background}
      />
      <ellipse cx="78" cy="87" rx="11" ry={11 * blink} fill={colors.accent} />
      <ellipse cx="122" cy="87" rx="11" ry={11 * blink} fill={colors.accent} />
      <path
        d="M84 128 Q100 138 116 128"
        stroke={colors.textPrimary}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="45"
        y="152"
        width="110"
        height="90"
        rx="30"
        fill={colors.surfaceElevated}
        stroke={colors.textPrimary}
        strokeWidth="6"
      />
      <path d="M100 152 L88 172 L100 222 L112 172 Z" fill={colors.accent} />
      {badge ? (
        <g>
          <rect
            x="118"
            y="180"
            width="54"
            height="30"
            rx="8"
            fill={colors.textPrimary}
          />
          <text
            x="145"
            y="202"
            textAnchor="middle"
            fontSize="20"
            fontFamily={fontFamilies.clashBold}
            fill={colors.background}
          >
            NEW
          </text>
        </g>
      ) : null}
    </svg>
  );
}

// The manager – plain code: square glasses, a stern brow and a clipboard.
export function Manager({
  size = 360,
  stamp = 0,
}: {
  size?: number;
  stamp?: number;
}) {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 16) * 3;
  return (
    <svg
      width={size}
      height={size * 1.25}
      viewBox="0 0 200 250"
      style={{ transform: `rotate(${sway}deg)`, overflow: "visible" }}
    >
      <circle
        cx="100"
        cy="80"
        r="56"
        fill={colors.surfaceElevated}
        stroke={colors.textPrimary}
        strokeWidth="6"
      />
      <path
        d="M58 52 Q100 18 142 52"
        stroke={colors.textPrimary}
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
      <rect
        x="62"
        y="70"
        width="32"
        height="24"
        rx="5"
        fill="none"
        stroke={colors.accent}
        strokeWidth="6"
      />
      <rect
        x="106"
        y="70"
        width="32"
        height="24"
        rx="5"
        fill="none"
        stroke={colors.accent}
        strokeWidth="6"
      />
      <line
        x1="94"
        y1="82"
        x2="106"
        y2="82"
        stroke={colors.accent}
        strokeWidth="6"
      />
      <line
        x1="64"
        y1="62"
        x2="92"
        y2="66"
        stroke={colors.textPrimary}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="136"
        y1="62"
        x2="108"
        y2="66"
        stroke={colors.textPrimary}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="84"
        y1="114"
        x2="116"
        y2="114"
        stroke={colors.textPrimary}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <rect
        x="45"
        y="146"
        width="110"
        height="96"
        rx="30"
        fill={colors.surfaceElevated}
        stroke={colors.textPrimary}
        strokeWidth="6"
      />
      <g transform={`rotate(${-12 + stamp * 12} 150 190)`}>
        <rect
          x="128"
          y="150"
          width="56"
          height="74"
          rx="8"
          fill={colors.textPrimary}
        />
        <rect
          x="140"
          y="144"
          width="32"
          height="12"
          rx="4"
          fill={colors.accent}
        />
        <line
          x1="138"
          y1="174"
          x2="174"
          y2="174"
          stroke={colors.background}
          strokeWidth="5"
        />
        <line
          x1="138"
          y1="190"
          x2="174"
          y2="190"
          stroke={colors.background}
          strokeWidth="5"
        />
        <line
          x1="138"
          y1="206"
          x2="162"
          y2="206"
          stroke={colors.background}
          strokeWidth="5"
        />
      </g>
    </svg>
  );
}

// A sound on frame `at`, at the house volume. Used sparingly: five in the
// whole video, each on a real payoff (CLAUDE.md, Sound).
export function Sfx({ at, id }: { at: number; id: string }) {
  const src = getSfx(id)?.src;
  if (!src) return null;
  return (
    <Sequence from={at} durationInFrames={45} layout="none">
      <Audio src={src} volume={SFX_VOLUME} />
    </Sequence>
  );
}
