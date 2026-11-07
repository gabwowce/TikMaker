import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { clamp, EASE_IN, EASE_INOUT, FRAME_W, FRAMES, GREY, GREY_HI, MiniFrame, popScale, prog, Rail, Stage, STRIP_Y6, stripX } from "./shared";

export const description =
  "The frames gather into a big Render MP4 button; it is pressed, a bar fills to the end and an orange MP4 file slides out, ticking the last step";

export const schema = z.object({
  button: field.text("Button", "Render MP4"),
  file: field.text("File label", "MP4"),
  pressOn: field.word("Button pressed on", "Render"),
  fileOn: field.word("File slides out on", "file"),
  readyOn: field.word("Last step ticks on", "ready"),
});
type Params = z.infer<typeof schema>;

const BTN = { x: 200, y: 380, w: 680, h: 150 };
const BAR = { x: 160, y: 600, w: 760, h: 40 };
const FILE = { w: 230, h: 290, y: 720 };

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pressAt = wordFrame(words, params.pressOn, 22) - 3;
  const fileAt = wordFrame(words, params.fileOn, 59) - 4;
  const readyAt = wordFrame(words, params.readyOn, 70) - 2;

  const gather = prog(frame, 0, 14, EASE_IN);
  const btnIn = prog(frame, 6, 12);
  const press = interpolate(frame, [pressAt, pressAt + 3, pressAt + 9], [1, 0.92, 1], clamp);
  const btnHot = interpolate(frame, [pressAt - 6, pressAt, fileAt - 6, fileAt], [0, 1, 1, 0], clamp);
  const fill = interpolate(frame, [pressAt + 4, fileAt - 2], [0, 1], { ...clamp, easing: EASE_INOUT });
  const barIn = prog(frame, pressAt, 8);
  const fileT = prog(frame, fileAt, 14);
  const tick = prog(frame, readyAt, 8);
  const bcx = BTN.x + BTN.w / 2;
  const bcy = BTN.y + BTN.h / 2;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Rail morph={1} done={5} active={5} tick={tick} />

        {/* the checked frames gather into the button */}
        {gather < 1
          ? Array.from({ length: FRAMES }).map((_, i) => {
              const x = stripX(i);
              return (
                <MiniFrame
                  key={i}
                  i={i}
                  x={x + (bcx - FRAME_W / 2 - x) * gather}
                  y={STRIP_Y6 + (bcy - 84 - STRIP_Y6) * gather}
                  scale={1 - 0.6 * gather}
                  opacity={1 - gather}
                />
              );
            })
          : null}

        {/* Render MP4 */}
        <div
          style={{
            position: "absolute",
            left: BTN.x,
            top: BTN.y,
            width: BTN.w,
            height: BTN.h,
            borderRadius: 38,
            background: btnHot > 0.5 ? c.accent : GREY_HI,
            boxShadow: btnHot > 0.5 ? `0 0 60px ${c.accent}88` : "0 24px 64px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: btnIn * interpolate(frame, [fileAt - 6, fileAt + 4], [1, 0.45], clamp),
            scale: `${popScale(frame, 6, 0.85) * press}`,
          }}
        >
          <span style={{ fontFamily: c.fontStrong, fontSize: 72 * c.widthFactor, color: btnHot > 0.5 ? c.bg : c.text, paddingTop: 8 }}>
            {params.button}
          </span>
        </div>

        {/* the render bar */}
        <div
          style={{
            position: "absolute",
            left: BAR.x,
            top: BAR.y,
            width: BAR.w,
            height: BAR.h,
            borderRadius: BAR.h / 2,
            background: GREY,
            overflow: "hidden",
            opacity: barIn * interpolate(frame, [fileAt, fileAt + 8], [1, 0.45], clamp),
          }}
        >
          <div style={{ width: BAR.w * fill, height: "100%", borderRadius: BAR.h / 2, background: c.text }} />
        </div>

        {/* the MP4 file slides out of the bar's end */}
        {fileT > 0 ? (
          <div
            style={{
              position: "absolute",
              left: 540 - FILE.w / 2,
              top: FILE.y,
              width: FILE.w,
              height: FILE.h,
              translate: `${(1 - fileT) * (BAR.x + BAR.w - 540)}px ${(1 - fileT) * -120}px`,
              scale: `${interpolate(fileT, [0, 0.7, 1], [0.3, 1.04, 1])}`,
              opacity: prog(frame, fileAt, 5),
              filter: `drop-shadow(0 0 40px ${c.accent}66) drop-shadow(0 24px 40px rgba(0,0,0,0.5))`,
            }}
          >
            <svg width={FILE.w} height={FILE.h} viewBox={`0 0 ${FILE.w} ${FILE.h}`} style={{ position: "absolute", inset: 0 }}>
              <path
                d={`M 28 0 H ${FILE.w - 70} L ${FILE.w} 70 V ${FILE.h - 28} Q ${FILE.w} ${FILE.h} ${FILE.w - 28} ${FILE.h} H 28 Q 0 ${FILE.h} 0 ${FILE.h - 28} V 28 Q 0 0 28 0 Z`}
                fill={c.accent}
              />
              <path d={`M ${FILE.w - 70} 0 V 52 Q ${FILE.w - 70} 70 ${FILE.w - 52} 70 H ${FILE.w} Z`} fill="rgba(0,0,0,0.25)" />
            </svg>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: FILE.h * 0.48,
                textAlign: "center",
                fontFamily: c.fontStrong,
                fontSize: 70 * c.widthFactor,
                color: c.bg,
              }}
            >
              {params.file}
            </div>
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
