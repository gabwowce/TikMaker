import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { clamp, Clip, EASE_OUT, prog, pulse, Stage } from "./shared";

export const description =
  "One flat grey screen recording gets flicked past by a swiping thumb, then the same frame bursts into orange colour and moving shapes";

export const schema = z.object({
  flickOn: field.word("Thumb flicks past on", "flat"),
  burstOn: field.word("Bursts into motion on", "motion"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const flickAt = wordFrame(words, params.flickOn, 37) - 8;
  const burstAt = wordFrame(words, params.burstOn, 61) - 3;

  // the swipe: thumb travels up, the card is dragged up and snaps back
  const swipe = interpolate(frame, [flickAt, flickAt + 16], [0, 1], { ...clamp, easing: EASE_OUT });
  const drag = interpolate(frame, [flickAt, flickAt + 7, flickAt + 20], [0, -90, 0], { ...clamp, easing: EASE_OUT });
  const thumbOp = interpolate(frame, [flickAt - 2, flickAt + 2, flickAt + 13, flickAt + 18], [0, 0.55, 0.55, 0], clamp);

  const burst = prog(frame, burstAt, 14);
  const punch = interpolate(frame, [burstAt, burstAt + 7, burstAt + 16], [1, 1.07, 1.02], { ...clamp, easing: EASE_OUT });

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Clip
          frame={frame}
          s={punch}
          look={{ hot: burst }}
          glow={burst * (0.6 + 0.4 * pulse(frame))}
          style={{
            translate: `0px ${drag}px`,
            opacity: interpolate(burst, [0, 1], [0.55, 1]),
            filter: `grayscale(${1 - burst})`,
          }}
        />
        {/* the thumb swiping past */}
        {/* trail behind the touch */}
        <div
          style={{
            position: "absolute",
            left: 690 - 22,
            top: interpolate(swipe, [0, 1], [1000, 460]) + 45,
            width: 44,
            height: interpolate(swipe, [0, 0.4, 1], [0, 260, 120], clamp),
            borderRadius: 22,
            background: "linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0))",
            opacity: thumbOp,
          }}
        />
        {/* the touch */}
        <div
          style={{
            position: "absolute",
            left: 690 - 45,
            top: interpolate(swipe, [0, 1], [1000, 460]),
            width: 90,
            height: 90,
            borderRadius: 45,
            background: "rgba(255,255,255,0.85)",
            border: "6px solid rgba(255,255,255,0.35)",
            backgroundClip: "padding-box",
            opacity: thumbOp,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        />
      </Stage>
    </AbsoluteFill>
  );
}
