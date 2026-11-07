import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { BUBBLE, bounceIn, clamp, EASE_INOUT, IdeaBubble, PHONE, Phone, Pipe, pipePoint, popScale, prog, Rail, Stage, Token } from "./shared";

export const description =
  "An idea bubble with one orange sentence sends a glowing token down a curved pipe into a big phone that starts playing a finished video; six stations pop onto the pipe";

export const schema = z.object({
  bubbleOn: field.word("Bubble appears on", "sentence"),
  phoneOn: field.word("Phone lands on", "finished"),
  stationsOn: field.word("Stations pop on", "step"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const bubbleAt = Math.max(0, wordFrame(words, params.bubbleOn, 6) - 4);
  const phoneAt = wordFrame(words, params.phoneOn, 29) - 3;
  const stationsAt = wordFrame(words, params.stationsOn, 78) - 3;

  // the token leaves the bubble and runs the pipe, arriving as the phone lands
  const runFrom = bubbleAt + 10;
  const runTo = phoneAt + 2;
  const run = interpolate(frame, [runFrom, runTo], [0, 1], { ...clamp, easing: EASE_INOUT });
  const draw = interpolate(frame, [bubbleAt + 4, runTo], [0, 1], { ...clamp, easing: EASE_INOUT });
  const arrived = frame >= runTo;
  const phoneIn = prog(frame, phoneAt - 4, 14);
  const lit = prog(frame, runTo, 8);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Pipe draw={draw} glow={interpolate(frame, [runTo, runTo + 20], [1, 0.12], clamp)} />
        <Rail morph={0} done={0} active={-1} appear={(i) => bounceIn(frame, stationsAt + i * 3, 10)} />
        <IdeaBubble
          hot={interpolate(frame, [runFrom, runFrom + 8], [1, 0], clamp)}
          style={{ scale: `${popScale(frame, bubbleAt, 0.8)}`, opacity: prog(frame, bubbleAt, 6), transformOrigin: `0px ${BUBBLE.h}px` }}
        />
        <Phone
          frame={Math.max(0, frame - runTo)}
          {...PHONE}
          lit={lit}
          hot={lit * (0.7 + 0.3 * Math.sin(frame / 8))}
          style={{ opacity: phoneIn, translate: `${(1 - phoneIn) * 160}px 0px`, scale: `${0.92 + 0.08 * phoneIn}` }}
        />
        {!arrived && frame >= runFrom ? <Token p={pipePoint(run)} /> : null}
      </Stage>
    </AbsoluteFill>
  );
}
