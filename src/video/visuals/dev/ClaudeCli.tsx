import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors } from "../../typography/tokens";
import { MONO_FONT, MONO_SIZE, WINDOW_WIDTH, WINDOW_PADDING_X } from "./devText";

export type CliTranscriptLine = { text: string; kind?: "user" | "tool" | "result" | "dim" };
export type CliOverlayItem = { text: string; selected?: boolean };

export type ClaudeCliProps = {
  /** Conversation above the input box. */
  transcript?: CliTranscriptLine[];
  /** What's typed in the prompt box right now. */
  input?: string;
  /** Status line under the box — the real CLI shows the permission mode here. */
  mode?: string;
  /** Highlight the mode line (used when the shortcut just changed it). */
  modeActive?: boolean;
  /** A menu floating over the box — the rewind picker, history search, etc. */
  overlay?: { title: string; items: CliOverlayItem[] };
};

const lineColor: Record<NonNullable<CliTranscriptLine["kind"]>, string> = {
  user: colors.textPrimary,
  tool: colors.accent,
  result: colors.textSecondary,
  dim: "rgba(184,184,184,0.45)",
};

const REVEAL = 8;
const STAGGER = 7;

/**
 * A mock of the Claude Code TUI — prompt box, permission-mode line, and an
 * optional menu overlay. This exists so a scene can show the RESULT of a
 * shortcut (the rewind picker opening, the mode flipping to plan) rather than
 * just naming it; pair two of these through a `transform` visual to show the
 * before and after of one keypress.
 */
export const ClaudeCli: React.FC<ClaudeCliProps> = ({
  transcript = [],
  input,
  mode,
  modeActive,
  overlay,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: WINDOW_WIDTH,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        fontFamily: MONO_FONT,
        fontSize: MONO_SIZE,
        lineHeight: 1.3,
      }}
    >
      {transcript.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 4 }}>
          {transcript.map((line, index) => {
            const opacity = interpolate(frame - index * STAGGER, [0, REVEAL], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={index}
                style={{ opacity, color: lineColor[line.kind ?? "result"], whiteSpace: "pre" }}
              >
                {line.kind === "user" ? <span style={{ color: colors.accent }}>{"> "}</span> : null}
                {line.text}
              </div>
            );
          })}
        </div>
      ) : null}

      {overlay ? (
        <Overlay overlay={overlay} frame={frame} />
      ) : (
        <div
          style={{
            border: `2px solid ${colors.border}`,
            borderRadius: 14,
            padding: `26px ${WINDOW_PADDING_X}px`,
            backgroundColor: "#111111",
            color: input ? colors.textPrimary : "rgba(184,184,184,0.35)",
            whiteSpace: "pre",
            overflow: "hidden",
          }}
        >
          <span style={{ color: colors.accent }}>{"> "}</span>
          {input ?? "try \"how does auth work?\""}
        </div>
      )}

      {mode ? (
        <div
          style={{
            paddingLeft: 6,
            fontSize: MONO_SIZE * 0.85,
            color: modeActive ? colors.accent : "rgba(184,184,184,0.5)",
            whiteSpace: "pre",
          }}
        >
          {modeActive ? "⏵⏵ " : "  "}
          {mode}
        </div>
      ) : null}
    </div>
  );
};

const Overlay: React.FC<{ overlay: NonNullable<ClaudeCliProps["overlay"]>; frame: number }> = ({
  overlay,
  frame,
}) => (
  <div
    style={{
      border: `2px solid ${colors.accent}`,
      borderRadius: 14,
      backgroundColor: "#141414",
      overflow: "hidden",
      boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    }}
  >
    <div
      style={{
        padding: `18px ${WINDOW_PADDING_X}px`,
        borderBottom: `1px solid ${colors.border}`,
        color: colors.accent,
        fontSize: MONO_SIZE * 0.85,
        whiteSpace: "pre",
      }}
    >
      {overlay.title}
    </div>
    {overlay.items.map((item, index) => {
      const opacity = interpolate(frame - index * STAGGER, [0, REVEAL], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return (
        <div
          key={index}
          style={{
            opacity,
            padding: `14px ${WINDOW_PADDING_X}px`,
            backgroundColor: item.selected ? "rgba(255,112,36,0.16)" : "transparent",
            color: item.selected ? colors.textPrimary : colors.textSecondary,
            whiteSpace: "pre",
          }}
        >
          {item.selected ? "❯ " : "  "}
          {item.text}
        </div>
      );
    })}
  </div>
);
