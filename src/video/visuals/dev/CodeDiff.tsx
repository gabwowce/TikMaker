import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies } from "../../typography/tokens";
import { MONO_FONT, MONO_SIZE, WINDOW_WIDTH, WINDOW_PADDING_X } from "./devText";

type DiffLine = { text: string; kind?: "added" | "removed" | "context" };

type CodeDiffProps = {
  filename?: string;
  lines: DiffLine[];
};

const LINE_STAGGER = 10;
const LINE_REVEAL = 8;


const ADDED = "#4ADE80";
const REMOVED = "#FF6B6B";

const styleFor = (kind: DiffLine["kind"]) => {
  if (kind === "added") return { color: ADDED, background: "rgba(74,222,128,0.10)", sign: "+" };
  if (kind === "removed") return { color: REMOVED, background: "rgba(255,107,107,0.10)", sign: "-" };
  return { color: colors.textSecondary, background: "transparent", sign: " " };
};

/**
 * An added/removed diff — the one visual that makes "the AI changed files you
 * never asked it to touch" concrete. Lines reveal in sequence so the viewer
 * reads the damage rather than seeing a wall of code.
 */
export const CodeDiff: React.FC<CodeDiffProps> = ({ filename, lines }) => {
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
      {filename ? (
        <div
          style={{
            padding: "18px 26px",
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`,
            fontFamily: fontFamilies.clashMedium,
            fontSize: 28,
            color: colors.textSecondary,
          }}
        >
          {filename}
        </div>
      ) : null}

      <div style={{ padding: "22px 0" }}>
        {lines.map((line, index) => {
          const delay = index * LINE_STAGGER;
          const opacity = interpolate(frame - delay, [0, LINE_REVEAL], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateX = interpolate(frame - delay, [0, LINE_REVEAL], [-20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const s = styleFor(line.kind);

          return (
            <div
              key={index}
              style={{
                opacity,
                transform: `translateX(${translateX}px)`,
                backgroundColor: s.background,
                color: s.color,
                padding: `8px ${WINDOW_PADDING_X}px`,
                display: "flex",
                gap: 16,
                fontFamily: MONO_FONT,
                fontSize: MONO_SIZE,
                lineHeight: 1.3,
                whiteSpace: "pre",
              }}
            >
              <span style={{ opacity: 0.8 }}>{s.sign}</span>
              <span>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
