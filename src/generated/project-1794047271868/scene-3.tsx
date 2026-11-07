import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  DARK,
  EASE_INOUT,
  GREY,
  GREY_HI,
  PANEL,
  PANEL_SCALE,
  Spark,
  PANEL_Y,
  PHONE2,
  Phone,
  Pipeline,
  SETUP_Y,
  ScaleAt,
  Stage,
  alpha,
  cardStyle,
  clamp,
  mix,
  popScale,
  prog,
  pulse,
} from "./shared";

export const description =
  "The pipeline glides into one big card headed 'AI agent'; the card's spark icon and border light up orange as the engine around every station";

export const schema = z.object({
  label: field.text("Panel label", "AI agent"),
  lightOn: field.word("Panel lights up on", "TikMaker's"),
});
type Params = z.infer<typeof schema>;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const move = interpolate(frame, [0, 18], [0, 1], { ...clamp, easing: EASE_INOUT });
  const gone = interpolate(frame, [0, 7], [1, 0], clamp);
  const panelAt = 5;
  const inside = prog(frame, panelAt + 6, 10);
  const lightAt = wordFrame(words, params.lightOn, 29) - 3;
  const lit = prog(frame, lightAt, 10);
  const glow = lit * (0.75 + 0.25 * pulse(frame - lightAt, 40));
  const y = mix(SETUP_Y, PANEL_Y, move);
  const s = mix(1, PANEL_SCALE, move);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the phone and bend from the setup leave */}
        {gone > 0 ? (
          <>
            <div style={{ position: "absolute", left: 910, top: SETUP_Y + 75, width: 10, height: 300, borderRadius: 5, background: GREY, opacity: gone }} />
            <div style={{ position: "absolute", left: PHONE2.x + PHONE2.w, top: 790, width: 225, height: 10, borderRadius: 5, background: GREY, opacity: gone }} />
            <Phone frame={frame} {...PHONE2} lit={0} hot={gone} style={{ opacity: gone, scale: `${mix(0.9, 1, gone)}` }} />
          </>
        ) : null}
        <div
          style={{
            position: "absolute",
            left: PANEL.x,
            top: PANEL.y,
            width: PANEL.w,
            height: PANEL.h,
            ...cardStyle(PANEL.w),
            border: `4px solid ${lit > 0.01 ? alpha(c.accent, 0.25 + 0.75 * lit) : "rgba(255,255,255,0.12)"}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5), 0 0 ${110 * glow}px ${alpha(c.accent, 0.35 * glow)}`,
            scale: `${popScale(frame, panelAt, 0.9)}`,
            opacity: prog(frame, panelAt, 7),
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 26,
              opacity: inside,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 28,
                background: lit > 0.5 ? c.accent : GREY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: lit > 0.5 ? `0 0 40px ${alpha(c.accent, 0.5)}` : undefined,
                scale: `${interpolate(frame, [lightAt, lightAt + 5, lightAt + 10], [1, 1.12, 1], clamp)}`,
              }}
            >
              <Spark size={56} color={lit > 0.5 ? DARK : GREY_HI} />
            </div>
            <div style={{ fontFamily: c.fontStrong, fontSize: 76, color: c.text, lineHeight: 1, paddingTop: 6 }}>{params.label}</div>
          </div>
        </div>
        <ScaleAt y={y} scale={s}>
          <Pipeline y={y} />
        </ScaleAt>
      </Stage>
    </AbsoluteFill>
  );
}
