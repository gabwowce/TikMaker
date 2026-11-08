import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, Cursor, DownloadIcon, EASE_OUT, GREY, LIGHT, Ripple, Stage, cardStyle, clamp, popScale, prog, pulse } from "./shared";

export const description =
  "The cursor clicks the orange Render MP4 button, a progress bar fills, and an MP4 file card lands with a download arrow";

export const schema = z.object({
  button: field.text("Button", "Render MP4"),
  file: field.text("File label", "MP4"),
  fillOn: field.word("The bar fills on", "render"),
  fileOn: field.word("The file lands on", "One"),
});
type Params = z.infer<typeof schema>;

const BTN = { x: 240, y: 240, w: 600, h: 130 };
const BAR = { x: 140, y: 440, w: 800, h: 44 };
const FILE = { x: 370, y: 560, w: 340, h: 440 };

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const clickAt = 4;
  const fillAt = wordFrame(words, params.fillOn, 10) - 2;
  const fileAt = wordFrame(words, params.fileOn, 24) + 2;

  const press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 4], [0, 1, 0], clamp);
  const fill = interpolate(frame, [fillAt, fileAt - 2], [0, 1], { ...clamp, easing: EASE_OUT });
  const file = prog(frame, fileAt, 12);
  // the focus walks: button → bar → file
  const btnHot = 1 - prog(frame, fillAt, 8);
  const barHot = prog(frame, fillAt, 6) * (1 - file);
  const fileHot = file * (0.75 + 0.25 * pulse(frame, 30));

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* Render MP4 */}
        <div
          style={{
            position: "absolute",
            left: BTN.x,
            top: BTN.y,
            width: BTN.w,
            height: BTN.h,
            borderRadius: 30,
            background: btnHot > 0.5 ? c.accent : "#2a2c32",
            border: btnHot > 0.5 ? "none" : "1px solid rgba(255,255,255,0.12)",
            color: btnHot > 0.5 ? c.bg : c.textSoft,
            fontFamily: c.fontStrong,
            fontSize: 64 * c.widthFactor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 6,
            boxSizing: "border-box",
            scale: `${1 - press * 0.05}`,
            boxShadow: btnHot > 0.5 ? "0 0 40px rgba(255,112,36,0.5)" : "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {params.button}
        </div>
        <Ripple x={BTN.x + BTN.w * 0.7} y={BTN.y + BTN.h * 0.6} frame={frame} at={clickAt} />
        <Cursor x={BTN.x + BTN.w * 0.7} y={BTN.y + BTN.h * 0.6} press={press} opacity={1 - prog(frame, clickAt + 10, 8)} />

        {/* progress */}
        <div style={{ position: "absolute", left: BAR.x, top: BAR.y, width: BAR.w, height: BAR.h, borderRadius: BAR.h / 2, background: GREY, overflow: "hidden" }}>
          <div
            style={{
              width: `${fill * 100}%`,
              height: "100%",
              borderRadius: BAR.h / 2,
              background: barHot > 0.5 ? c.accent : LIGHT,
            }}
          />
        </div>

        {/* the MP4 file */}
        <div
          style={{
            position: "absolute",
            left: FILE.x,
            top: FILE.y,
            width: FILE.w,
            height: FILE.h,
            ...cardStyle(FILE.w),
            overflow: "visible",
            border: `3px solid rgba(255,112,36,${fileHot})`,
            opacity: file,
            scale: `${popScale(frame, fileAt, 0.85)}`,
            translate: `0px ${(1 - file) * 60}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "50px 40px",
            gap: 26,
          }}
        >
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: 75,
              background: c.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={64} height={64} viewBox="0 0 24 24">
              <path d="M8 5 L19 12 L8 19 Z" fill={c.bg} />
            </svg>
          </div>
          <div style={{ fontFamily: c.fontStrong, fontSize: 72 * c.widthFactor, color: c.text, lineHeight: 1 }}>{params.file}</div>
          <Bar w={180} h={18} color={GREY} />
          <div
            style={{
              position: "absolute",
              right: -34,
              bottom: -34,
              width: 104,
              height: 104,
              borderRadius: 52,
              background: LIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
              scale: `${prog(frame, fileAt + 10, 10)}`,
            }}
          >
            <DownloadIcon size={56} color={c.bg} />
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
