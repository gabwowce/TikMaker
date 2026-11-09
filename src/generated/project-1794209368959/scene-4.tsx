import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  bounceIn,
  BTN_C,
  Check,
  clamp,
  Clip,
  CLIP_CX,
  CLIP_H,
  CLIP_W,
  Cursor,
  EASE_OUT,
  INK,
  prog,
  Stage,
  StylePill,
  zoomed,
} from "./shared";

export const description =
  "Style pill '02 Clean UI'; the clip shrinks into a floating device frame, the view zooms onto its orange button as a cursor clicks it, and two soft label cards pop in";

export const schema = z.object({
  number: field.text("Number", "02"),
  name: field.text("Style name", "Clean UI"),
  nameOn: field.word("Name appears on", "clean"),
  floatOn: field.word("Device frame on", "floats"),
  zoomOn: field.word("Camera zooms on", "zooms"),
  clickOn: field.word("Click on", "click"),
  cardsOn: field.word("Label cards pop on", "pop"),
});
type Params = z.infer<typeof schema>;

const DEVICE_CY = 660;

function Callout({ x, y, w, t, hot }: { x: number; y: number; w: number; t: number; hot: boolean }) {
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: 104,
        borderRadius: 26,
        background: "#f4f5f7",
        boxShadow: "0 6px 16px rgba(0,0,0,0.35), 0 24px 50px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "0 24px",
        boxSizing: "border-box",
        scale: `${t}`,
        opacity: interpolate(t, [0, 0.2], [0, 1], clamp),
        transformOrigin: "left center",
      }}
    >
      <div style={{ width: 60, height: 60, borderRadius: 30, background: hot ? c.accent : "#c9ccd3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Check size={34} color="#fff" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ width: w - 150, height: 16, borderRadius: 8, background: INK }} />
        <div style={{ width: (w - 150) * 0.6, height: 14, borderRadius: 7, background: "#b9bcc3" }} />
      </div>
    </div>
  );
}

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const numAt = wordFrame(words, params.number, 39) - 3;
  const nameAt = wordFrame(words, params.nameOn, 61) - 3;
  const floatAt = wordFrame(words, params.floatOn, 119) - 4;
  const zoomAt = wordFrame(words, params.zoomOn, 176) - 4;
  const clickAt = wordFrame(words, params.clickOn, 198) - 2;
  const cardsAt = wordFrame(words, params.cardsOn, 241) - 3;

  const float = prog(frame, floatAt, 16);
  const s = interpolate(float, [0, 1], [1, 0.86]);
  const bob = Math.sin(frame / 28) * 7 * float;
  const cy = interpolate(float, [0, 1], [675, DEVICE_CY]) + bob;

  const zoom = interpolate(frame, [zoomAt, zoomAt + 22], [1, 1.9], { ...clamp, easing: EASE_OUT });
  const cursorIn = prog(frame, zoomAt - 14, 18);
  const press = interpolate(frame, [clickAt, clickAt + 3, clickAt + 9], [0, 1, 0], clamp);
  const ripple = prog(frame, clickAt, 16);

  const target = zoomed(BTN_C, zoom);
  const w = CLIP_W * s;
  const h = CLIP_H * s;
  const bezel = 18;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <StylePill
          n={params.number}
          label={params.name}
          labelIn={prog(frame, nameAt, 12)}
          numIn={interpolate(frame, [numAt, numAt + 5, numAt + 12], [1, 1.25, 1], clamp)}
        />
        {/* the device frame behind the clip */}
        <div
          style={{
            position: "absolute",
            left: CLIP_CX - w / 2 - bezel,
            top: cy - h / 2 - bezel,
            width: w + bezel * 2,
            height: h + bezel * 2,
            borderRadius: 44,
            background: "#0d0e11",
            border: "2px solid rgba(255,255,255,0.14)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.65)",
            opacity: float,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: CLIP_CX - 60,
            top: cy + h / 2 + bezel,
            width: 120,
            height: 40,
            background: "#202227",
            opacity: float,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: CLIP_CX - 170,
            top: cy + h / 2 + bezel + 40,
            width: 340,
            height: 18,
            borderRadius: 9,
            background: "#2a2c32",
            opacity: float,
          }}
        />
        <Clip frame={frame} cy={cy} s={s} look={{ hot: 0, btnHot: 1, zoom, press }}>
          {/* click ripple + cursor at the button */}
          <div
            style={{
              position: "absolute",
              left: target.x - 90,
              top: target.y - 90,
              width: 180,
              height: 180,
              borderRadius: 90,
              border: `6px solid ${c.accent}`,
              boxSizing: "border-box",
              scale: `${0.3 + ripple * 1.1}`,
              opacity: ripple > 0 ? 1 - ripple : 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: interpolate(cursorIn, [0, 1], [260, target.x - 8]),
              top: interpolate(cursorIn, [0, 1], [160, target.y - 6]),
              opacity: interpolate(cursorIn, [0, 0.15], [0, 1], clamp),
              scale: `${1 - press * 0.12}`,
            }}
          >
            <Cursor size={78} />
          </div>
          <Callout x={40} y={36} w={360} t={bounceIn(frame, cardsAt, 11)} hot />
          <Callout x={40} y={162} w={300} t={bounceIn(frame, cardsAt + 12, 11)} hot={false} />
        </Clip>
      </Stage>
    </AbsoluteFill>
  );
}
