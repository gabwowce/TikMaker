import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Badge, Bar, clamp, EASE_INOUT, GREY, GREY_HI, mix, popScale, prog, PromptLine, Stage, StepPill, Terminal } from "./shared";

export const description =
  "A Claude Code terminal opens and an orange prompt line types out; the line flies down into the empty ID badge, which now reads 'Content Strategist'";

export const schema = z.object({
  step: field.number("Step number", 2, { min: 1, max: 9 }),
  title: field.text("Badge title", "Content Strategist"),
  openOn: field.word("Terminal opens on", "open"),
  typeOn: field.word("Prompt typed from", "you"),
  landOn: field.word("Title lands on", "strategist"),
});
type Params = z.infer<typeof schema>;

const TERM = { x: 90, y: 300, w: 900, h: 270 };
const BADGE_POS = { x: 160, y: 670, w: 760, h: 390 };
const LINE_W = 600;

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const openAt = wordFrame(words, params.openOn, 20) - 3;
  const typeAt = wordFrame(words, params.typeOn, 94) - 2;
  const landWord = wordFrame(words, params.landOn, 118);
  const flyAt = landWord + 4;
  const landAt = flyAt + 12;

  const termIn = popScale(frame, openAt, 0.85);
  const typed = interpolate(frame, [typeAt, landWord + 6], [0, 1], clamp);
  const flying = interpolate(frame, [flyAt, landAt], [0, 1], { ...clamp, easing: EASE_INOUT });
  const titleIn = prog(frame, landAt - 2, 8);
  const badgeHot = prog(frame, landAt, 6);
  const sent = frame >= flyAt;

  // the line's start (in the terminal) and its target (the badge's title slot)
  const fromX = TERM.x + 36 + 42;
  const fromY = TERM.y + 64 + 50;
  const toX = BADGE_POS.x + 60 + BADGE_POS.h * 0.5 + 50;
  const toY = BADGE_POS.y + 200;

  return (
    <AbsoluteFill>
      <StepPill n={params.step} frame={frame} />
      <Stage frame={frame} duration={durationInFrames}>
        <Terminal {...TERM} hot={typed > 0 && !sent ? 1 : 0} style={{ scale: `${termIn}`, opacity: prog(frame, openAt, 6) }}>
          <div style={{ position: "absolute", left: 36, top: 34, display: "flex", flexDirection: "column", gap: 34 }}>
            <PromptLine typed={sent ? 0 : typed} width={LINE_W} color={c.accent} frame={frame} />
            <div style={{ display: "flex", gap: 16, paddingLeft: 42, opacity: sent ? prog(frame, landAt, 8) : 0 }}>
              <Bar w={60} h={20} color={GREY_HI} />
              <Bar w={320} h={20} color={GREY} />
            </div>
          </div>
        </Terminal>

        <Badge
          {...BADGE_POS}
          title={params.title}
          titleIn={titleIn}
          hot={badgeHot * (1 - prog(frame, landAt + 24, 16) * 0.6)}
          style={{ opacity: prog(frame, 0, 6), scale: `${1 + interpolate(frame, [landAt, landAt + 5, landAt + 12], [0, 0.025, 0], clamp)}` }}
        />

        {/* the role line travelling from the prompt into the badge */}
        {flying > 0 && flying < 1 ? (
          <Bar
            w={mix(LINE_W, 380, flying)}
            h={mix(26, 40, flying)}
            color={c.accent}
            style={{
              position: "absolute",
              left: mix(fromX, toX, flying),
              top: mix(fromY, toY, flying) - Math.sin(flying * Math.PI) * 30,
              boxShadow: `0 0 30px ${c.accent}88`,
            }}
          />
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
