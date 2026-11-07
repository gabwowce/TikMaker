import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, cardStyle, clamp, EASE_IN, EASE_OUT, FRAME_H, FRAME_W, FRAMES, GREY, GREY_HI, lerpPt, MiniFrame, prog, Rail, railPoint, Stage, STRIP_Y5, stripX, Token } from "./shared";

export const description =
  "Code scrolls in a dark editor window and turns into vertical scene frames that drop one by one into a scene strip along the bottom until all nine slots are full";

export const schema = z.object({
  drawOn: field.word("Frames start on", "draws"),
  fullOn: field.word("Strip full on", "fills"),
});
type Params = z.infer<typeof schema>;

const WIN = { x: 190, y: 360, w: 700, h: 360 };
const CODE = [0.55, 0.8, 0.4, 0.7, 0.62, 0.35, 0.75, 0.5, 0.66, 0.45, 0.82, 0.38];

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const drawAt = wordFrame(words, params.drawOn, 9) + 2;
  const fullAt = wordFrame(words, params.fullOn, 77) - 4;

  const slide = prog(frame, 0, 10);
  const drop = prog(frame, 10, 10, EASE_IN);
  const tokenP = lerpPt(lerpPt(railPoint(2), railPoint(3), slide), { x: 540, y: WIN.y + 60 }, drop);
  const winIn = prog(frame, 14, 12);
  const step = Math.max(4, (fullAt - drawAt) / (FRAMES - 1));
  const tickAt = fullAt + 12;
  const tick = prog(frame, Math.min(tickAt, durationInFrames - 10), 8);
  const slotsIn = prog(frame, 4, 12);
  const scroll = frame * 5;
  const lineH = 46;
  const emitP = { x: 540 - FRAME_W / 2, y: WIN.y + WIN.h - FRAME_H / 2 };

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Rail morph={1} done={3} active={3} tick={tick} />
        {frame < 22 ? <Token p={tokenP} /> : null}

        {/* the code window */}
        <div
          style={{
            position: "absolute",
            left: WIN.x,
            top: WIN.y,
            width: WIN.w,
            height: WIN.h,
            ...cardStyle(WIN.w),
            background: "#121216",
            overflow: "hidden",
            opacity: winIn * interpolate(frame, [fullAt, fullAt + 10], [1, 0.45], clamp),
            scale: `${0.94 + 0.06 * winIn}`,
          }}
        >
          <div style={{ height: 54, display: "flex", gap: 12, alignItems: "center", paddingLeft: 26, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: GREY }} />
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 54, bottom: 0, overflow: "hidden" }}>
            {Array.from({ length: 16 }).map((_, k) => {
              const idx = Math.floor(scroll / lineH) + k;
              const top = k * lineH - (scroll % lineH) + 16;
              const indent = [0, 1, 2, 2, 1, 2, 3, 2][idx % 8] * 36;
              return (
                <Bar
                  key={k}
                  w={(WIN.w - 140 - indent) * CODE[idx % CODE.length]}
                  h={18}
                  color={idx % 5 === 2 ? GREY_HI : GREY}
                  style={{ position: "absolute", left: 50 + indent, top }}
                />
              );
            })}
          </div>
        </div>

        {/* empty slots of the strip */}
        {Array.from({ length: FRAMES }).map((_, i) => (
          <div
            key={`s${i}`}
            style={{
              position: "absolute",
              left: stripX(i),
              top: STRIP_Y5,
              width: FRAME_W,
              height: FRAME_H,
              borderRadius: 12,
              border: "3px dashed rgba(255,255,255,0.12)",
              boxSizing: "border-box",
              opacity: slotsIn,
            }}
          />
        ))}

        {/* frames drop out of the code into the strip */}
        {Array.from({ length: FRAMES }).map((_, i) => {
          const at = drawAt + i * step;
          if (frame < at) return null;
          const t = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: EASE_OUT });
          const p = lerpPt(emitP, { x: stripX(i), y: STRIP_Y5 }, t);
          const arc = Math.sin(t * Math.PI) * -40;
          const latest = frame < at + step + 4;
          const hot = latest ? interpolate(frame, [at + 8, at + 12, at + step + 2, at + step + 6], [0, 1, 1, 0], clamp) : 0;
          return <MiniFrame key={i} i={i} x={p.x} y={p.y + arc} scale={0.6 + 0.4 * t} hot={hot} opacity={prog(frame, at, 4)} />;
        })}
      </Stage>
    </AbsoluteFill>
  );
}
