import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { clamp, Clip, CLIP_H, CLIP_W, DrawPath, EASE_OUT, INK, prog, Stage, StylePill } from "./shared";

export const description =
  "Style pill '03 Sketch'; the clip turns whiteboard white and a hand-drawn orange arrow and circle draw themselves onto its button, then little ink doodles";

export const schema = z.object({
  number: field.text("Number", "03"),
  name: field.text("Style name", "Sketch"),
  whiteOn: field.word("Turns whiteboard white on", "sketch"),
  arrowOn: field.word("Arrow draws on", "arrows"),
  circleOn: field.word("Circle draws on", "circles"),
  doodlesOn: field.word("Doodles draw on", "doodles"),
});
type Params = z.infer<typeof schema>;

const ARROW = "M 70 452 C 190 486, 360 488, 506 428";
const ARROW_HEAD = "M 468 414 L 510 427 L 480 458";
const CIRCLE = "M 512 398 C 540 352, 716 348, 734 404 C 748 458, 566 482, 512 446 C 490 428, 502 404, 548 392";
const SQUIGGLE = "M 200 326 q 20 -14 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0";
const STAR = "M 662 278 L 674 304 L 702 306 L 680 324 L 688 352 L 662 336 L 638 352 L 646 324 L 624 306 L 652 304 Z";
const SPARK = "M 676 116 L 690 88 M 684 142 L 712 134 M 660 102 L 662 72";

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const numAt = wordFrame(words, params.number, 33) - 3;
  const nameAt = wordFrame(words, params.whiteOn, 56) - 3;
  const whiteAt = nameAt;
  const arrowAt = wordFrame(words, params.arrowOn, 82) - 3;
  const circleAt = wordFrame(words, params.circleOn, 95) - 3;
  const doodleAt = wordFrame(words, params.doodlesOn, 114) - 3;

  const light = prog(frame, whiteAt, 12);
  const arrow = prog(frame, arrowAt, 14);
  const head = prog(frame, arrowAt + 12, 5);
  const circle = prog(frame, circleAt, 16);
  const squiggle = prog(frame, doodleAt, 14);
  const star = prog(frame, doodleAt + 8, 14);
  const spark = prog(frame, doodleAt + 18, 8);
  const flip = interpolate(frame, [whiteAt, whiteAt + 6, whiteAt + 14], [1, 1.04, 1], { ...clamp, easing: EASE_OUT });

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <StylePill
          n={params.number}
          label={params.name}
          labelIn={prog(frame, nameAt, 12)}
          numIn={interpolate(frame, [numAt, numAt + 5, numAt + 12], [1, 1.25, 1], clamp)}
        />
        <Clip frame={frame} s={flip} look={{ hot: 0, light, btnHot: 0 }}>
          <svg width={CLIP_W} height={CLIP_H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <DrawPath d={SQUIGGLE} t={squiggle} color={INK} width={7} />
            <DrawPath d={STAR} t={star} color={INK} width={7} />
            <DrawPath d={SPARK} t={spark} color={INK} width={7} />
            <DrawPath d={ARROW} t={arrow} color={c.accent} width={12} />
            <DrawPath d={ARROW_HEAD} t={head} color={c.accent} width={12} />
            <DrawPath d={CIRCLE} t={circle} color={c.accent} width={12} />
          </svg>
        </Clip>
      </Stage>
    </AbsoluteFill>
  );
}
