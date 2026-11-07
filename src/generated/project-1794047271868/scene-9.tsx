import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { EASE_INOUT, Phone, Pipeline, Stage, TOP_Y, Token, clamp, mix, popScale, prog, stationX } from "./shared";

export const description =
  "An orange dot runs through all five checked stations and shoots out of the play station into a big phone, which lights up playing the finished video";

export const schema = z.object({
  runOn: field.word("Dot starts on", "sentence"),
  landOn: field.word("Phone plays on", "finished"),
});
type Params = z.infer<typeof schema>;

const PHONE = { x: 375, y: 450, w: 330, h: 600 };

export default function Scene9({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const runAt = wordFrame(words, params.runOn, 6) - 2;
  const landAt = Math.max(runAt + 16, wordFrame(words, params.landOn, 31) - 2);
  const outAt = runAt + Math.round((landAt - runAt) * 0.6);
  const run = interpolate(frame, [runAt, outAt], [0, 1], { ...clamp, easing: EASE_INOUT });
  const shoot = interpolate(frame, [outAt, landAt], [0, 1], { ...clamp, easing: EASE_INOUT });
  const tokenOn = frame >= runAt && frame < landAt + 3;

  // along the stations, then an arc from the play station into the screen
  const p =
    frame < outAt
      ? { x: mix(stationX(0), stationX(4), run), y: TOP_Y }
      : { x: mix(stationX(4), PHONE.x + PHONE.w / 2, shoot), y: mix(TOP_Y, PHONE.y + PHONE.h * 0.45, shoot) - Math.sin(shoot * Math.PI) * 120 };
  const playHot = interpolate(frame, [outAt - 6, outAt, outAt + 8], [0, 1, 0], clamp);
  const lit = prog(frame, landAt, 8);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Pipeline y={TOP_Y} active={playHot > 0.01 ? 4 : -1} hot={playHot} allDone />
        <Phone
          frame={frame}
          {...PHONE}
          lit={lit}
          hot={lit}
          style={{ scale: `${popScale(frame, 0, 0.92) * interpolate(frame, [landAt, landAt + 5, landAt + 11], [1, 1.04, 1], clamp)}` }}
        />
        {tokenOn ? <Token p={p} size={mix(60, 40, shoot)} opacity={interpolate(frame, [landAt, landAt + 3], [1, 0], clamp)} /> : null}
      </Stage>
    </AbsoluteFill>
  );
}
