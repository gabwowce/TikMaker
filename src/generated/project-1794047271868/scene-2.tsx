import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { EASE_INOUT, GREY, PHONE2, Phone, Pipeline, SETUP_Y, STATIONS, Stage, TILE, Token, clamp, popScale, prog, stationX, type Pt } from "./shared";

export const description =
  "Five icon stations – idea, hooks, script, scenes, play – draw themselves along one pipe that bends down into an empty phone, and an orange dot runs the whole way into it";

export const schema = z.object({
  drawOn: field.word("Pipe finishes on", "pipeline"),
  flowOn: field.word("Dot starts on", "sentence"),
  arriveOn: field.word("Dot reaches the phone on", "video"),
});
type Params = z.infer<typeof schema>;

// the bend that leads into the phone
const BEND_Y = 795;
const X_END = stationX(STATIONS - 1);

// a point on the route: stations 0→4, down, left into the phone (t 0..1)
function route(t: number): Pt {
  const a = X_END - stationX(0); // along the stations
  const b = BEND_Y - SETUP_Y; // down
  const c = X_END - (PHONE2.x + PHONE2.w); // left
  const d = t * (a + b + c);
  if (d <= a) return { x: stationX(0) + d, y: SETUP_Y };
  if (d <= a + b) return { x: X_END, y: SETUP_Y + (d - a) };
  return { x: X_END - (d - a - b), y: BEND_Y };
}

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const drawEnd = Math.max(16, wordFrame(words, params.drawOn, 18) + 6);
  const draw = interpolate(frame, [0, drawEnd], [0, 1], { ...clamp, easing: EASE_INOUT });
  const bend = prog(frame, drawEnd - 2, 12);
  const phoneAt = drawEnd + 6;
  const flowAt = Math.max(phoneAt + 6, wordFrame(words, params.flowOn, 49) - 2);
  const arriveAt = Math.max(flowAt + 10, wordFrame(words, params.arriveOn, 67) - 2);
  const t = interpolate(frame, [flowAt, arriveAt], [0, 1], { ...clamp, easing: EASE_INOUT });
  const tokenOn = frame >= flowAt && frame < arriveAt + 4;
  const hot = prog(frame, arriveAt, 8);

  // the bend: down from the last station, then left to the phone
  const downLen = BEND_Y - (SETUP_Y + TILE / 2);
  const leftLen = X_END - (PHONE2.x + PHONE2.w);
  const downP = interpolate(bend, [0, 0.55], [0, 1], clamp);
  const leftP = interpolate(bend, [0.55, 1], [0, 1], clamp);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <div style={{ position: "absolute", left: X_END - 5, top: SETUP_Y + TILE / 2, width: 10, height: downLen * downP + 5, borderRadius: 5, background: GREY }} />
        <div style={{ position: "absolute", left: X_END - leftLen * leftP, top: BEND_Y - 5, width: leftLen * leftP, height: 10, borderRadius: 5, background: GREY }} />
        <Pipeline y={SETUP_Y} draw={draw} />
        {frame >= phoneAt ? (
          <Phone
            frame={frame}
            {...PHONE2}
            lit={0}
            hot={hot}
            style={{ scale: `${popScale(frame, phoneAt)}`, opacity: prog(frame, phoneAt, 6) }}
          />
        ) : null}
        {tokenOn ? <Token p={route(t)} opacity={interpolate(frame, [arriveAt, arriveAt + 4], [1, 0], clamp)} /> : null}
      </Stage>
    </AbsoluteFill>
  );
}
