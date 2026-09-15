import { interpolate, useCurrentFrame } from "remotion";
import { colors } from "../../typography/tokens";
type DiffLine = {
  text: string;
  kind?: "added" | "removed" | "context";
};
type CodeDiffProps = {
  filename?: string;
  lines: DiffLine[];
};
const LINE_STAGGER = 10;
const LINE_REVEAL = 8;
const ADDED = "#4ADE80";
const REMOVED = "#FF6B6B";
function styleFor(kind: DiffLine["kind"]) {
  if (kind === "added")
    return { color: ADDED, background: "rgba(74,222,128,0.10)", sign: "+" };
  if (kind === "removed")
    return { color: REMOVED, background: "rgba(255,107,107,0.10)", sign: "-" };
  return { color: colors.textSecondary, background: "transparent", sign: " " };
}
export function CodeDiff({ filename, lines }: CodeDiffProps) {
  const frame = useCurrentFrame();
  return (
    <div className="w-[820px] rounded-[20px] overflow-hidden bg-[#0E0E0E] [border:1px_solid_rgba(255,255,255,0.10)] [box-shadow:0_24px_60px_rgba(0,0,0,0.55)]">
      {filename ? (
        <div className="p-[18px_26px] bg-brand-surface [border-bottom:1px_solid_rgba(255,255,255,0.10)] [font-family:ClashDisplay-Medium] text-[28px] text-brand-muted">
          {filename}
        </div>
      ) : null}

      <div className="p-[22px_0]">
        {lines.map((line, index) => {
          const delay = index * LINE_STAGGER;
          const opacity = interpolate(frame - delay, [0, LINE_REVEAL], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const translateX = interpolate(
            frame - delay,
            [0, LINE_REVEAL],
            [-20, 0],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );
          const s = styleFor(line.kind);
          return (
            <div
              key={index}
              className={`bg-[rgba(74,222,128,0.10)] text-[#4ADE80] p-[8px_30px] flex gap-4 [font-family:ui-monospace,_SFMono-Regular,_Menlo,_monospace] text-[34px] [line-height:1.3] whitespace-pre`}
              style={{
                opacity,
                transform: `translateX(${translateX}px)`,
              }}
            >
              <span className="opacity-[0.8]">{s.sign}</span>
              <span>{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
