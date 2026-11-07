import { usePack } from "./pack";
import type { ReactNode } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sparkle } from "./Glyphs";
import { fitFontSize } from "./fitText";
import { pop, ramp, settle } from "./pop";
import { shadows, stage } from "./tokens";

// Top-zone pictures (docs/bd/kadrai/insiderforce/): each one big, ~85 % wide,
// with depth. `at` – the frame it appears on.

// Idle motion: slowly rises and sinks (±8 px over 2.8 s).
function useFloat(seed = 0) {
  const frame = useCurrentFrame();
  return Math.sin((frame / 84) * Math.PI * 2 + seed) * 8;
}

// ── Logo "coins" joined by a line (as in frames 01, 05, 06) ──
export function CoinChain({
  icons,
  ats,
  at,
  y = stage.visualCenterY,
}: {
  icons: ReactNode[];
  // When each coin pops in (frames) – on its own word; without them – 5 frames apart
  ats?: number[];
  at: number;
  y?: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = 230;
  const gap = (stage.contentWidth - size) / (icons.length - 1);
  const left = (1080 - stage.contentWidth) / 2;
  // The line draws itself over 14 frames, the coins pop in one after another.
  const line = ramp(frame, at, 14);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: y - size / 2,
        width: 1080,
        height: size,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: size / 2 - 3,
          height: 6,
          width: 1080 * line,
          background: c.border,
          borderRadius: 3,
        }}
      />
      {icons.map((icon, i) => {
        const p = pop(frame, ats?.[i] ?? at + 4 + i * 5, fps);
        const float = Math.sin((frame / 84) * Math.PI * 2 + i * 1.3) * 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + i * gap,
              top: float,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${c.surfaceHi}, ${c.surface})`,
              border: `2px solid ${c.border}`,
              boxShadow: shadows.coin,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: Math.min(1, p * 2),
              transform: `scale(${interpolate(p, [0, 1], [0.3, 1])}) rotate(${interpolate(p, [0, 1], [-25, 0])}deg)`,
            }}
          >
            {icon}
          </div>
        );
      })}
    </div>
  );
}

// ── A card with a "deck" behind it (as in frame 01) ──
export function DeckCard({
  at,
  children,
  top = stage.visualTop + 170,
  height = 600,
}: {
  at: number;
  children: ReactNode;
  top?: number;
  height?: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = settle(frame, at, fps);
  const float = useFloat(0.7);
  const width = stage.contentWidth - 60;
  const left = (1080 - width) / 2 - 30;
  // Two cards behind the main one fan out to the right a little later.
  const fan = settle(frame, at + 6, fps);
  return (
    <div
      style={{ position: "absolute", left, top: top + float, width, height }}
    >
      {[2, 1].map((n) => (
        <div
          key={n}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 30,
            background: c.surface,
            border: `2px solid ${c.border}`,
            boxShadow: shadows.card,
            transform: `translate(${fan * n * 34}px, ${fan * n * 14}px) scale(${1 - n * 0.04})`,
            opacity: fan * (1 - n * 0.25),
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 30,
          overflow: "hidden",
          background: `linear-gradient(180deg, ${c.surfaceHi}, ${c.surface})`,
          border: `2px solid ${c.border}`,
          boxShadow: shadows.card,
          opacity: Math.min(1, p * 1.6),
          transform: `translateY(${interpolate(p, [0, 1], [260, 0])}px) scale(${interpolate(p, [0, 1], [0.9, 1])})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Code in a card: the lines appear one after another, `+ ` – highlighted.
export function CodeBody({
  lines,
  at,
  file,
}: {
  lines: string[];
  at: number;
  file: string;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "26px 34px",
          borderBottom: `2px solid ${c.border}`,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div
            key={c}
            style={{ width: 20, height: 20, borderRadius: 10, background: c }}
          />
        ))}
        <div
          style={{
            marginLeft: 18,
            fontFamily: c.fontRegular,
            fontSize: 30,
            color: c.textSoft,
          }}
        >
          {file}
        </div>
      </div>
      <div
        style={{
          padding: "30px 34px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {lines.map((line, i) => {
          const hot = line.startsWith("+ ");
          const show = ramp(frame, at + 8 + i * 4, 6);
          return (
            <div
              key={i}
              style={{
                fontFamily: "ui-monospace, Menlo, monospace",
                fontSize: 40,
                lineHeight: 1.35,
                whiteSpace: "pre",
                color: hot ? c.text : c.textSoft,
                background: hot ? "rgba(255,112,36,0.16)" : "transparent",
                borderLeft: `6px solid ${hot ? c.accent : "transparent"}`,
                padding: "2px 16px",
                borderRadius: 8,
                opacity: show,
                transform: `translateX(${(1 - show) * -24}px)`,
              }}
            >
              {colorize(hot ? line.slice(2) : line)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Very simple code colouring: strings in the accent, keys light.
function colorize(line: string) {
  return line.split(/('[^']*')/).map((part, i) =>
    part.startsWith("'") ? (
      <span key={i} style={{ color: "#FFB27D" }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ── A "01" number strip with a line down (as in frame 08) ──
export function NumberBadge({
  label,
  at,
  top = stage.visualTop - 40,
  line: withLine = true,
}: {
  label: string;
  at: number;
  top?: number;
  // the line down from it, to what comes below (off when nothing does)
  line?: boolean;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps);
  const line = ramp(frame, at + 6, 8);
  const width = stage.contentWidth;
  return (
    <div style={{ position: "absolute", left: (1080 - width) / 2, top, width }}>
      <div
        style={{
          height: 150,
          borderRadius: 26,
          background: c.text,
          color: c.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: c.fontStrong,
          fontSize: 104,
          letterSpacing: "-0.03em",
          boxShadow: "0 30px 60px rgba(0,0,0,0.55)",
          opacity: Math.min(1, p * 2),
          transform: `translateY(${interpolate(p, [0, 1], [-60, 0])}px) scale(${interpolate(p, [0, 1], [0.85, 1])})`,
        }}
      >
        {label}
      </div>
      <div
        style={{
          margin: "0 auto",
          width: 6,
          height: withLine ? 210 * line : 0,
          background: "rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
}

// ── A big list with ✦ (as in frames 02, 09) ──
const LIST_ICON = 78;
const LIST_GAP = 44;

export function BigList({
  items,
  top = stage.visualTop + 60,
}: {
  items: { text: string; at: number }[];
  top?: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // One size for every row, so the list reads as one: the longest row has to
  // fit beside its icon, or the whole list gets smaller.
  const fontSize = fitFontSize(
    items.map((item) => item.text),
    88 * c.widthFactor,
    stage.contentWidth - LIST_ICON - LIST_GAP,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: (1080 - stage.contentWidth) / 2,
        top,
        display: "flex",
        flexDirection: "column",
        gap: 54 * (fontSize / (88 * c.widthFactor)),
      }}
    >
      {items.map((item, i) => {
        const icon = pop(frame, item.at, fps);
        const text = settle(frame, item.at + 3, fps);
        return (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: LIST_GAP }}
          >
            <div
              style={{
                transform: `scale(${interpolate(icon, [0, 1], [0, 1])}) rotate(${interpolate(icon, [0, 1], [-90, 0])}deg)`,
              }}
            >
              <Sparkle size={LIST_ICON} color={c.accent} />
            </div>
            <div
              style={{
                fontFamily: c.fontSemi,
                fontSize,
                whiteSpace: "nowrap",
                letterSpacing: "-0.03em",
                color: c.text,
                opacity: Math.min(1, text * 1.5),
                transform: `translateX(${interpolate(text, [0, 1], [-50, 0])}px)`,
              }}
            >
              {item.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// The whole picture leaves: rises and fades (when the next one replaces it).
export function ExitUp({ at, children }: { at: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const out = ramp(frame, at, 8);
  if (out >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 1 - out,
        transform: `translateY(${-90 * out}px) scale(${1 - 0.06 * out})`,
      }}
    >
      {children}
    </div>
  );
}
