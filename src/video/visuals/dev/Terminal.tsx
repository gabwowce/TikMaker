import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies } from "../../typography/tokens";
import { MONO_FONT, MONO_SIZE, WINDOW_WIDTH, WINDOW_PADDING_X } from "./devText";

type TerminalLine = { text: string; kind?: "prompt" | "output" | "accent" | "dim" };

type TerminalProps = {
  title?: string;
  lines: TerminalLine[];
  cursor?: boolean;
};

const LINE_STAGGER = 12;
const LINE_REVEAL = 8;


const lineColor: Record<NonNullable<TerminalLine["kind"]>, string> = {
  prompt: colors.textPrimary,
  output: colors.textSecondary,
  accent: colors.accent,
  dim: "rgba(184,184,184,0.55)",
};

/**
 * A terminal window with lines typing in one after another — the native
 * vocabulary for CLI content, where a checklist of the same text would read as
 * generic marketing copy.
 */
export const Terminal: React.FC<TerminalProps> = ({ title = "terminal", lines, cursor = true }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: WINDOW_WIDTH,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#0E0E0E",
        border: `1px solid ${colors.border}`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "18px 24px",
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((dot) => (
          <div key={dot} style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: dot }} />
        ))}
        <div
          style={{
            marginLeft: 8,
            fontFamily: fontFamilies.clashMedium,
            fontSize: 28,
            color: colors.textSecondary,
          }}
        >
          {title}
        </div>
      </div>

      <div style={{ padding: `28px ${WINDOW_PADDING_X}px`, display: "flex", flexDirection: "column", gap: 16 }}>
        {lines.map((line, index) => {
          const delay = index * LINE_STAGGER;
          const opacity = interpolate(frame - delay, [0, LINE_REVEAL], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const isLast = index === lines.length - 1;
          const showCursor = cursor && isLast && frame >= delay && Math.floor((frame - delay) / 15) % 2 === 0;

          return (
            <div
              key={index}
              style={{
                opacity,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: MONO_FONT,
                fontSize: MONO_SIZE,
                lineHeight: 1.25,
                color: lineColor[line.kind ?? "output"],
                whiteSpace: "pre",
              }}
            >
              {line.kind === "prompt" ? <span style={{ color: colors.accent }}>❯</span> : null}
              <span>{line.text}</span>
              {showCursor ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 18,
                    height: MONO_SIZE * 0.9,
                    backgroundColor: colors.accent,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
