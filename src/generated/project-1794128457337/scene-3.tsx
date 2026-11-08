import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { AgentPanel, Bar, Check, GREY, PanelCard, Stage, StepPill, TemplateIcon, popScale, prog, pulse, LIGHT } from "./shared";

export const description =
  "The agent panel: the first two progress dots tick off, and an orange template card pops into the conversation";

export const schema = z.object({
  step: field.number("Step number", 1, { min: 1, max: 9 }),
  ticksOn: field.word("Progress ticks on", "agent"),
  cardOn: field.word("Template card appears on", "template"),
});
type Params = z.infer<typeof schema>;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const tickAt = wordFrame(words, params.ticksOn, 18) - 6;
  const cardAt = wordFrame(words, params.cardOn, 36) - 3;

  // Idea ticks first, then Angle
  const done = prog(frame, tickAt, 8) + prog(frame, tickAt + 10, 8);
  const card = prog(frame, cardAt, 12);
  const hot = card * (0.75 + 0.25 * pulse(frame));

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <StepPill n={params.step} />
        <AgentPanel frame={frame} done={done} active={done >= 2 ? 2 : Math.floor(done)}>
          {/* the idea, as the first message – dimmed, it is not the point */}
          <div style={{ position: "absolute", right: 60, top: 50, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 16, opacity: 0.45 }}>
            <div style={{ padding: "26px 30px", borderRadius: 26, background: "#2c2f36", display: "flex", flexDirection: "column", gap: 16, width: 470, boxSizing: "border-box" }}>
              <Bar w="100%" h={22} color="#4a4d55" />
              <Bar w="70%" h={22} color="#4a4d55" />
            </div>
          </div>
          {/* the chosen template */}
          <div
            style={{
              position: "absolute",
              left: 60,
              top: 260,
              opacity: card,
              scale: `${popScale(frame, cardAt)}`,
              translate: `0px ${(1 - card) * 40}px`,
            }}
          >
            <PanelCard
              height={190}
              hot={hot}
              bars={[0.7, 0.5, 0.35]}
              icon={<TemplateIcon size={110} color={c.bg} />}
              right={
                <div
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 33,
                    background: LIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    scale: `${interpolate(frame, [cardAt + 10, cardAt + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}`,
                  }}
                >
                  <Check size={40} color={c.bg} t={prog(frame, cardAt + 12, 8)} />
                </div>
              }
            />
          </div>
          {/* two other templates it did not pick, dim, below */}
          <div style={{ position: "absolute", left: 60, top: 490, display: "flex", gap: 24, opacity: 0.3 * card }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ width: 328, height: 60, borderRadius: 20, background: "#24262c", display: "flex", alignItems: "center", padding: "0 24px", gap: 18 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: GREY }} />
                <Bar w={180} h={18} />
              </div>
            ))}
          </div>
        </AgentPanel>
      </Stage>
    </AbsoluteFill>
  );
}
