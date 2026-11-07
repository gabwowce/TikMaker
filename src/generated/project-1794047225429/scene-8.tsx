import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { BUBBLE, clamp, EASE_IN, GREY, GREY_HI, IdeaBubble, PHONE, Phone, Pipe, popScale, prog, Rail, Stage } from "./shared";

export const description =
  "The rail bends back into the pipe between the idea bubble and the phone; the orange MP4 file flies into the phone and the finished video plays with its captions, the phone glowing";

export const schema = z.object({
  bubbleOn: field.word("Bubble returns on", "sentence"),
  landOn: field.word("File lands in phone on", "finished"),
});
type Params = z.infer<typeof schema>;

const FILE = { w: 230, h: 290, x: 540 - 115, y: 720 };

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const bubbleAt = Math.max(2, wordFrame(words, params.bubbleOn, 6) - 2);
  const landAt = wordFrame(words, params.landOn, 31) - 3;

  const morph = 1 - prog(frame, 0, 18);
  const out = prog(frame, 0, 8, EASE_IN);
  const phoneIn = prog(frame, 4, 14);
  const flyFrom = landAt - 12;
  const fly = prog(frame, flyFrom, 12, EASE_IN);
  const lit = prog(frame, landAt, 8);
  const draw = prog(frame, 6, 18);
  const phoneCx = PHONE.x + PHONE.w / 2;
  const phoneCy = PHONE.y + PHONE.h / 2;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* what is left of the render step */}
        {out < 1 ? (
          <>
            <div style={{ position: "absolute", left: 200, top: 380, width: 680, height: 150, borderRadius: 38, background: GREY_HI, opacity: 0.45 * (1 - out) }} />
            <div style={{ position: "absolute", left: 160, top: 600, width: 760, height: 40, borderRadius: 20, background: GREY, opacity: 0.45 * (1 - out) }} />
          </>
        ) : null}

        <Pipe draw={draw} glow={0.22} />
        <Rail morph={morph} done={6} active={-1} />
        <IdeaBubble hot={0} style={{ scale: `${popScale(frame, bubbleAt, 0.8)}`, opacity: prog(frame, bubbleAt, 6), transformOrigin: `0px ${BUBBLE.h}px` }} />
        <Phone
          frame={frame + 20}
          {...PHONE}
          lit={0.35 + 0.65 * lit}
          hot={lit * (0.75 + 0.25 * Math.sin(frame / 8))}
          style={{ opacity: phoneIn, translate: `${(1 - phoneIn) * 200}px 0px` }}
        />

        {/* the MP4 file flies into the phone */}
        {fly < 1 ? (
          <div
            style={{
              position: "absolute",
              left: FILE.x,
              top: FILE.y,
              width: FILE.w,
              height: FILE.h,
              translate: `${(phoneCx - 540) * fly}px ${(phoneCy - (FILE.y + FILE.h / 2)) * fly}px`,
              scale: `${1 - 0.8 * fly}`,
              opacity: interpolate(fly, [0.7, 1], [1, 0], clamp),
              filter: `drop-shadow(0 0 40px ${c.accent}66)`,
            }}
          >
            <svg width={FILE.w} height={FILE.h} viewBox={`0 0 ${FILE.w} ${FILE.h}`}>
              <path
                d={`M 28 0 H ${FILE.w - 70} L ${FILE.w} 70 V ${FILE.h - 28} Q ${FILE.w} ${FILE.h} ${FILE.w - 28} ${FILE.h} H 28 Q 0 ${FILE.h} 0 ${FILE.h - 28} V 28 Q 0 0 28 0 Z`}
                fill={c.accent}
              />
            </svg>
            <div style={{ position: "absolute", left: 0, right: 0, top: FILE.h * 0.48, textAlign: "center", fontFamily: c.fontStrong, fontSize: 70 * c.widthFactor, color: c.bg }}>
              MP4
            </div>
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
