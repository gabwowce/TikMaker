import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { BUBBLE, EASE_INOUT, IdeaBubble, PHONE, Phone, Pipe, PipeStations, Stage, Token, bounce, clamp, pipePoint, popScale, prog } from "./shared";

export const description =
  "A one-line idea bubble shoots an orange token down a glowing pipe into a big phone that lights up playing a finished video; six step dots appear along the pipe";

export const schema = z.object({
  flowsOn: field.word("Token leaves the bubble on", "in"),
  landsOn: field.word("Phone lights up on", "TikTok"),
  stepsOn: field.word("Step dots appear on", "every"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const leave = wordFrame(words, params.flowsOn, 17) - 3;
  const land = Math.max(leave + 10, wordFrame(words, params.landsOn, 38) - 2);
  const steps = wordFrame(words, params.stepsOn, 69) - 3;

  const bubbleHot = interpolate(frame, [2, 8, leave, leave + 8], [0, 1, 1, 0], clamp);
  const travel = interpolate(frame, [leave, land], [0, 1], { ...clamp, easing: EASE_INOUT });
  const tokenOn = frame >= leave && frame < land + 2 ? 1 : 0;
  const phoneHot = interpolate(frame, [land - 1, land + 4, steps, steps + 10], [0, 1, 1, 0.35], clamp);
  const phoneLit = interpolate(frame, [land - 1, land + 6], [0.25, 1], clamp);
  const phoneIn = popScale(frame, 3);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Pipe draw={travel} glow={interpolate(frame, [steps, steps + 10], [1, 0.8], clamp)} />
        <PipeStations appear={(i) => bounce(frame, steps + i * 3, 9)} />
        <IdeaBubble hot={bubbleHot} style={{ scale: `${popScale(frame, 0)}`, transformOrigin: `${BUBBLE.w * 0.2}px ${BUBBLE.h}px` }} />
        <Phone
          frame={frame}
          {...PHONE}
          lit={phoneLit}
          hot={phoneHot}
          style={{ scale: `${phoneIn}`, opacity: prog(frame, 3, 8) }}
        />
        <Token p={pipePoint(travel)} size={56} opacity={tokenOn} />
      </Stage>
    </AbsoluteFill>
  );
}
