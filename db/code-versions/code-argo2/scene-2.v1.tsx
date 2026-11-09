import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { asset, field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { CARD_BG, clamp, Cursor, EASE_OUT, prog, Stage, STILL } from "./shared";

export const description =
  "TikMaker's real new-video form: the idea gets typed into the Video idea box, the form glides down and the cursor clicks the orange Start button";

export const schema = z.object({
  form: field.recording(
    "The new video form (optional)",
    "TikMaker, + New: type one sentence into 'Video idea', leave 40 s and 'Let the AI pick', click Start – the AI agent panel only, 5 s",
  ),
  typeOn: field.word("Idea typed on", "type"),
  startOn: field.word("Start clicked on", "Start"),
});
type Params = z.infer<typeof schema>;

// The form still: 670 x 1192; the Start button's centre (from the recorder's mark).
const IMG_W = 700;
const IMG_H = (IMG_W * 1192) / 670;
const START = { x: 0.5, y: 0.9748 };
const BOX = { left: 145, top: 255, w: 740, h: 780, pad: 20 };

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typeOn, 82) - 2;
  const startAt = wordFrame(words, params.startOn, 124) - 2;

  if (params.form)
    return (
      <AbsoluteFill>
        <RecordingSlot src={params.form} record="" width={BOX.w} height={BOX.h} style={{ position: "absolute", left: BOX.left, top: BOX.top }} />
      </AbsoluteFill>
    );

  // typing: line 1, then line 2, then the Start button turns orange
  const line1 = interpolate(frame, [typeAt, typeAt + 16], [0, 1], clamp);
  const line2 = interpolate(frame, [typeAt + 16, typeAt + 24], [0, 1], clamp);
  const ready = prog(frame, typeAt + 22, 6);
  // the form glides down to the Start button
  const panAt = Math.min(typeAt + 24, startAt - 16);
  const pan = interpolate(frame, [panAt, panAt + 14], [0, 1], { ...clamp, easing: EASE_OUT });
  const innerH = BOX.h - BOX.pad * 2;
  const panY = -pan * (IMG_H - innerH);
  // the idea box glows while it is typed into
  const glow = interpolate(frame, [typeAt - 6, typeAt, typeAt + 26, typeAt + 34], [0, 1, 1, 0], clamp);

  const startX = BOX.left + BOX.pad + START.x * IMG_W;
  const startY = BOX.top + BOX.pad + START.y * IMG_H + panY;
  const cur = interpolate(frame, [startAt - 16, startAt - 2], [0, 1], { ...clamp, easing: EASE_OUT });
  const cx = interpolate(cur, [0, 1], [startX + 260, startX + 40]);
  const cy = interpolate(cur, [0, 1], [startY - 260, startY - 6]);
  const flash = interpolate(frame, [startAt, startAt + 4, startAt + 20], [0, 1, 0.35], clamp);

  const layer = (src: string, top: number, bottom: number, reveal: number) => (
    <Img
      src={asset(src)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: IMG_W,
        height: IMG_H,
        clipPath: `inset(${top * 100}% ${(1 - reveal) * 100}% ${(1 - bottom) * 100}% 0)`,
      }}
    />
  );

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <div
          style={{
            position: "absolute",
            left: BOX.left,
            top: BOX.top,
            width: BOX.w,
            height: BOX.h,
            padding: BOX.pad,
            background: CARD_BG,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", width: IMG_W, height: innerH, overflow: "hidden", borderRadius: 12 }}>
            <div style={{ position: "absolute", left: 0, top: panY, width: IMG_W, height: IMG_H }}>
              {/* the soft glow behind the idea box */}
              <div
                style={{
                  position: "absolute",
                  left: -40,
                  top: 20,
                  width: IMG_W + 80,
                  height: 240,
                  background: `radial-gradient(closest-side, ${c.accent}55, transparent)`,
                  opacity: glow,
                }}
              />
              <Img src={asset(STILL.formEmpty)} style={{ position: "absolute", left: 0, top: 0, width: IMG_W, height: IMG_H }} />
              {layer(STILL.formTyped, 0, 0.105, line1)}
              {layer(STILL.formTyped, 0.105, 0.2, line2)}
              {layer(STILL.formTyped, 0.2, 1, ready)}
            </div>
          </div>
        </div>
        {/* the Start button lights up when clicked */}
        <div
          style={{
            position: "absolute",
            left: startX - 260,
            top: startY - 70,
            width: 520,
            height: 140,
            background: `radial-gradient(closest-side, ${c.accent}aa, transparent)`,
            opacity: flash,
            mixBlendMode: "screen",
          }}
        />
        <Cursor x={cx} y={cy} frame={frame} clickAt={startAt} opacity={cur} />
      </Stage>
    </AbsoluteFill>
  );
}
