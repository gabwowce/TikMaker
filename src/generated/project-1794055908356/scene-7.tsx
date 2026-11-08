import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, clamp, EASE_OUT, GlobeIcon, GREY, GREY_HI, IconChip, LIGHT, popScale, prog, SheetIcon, Stage, StepPill, Terminal } from "./shared";

export const description =
  "A globe and a Google Sheets icon slide in from both sides and plug into the Claude Code terminal with a cable each, each lighting orange as it connects";

export const schema = z.object({
  step: field.number("Step number", 4, { min: 1, max: 9 }),
  webOn: field.word("Web plugs in on", "web"),
  sheetOn: field.word("Sheet plugs in on", "google"),
});
type Params = z.infer<typeof schema>;

const TERM = { x: 240, y: 660, w: 600, h: 380 };
const CHIP = 210;
const TOOLS = [
  { cx: 280, cy: 430, port: { x: 420, y: TERM.y }, from: -1 },
  { cx: 800, cy: 430, port: { x: 660, y: TERM.y }, from: 1 },
];

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const at = [wordFrame(words, params.webOn, 76) - 2, wordFrame(words, params.sheetOn, 115) - 2];
  const termIn = popScale(frame, 2);
  const hotIdx = at.reduce((acc, a, i) => (frame >= a ? i : acc), -1);

  return (
    <AbsoluteFill>
      <StepPill n={params.step} frame={frame} />
      <Stage frame={frame} duration={durationInFrames}>
        <Terminal {...TERM} style={{ scale: `${termIn}`, opacity: prog(frame, 2, 6) }}>
          <div style={{ position: "absolute", left: 40, top: 50, display: "flex", flexDirection: "column", gap: 30 }}>
            <Bar w={360} h={22} color={GREY_HI} />
            <Bar w={260} h={22} color={GREY} />
            <Bar w={310} h={22} color={GREY} />
          </div>
        </Terminal>

        {/* cables */}
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          {TOOLS.map((t, i) => {
            const draw = interpolate(frame, [at[i] - 4, at[i] + 6], [0, 1], { ...clamp, easing: EASE_OUT });
            const x0 = t.cx;
            const y0 = t.cy + CHIP / 2;
            const d = `M ${x0} ${y0} C ${x0} ${y0 + 110}, ${t.port.x} ${t.port.y - 110}, ${t.port.x} ${t.port.y}`;
            const len = 360;
            const hot = hotIdx === i;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={hot ? c.accent : GREY_HI}
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - draw)}
                style={hot ? { filter: `drop-shadow(0 0 10px ${c.accent}aa)` } : undefined}
              />
            );
          })}
        </svg>

        {/* ports on the terminal: they click when the plug lands */}
        {TOOLS.map((t, i) => {
          const click = bounceIn(frame, at[i] + 6, 8);
          const hot = hotIdx === i;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: t.port.x - 26,
                top: t.port.y - 26,
                width: 52,
                height: 52,
                borderRadius: 16,
                background: frame >= at[i] + 6 ? (hot ? c.accent : GREY_HI) : "#2a2a32",
                border: `4px solid ${GREY}`,
                boxSizing: "border-box",
                scale: `${0.8 + click * 0.2}`,
                opacity: termIn > 0.5 ? 1 : 0,
              }}
            />
          );
        })}

        {/* the two tools sliding in */}
        {TOOLS.map((t, i) => {
          const slide = interpolate(frame, [at[i] - 14, at[i] - 2], [1, 0], { ...clamp, easing: EASE_OUT });
          const hot = hotIdx === i ? 1 : 0;
          return (
            <IconChip
              key={i}
              size={CHIP}
              hot={hot}
              style={{
                position: "absolute",
                left: t.cx - CHIP / 2,
                top: t.cy - CHIP / 2,
                translate: `${t.from * slide * 600}px 0px`,
                opacity: frame < at[i] - 14 ? 0 : 1,
              }}
            >
              {i === 0 ? <GlobeIcon size={CHIP * 0.6} color={hot ? c.bg : LIGHT} /> : <SheetIcon size={CHIP * 0.62} hot={0} />}
            </IconChip>
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
