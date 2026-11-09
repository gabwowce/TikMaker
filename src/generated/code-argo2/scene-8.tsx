import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Arrow, Bar, bounceIn, cardStyle, clamp, Cursor, EASE_OUT, Icon, LIGHT, popScale, prog, pulse, Stage } from "./shared";

export const description =
  "The cursor clicks a big orange Render MP4 button, it fills like a progress bar, an MP4 file lands below, and the button turns into the one typed line with an arrow down to the file";

export const schema = z.object({
  button: field.text("The button", "Render MP4"),
  fileLabel: field.text("The file", "MP4"),
  renderOn: field.word("Button clicked on", "render"),
  sentenceOn: field.word("The line appears on", "sentence"),
  outOn: field.word("The file glows on", "out"),
});
type Params = z.infer<typeof schema>;

const BTN = { w: 580, h: 130, y: 330 };

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const clickAt = Math.max(4, wordFrame(words, params.renderOn, 10) - 2);
  const sentenceAt = wordFrame(words, params.sentenceOn, 30) - 3;
  const inAt = wordFrame(words, "in", 40) - 3;
  const outAt = wordFrame(words, params.outOn, 63) - 3;
  const doneAt = Math.min(clickAt + 16, sentenceAt - 4);

  const fill = interpolate(frame, [clickAt + 2, doneAt], [0, 1], { ...clamp, easing: EASE_OUT });
  const swap = prog(frame, sentenceAt, 10);
  const fileIn = prog(frame, doneAt, 12);
  const arrow = prog(frame, inAt, 10);
  const glow = prog(frame, outAt, 10) * (0.7 + 0.3 * pulse(frame, 24));
  const btnX = 515 - BTN.w / 2;

  const cur = interpolate(frame, [0, clickAt - 1], [0, 1], { ...clamp, easing: EASE_OUT });
  const curOp = 1 - prog(frame, clickAt + 8, 6);
  const press = interpolate(frame, [clickAt - 1, clickAt + 2, clickAt + 7], [1, 0.95, 1], clamp);

  const FILE = { w: 300, h: 370, y: 580 };

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the Render button – it fills as the render runs */}
        <div
          style={{
            position: "absolute",
            left: btnX,
            top: BTN.y,
            width: BTN.w,
            height: BTN.h,
            borderRadius: 30,
            overflow: "hidden",
            background: frame < clickAt ? c.accent : "#2a2d33",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
            scale: `${press}`,
            opacity: 1 - swap,
          }}
        >
          {frame >= clickAt && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: c.accent }} />}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: c.fontStrong, fontSize: 60, color: "#fff" }}>
            {params.button}
          </div>
        </div>
        {/* …which becomes the one typed line */}
        <div
          style={{
            ...cardStyle(BTN.w),
            position: "absolute",
            left: btnX,
            top: BTN.y,
            width: BTN.w,
            height: BTN.h,
            opacity: swap,
            scale: `${frame >= sentenceAt ? popScale(frame, sentenceAt) : 0.94}`,
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "0 40px",
            border: `3px solid ${glow > 0.3 ? "rgba(255,255,255,0.12)" : c.accent}`,
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: 14, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 32 }}>✦</div>
          <Bar w={380} h={26} color={LIGHT} />
        </div>
        {/* the arrow down */}
        <div style={{ position: "absolute", left: 495, top: BTN.y + BTN.h + 22 }}>
          <Arrow len={72} p={arrow} color={c.accent} vertical />
        </div>
        {/* the MP4 file */}
        <div
          style={{
            position: "absolute",
            left: 515 - FILE.w / 2,
            top: FILE.y + (1 - fileIn) * 50,
            width: FILE.w,
            height: FILE.h,
            opacity: fileIn,
            scale: `${frame >= doneAt ? popScale(frame, doneAt, 0.9) : 0.9}`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#24272d",
              borderRadius: 30,
              border: `${glow > 0.3 ? 5 : 1}px solid ${glow > 0.3 ? c.accent : "rgba(255,255,255,0.14)"}`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5), 0 0 ${70 * glow}px ${c.accent}88`,
              clipPath: "polygon(0 0, 72% 0, 100% 22%, 100% 100%, 0 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <Icon kind="film" size={120} color={c.accent} />
            <div style={{ fontFamily: c.fontStrong, fontSize: 72, color: LIGHT }}>{params.fileLabel}</div>
          </div>
          {/* folded corner */}
          <div style={{ position: "absolute", right: 0, top: 0, width: FILE.w * 0.28, height: FILE.h * 0.22, background: "#3a3d44", clipPath: "polygon(0 0, 100% 100%, 0 100%)", borderBottomLeftRadius: 16 }} />
          {/* download badge */}
          <div
            style={{
              position: "absolute",
              right: -30,
              bottom: -30,
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: c.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scale: `${bounceIn(frame, doneAt + 8)}`,
              boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
            }}
          >
            <Icon kind="download" size={58} color="#fff" />
          </div>
        </div>
        <Cursor x={interpolate(cur, [0, 1], [820, 640])} y={interpolate(cur, [0, 1], [620, BTN.y + 70])} frame={frame} clickAt={clickAt} opacity={curOp} />
      </Stage>
    </AbsoluteFill>
  );
}
