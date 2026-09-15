import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../typography/tokens";
import { MONO_SIZE } from "./devText";
type TerminalLine = {
  text: string;
  kind?: "prompt" | "output" | "accent" | "dim";
};
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
export function Terminal({
  title = "terminal",
  lines,
  cursor = true,
}: TerminalProps) {
  const frame = useCurrentFrame();
  return (
    <div className="w-[820px] rounded-[20px] overflow-hidden bg-[#0E0E0E] [border:1px_solid_rgba(255,255,255,0.10)] [box-shadow:0_24px_60px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-3.5 p-[18px_24px] bg-brand-surface [border-bottom:1px_solid_rgba(255,255,255,0.10)]">
        {["#FF5F57", "#FEBC2E", "#28C840"].map((dot) => (
          <div
            key={dot}
            className="w-4 h-4 rounded-[50%]"
            style={{
              backgroundColor: dot,
            }}
          />
        ))}
        <div className="ml-2 [font-family:ClashDisplay-Medium] text-[28px] text-brand-muted">
          {title}
        </div>
      </div>

      <div className="p-[28px_30px] flex flex-col gap-4">
        {lines.map((line, index) => {
          const delay = index * LINE_STAGGER;
          const opacity = interpolate(frame - delay, [0, LINE_REVEAL], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const isLast = index === lines.length - 1;
          const showCursor =
            cursor &&
            isLast &&
            frame >= delay &&
            Math.floor((frame - delay) / 15) % 2 === 0;
          return (
            <div
              key={index}
              className={`flex items-center gap-3 [font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[34px] [line-height:1.25] whitespace-pre`}
              style={{
                opacity,
                color: lineColor[line.kind ?? "output"],
              }}
            >
              {line.kind === "prompt" ? (
                <span className="text-brand-accent">❯</span>
              ) : null}
              <span>{line.text}</span>
              {showCursor ? (
                <span
                  className="inline-block w-4.5 bg-brand-accent"
                  style={{
                    height: MONO_SIZE * 0.9,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
