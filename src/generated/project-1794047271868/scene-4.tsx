import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  Button,
  EASE_INOUT,
  GREY_HI,
  LIGHT,
  PANEL,
  PANEL_SCALE,
  PANEL_Y,
  Pipeline,
  ScaleAt,
  Stage,
  TOP_Y,
  Token,
  alpha,
  cardStyle,
  clamp,
  lerpPt,
  mix,
  popScale,
  press,
  prog,
  stationPt,
} from "./shared";

export const description =
  "The pipeline rises to the top; below it one orange line types itself into an input box, the big 'Start' button is pressed and the line flies up into the first station";

export const schema = z.object({
  button: field.text("Button label", "Start"),
  typeOn: field.word("Typing starts on", "type"),
  typedBy: field.word("Typing done on", "idea"),
  hotOn: field.word("Button lights up on", "hit"),
  pressOn: field.word("Button pressed on", "Start"),
});
type Params = z.infer<typeof schema>;

const BOX = { x: 90, y: 500, w: 900, h: 190 };
const BTN = { w: 440, h: 150, y: 780 };
const LINE_W = 640;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const move = interpolate(frame, [0, 18], [0, 1], { ...clamp, easing: EASE_INOUT });
  const panelOut = interpolate(frame, [0, 8], [1, 0], clamp);
  const y = mix(PANEL_Y, TOP_Y, move);
  const s = mix(PANEL_SCALE, 1, move);

  const boxAt = 10;
  const typeAt = Math.max(boxAt + 4, wordFrame(words, params.typeOn, 18) - 2);
  const typedAt = Math.max(typeAt + 8, wordFrame(words, params.typedBy, 28) + 8);
  const typed = interpolate(frame, [typeAt, typedAt], [0, 1], clamp);
  const btnAt = typeAt + 4;
  const hotAt = Math.max(btnAt + 6, wordFrame(words, params.hotOn, 45) - 2);
  const pressAt = Math.max(hotAt + 3, wordFrame(words, params.pressOn, 50) - 1);
  const flyAt = pressAt + 2;
  const flyEnd = Math.min(durationInFrames - 8, flyAt + 14);
  const fly = interpolate(frame, [flyAt, flyEnd], [0, 1], { ...clamp, easing: EASE_INOUT });
  const arrived = prog(frame, flyEnd - 1, 6);
  const btnHot = frame >= hotAt && frame < flyAt + 4 ? 1 : 0;
  const lineHot = frame < hotAt;

  const from = { x: BOX.x + 60 + (LINE_W * typed) / 2, y: BOX.y + BOX.h / 2 };
  const to = stationPt(0, TOP_Y);
  const arc = Math.sin(fly * Math.PI) * -60;
  const tp = lerpPt(from, to, fly);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {panelOut > 0 ? (
          <div
            style={{
              position: "absolute",
              left: PANEL.x,
              top: PANEL.y,
              width: PANEL.w,
              height: PANEL.h,
              ...cardStyle(PANEL.w),
              border: `4px solid ${alpha(c.accent, 0.6)}`,
              opacity: panelOut,
              scale: `${mix(0.92, 1, panelOut)}`,
            }}
          />
        ) : null}
        <ScaleAt y={y} scale={s}>
          <Pipeline y={y} active={arrived > 0 ? 0 : -1} hot={arrived} dimRest={false} />
        </ScaleAt>

        {/* the idea box */}
        <div
          style={{
            position: "absolute",
            left: BOX.x,
            top: BOX.y,
            width: BOX.w,
            height: BOX.h,
            ...cardStyle(BOX.w),
            borderRadius: 40,
            scale: `${popScale(frame, boxAt)}`,
            opacity: prog(frame, boxAt, 6),
            display: "flex",
            alignItems: "center",
            paddingLeft: 60,
          }}
        >
          <Bar
            w={LINE_W * typed}
            h={44}
            color={lineHot ? c.accent : GREY_HI}
            style={{ opacity: frame >= flyAt ? 0.35 : 1, boxShadow: lineHot ? `0 0 26px ${alpha(c.accent, 0.45)}` : undefined }}
          />
          <div
            style={{
              width: 8,
              height: 70,
              borderRadius: 4,
              marginLeft: 12,
              background: LIGHT,
              opacity: frame >= typeAt && frame < hotAt && Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
            }}
          />
        </div>

        <Button
          label={params.button}
          w={BTN.w}
          h={BTN.h}
          hot={btnHot}
          scale={popScale(frame, btnAt) * press(frame, pressAt)}
          style={{ position: "absolute", left: (1080 - BTN.w) / 2, top: BTN.y, opacity: prog(frame, btnAt, 6) }}
        />

        {frame >= flyAt && frame < flyEnd ? <Token p={{ x: tp.x, y: tp.y + arc }} size={64} /> : null}
      </Stage>
    </AbsoluteFill>
  );
}
