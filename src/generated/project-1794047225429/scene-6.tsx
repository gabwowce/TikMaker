import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { bounceIn, CheckMark, clamp, EASE_INOUT, FRAME_H, FRAME_W, FRAMES, GREY_HI, MiniFrame, prog, Rail, Stage, STRIP_Y5, STRIP_Y6, stripX } from "./shared";

export const description =
  "The scene strip rises to the middle; an orange magnifying glass sweeps across the nine frames and a check pops onto each one it passes";

export const schema = z.object({
  sweepOn: field.word("Sweep starts on", "checks"),
  doneOn: field.word("All checked on", "done"),
});
type Params = z.infer<typeof schema>;

const LENS = 210;

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const sweepAt = wordFrame(words, params.sweepOn, 8) - 2;
  const doneAt = wordFrame(words, params.doneOn, 70) - 2;

  const rise = prog(frame, 0, 16);
  const y = interpolate(rise, [0, 1], [STRIP_Y5, STRIP_Y6]);
  const sweepEnd = Math.max(sweepAt + 20, doneAt - 6);
  const firstX = stripX(0) + FRAME_W / 2;
  const lastX = stripX(FRAMES - 1) + FRAME_W / 2;
  const lensX = interpolate(frame, [sweepAt, sweepEnd], [firstX - 160, lastX], { ...clamp, easing: EASE_INOUT });
  const lensIn = prog(frame, sweepAt - 4, 10);
  const lensOut = prog(frame, doneAt, 8);
  const lensY = STRIP_Y6 + FRAME_H / 2;
  const tick = prog(frame, doneAt + 2, 8);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Rail morph={1} done={4} active={4} tick={tick} />

        {Array.from({ length: FRAMES }).map((_, i) => {
          const cx = stripX(i) + FRAME_W / 2;
          const passedAt = interpolate(cx, [firstX - 160, lastX], [sweepAt, sweepEnd]);
          const under = Math.max(0, 1 - Math.abs(lensX - cx) / 90) * (1 - lensOut);
          const ck = bounceIn(frame, passedAt, 9);
          return (
            <div key={i}>
              <MiniFrame i={i} x={stripX(i)} y={y} scale={1 + 0.12 * under} />
              {ck > 0.01 ? (
                <div
                  style={{
                    position: "absolute",
                    left: cx - 26,
                    top: y + FRAME_H + 22,
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    background: GREY_HI,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    scale: `${ck}`,
                  }}
                >
                  <CheckMark size={34} color={c.text} stroke={0.2} />
                </div>
              ) : null}
            </div>
          );
        })}

        {/* the magnifying glass */}
        {lensIn > 0 && lensOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: lensX - LENS / 2,
              top: lensY - LENS / 2,
              width: LENS,
              height: LENS,
              opacity: lensIn * (1 - lensOut),
              scale: `${0.8 + 0.2 * lensIn}`,
              translate: `0px ${-lensOut * 80}px`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: LENS * 0.82,
                top: LENS * 0.82,
                width: 110,
                height: 34,
                borderRadius: 17,
                background: c.accent,
                rotate: "45deg",
                transformOrigin: "0px 17px",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: LENS / 2,
                border: `16px solid ${c.accent}`,
                background: "rgba(255,255,255,0.06)",
                boxShadow: `0 0 50px ${c.accent}66, 0 20px 50px rgba(0,0,0,0.5)`,
                boxSizing: "border-box",
              }}
            />
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
