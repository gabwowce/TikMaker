import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../typography/tokens";
import { MONO_SIZE } from "./devText";
export type CliTranscriptLine = {
  text: string;
  kind?: "user" | "tool" | "result" | "dim";
};
export type CliOverlayItem = {
  text: string;
  selected?: boolean;
};
export type ClaudeCliProps = {
  transcript?: CliTranscriptLine[];
  input?: string;
  mode?: string;
  modeActive?: boolean;
  overlay?: {
    title: string;
    items: CliOverlayItem[];
  };
};
const lineColor: Record<NonNullable<CliTranscriptLine["kind"]>, string> = {
  user: colors.textPrimary,
  tool: colors.accent,
  result: colors.textSecondary,
  dim: "rgba(184,184,184,0.45)",
};
const REVEAL = 8;
const STAGGER = 7;
export function ClaudeCli({
  transcript = [],
  input,
  mode,
  modeActive,
  overlay,
}: ClaudeCliProps) {
  const frame = useCurrentFrame();
  return (
    <div className="w-[820px] flex flex-col gap-5 [font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[34px] [line-height:1.3]">
      {transcript.length > 0 ? (
        <div className="flex flex-col gap-3 pl-1">
          {transcript.map((line, index) => {
            const opacity = interpolate(
              frame - index * STAGGER,
              [0, REVEAL],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            return (
              <div
                key={index}
                className={`whitespace-pre`}
                style={{
                  opacity,
                  color: lineColor[line.kind ?? "result"],
                }}
              >
                {line.kind === "user" ? (
                  <span className="text-brand-accent">{"> "}</span>
                ) : null}
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
          className={`[border:2px_solid_rgba(255,255,255,0.10)] rounded-[14px] p-[26px_30px] bg-[#111111] whitespace-pre overflow-hidden ${input ? "text-brand-text" : "text-[rgba(184,184,184,0.35)]"}`}
        >
          <span className="text-brand-accent">{"> "}</span>
          {input ?? 'try "how does auth work?"'}
        </div>
      )}

      {mode ? (
        <div
          className={`pl-1.5 whitespace-pre ${modeActive ? "text-brand-accent" : "text-[rgba(184,184,184,0.5)]"}`}
          style={{
            fontSize: MONO_SIZE * 0.85,
          }}
        >
          {modeActive ? "⏵⏵ " : "  "}
          {mode}
        </div>
      ) : null}
    </div>
  );
}
type OverlayProps = {
  overlay: NonNullable<ClaudeCliProps["overlay"]>;
  frame: number;
};
function Overlay({ overlay, frame }: OverlayProps) {
  return (
    <div className="[border:2px_solid_#FF7024] rounded-[14px] bg-[#141414] overflow-hidden [box-shadow:0_20px_50px_rgba(0,0,0,0.6)]">
      <div
        className="p-[18px_30px] [border-bottom:1px_solid_rgba(255,255,255,0.10)] text-brand-accent whitespace-pre"
        style={{
          fontSize: MONO_SIZE * 0.85,
        }}
      >
        {overlay.title}
      </div>
      {overlay.items.map((item, index) => {
        const opacity = interpolate(
          frame - index * STAGGER,
          [0, REVEAL],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        return (
          <div
            key={index}
            className={`p-[14px_30px] ${item.selected ? "bg-[rgba(255,112,36,0.16)]" : "bg-transparent"} ${item.selected ? "text-brand-text" : "text-brand-muted"} whitespace-pre`}
            style={{
              opacity,
            }}
          >
            {item.selected ? "❯ " : "  "}
            {item.text}
          </div>
        );
      })}
    </div>
  );
}
