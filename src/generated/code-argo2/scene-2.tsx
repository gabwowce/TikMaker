import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, CARD_BG, clamp, Cursor, EASE_OUT, GREY, LIGHT, prog, pulse, Stage } from "./shared";

export const description =
  "One big Video idea box: 'How to undo the last git commit' types into it in big letters, then the cursor clicks the big orange Start button below";

export const schema = z.object({
  form: field.recording(
    "The new video form (optional)",
    "TikMaker, + New: type one sentence into 'Video idea', leave 40 s and 'Let the AI pick', click Start – the AI agent panel only, 5 s",
  ),
  idea: field.text("The typed idea", "How to undo the last git commit"),
  button: field.text("Button", "Start"),
  typeOn: field.word("Idea typed on", "type"),
  startOn: field.word("Start clicked on", "Start"),
});
type Params = z.infer<typeof schema>;

// Layout (picture zone x 130–900, y 250–1080), centred on x 515.
const W = 700;
const LEFT = 515 - W / 2;
const BOX_TOP = 330;
const BOX_H = 270;
const FIELD_Y = [BOX_TOP + BOX_H + 50, BOX_TOP + BOX_H + 110]; // two dimmed bars
const BTN_TOP = 800;
const BTN_H = 140;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typeOn, 82) - 2;
  const startAt = wordFrame(words, params.startOn, 124) - 2;

  if (params.form)
    return (
      <AbsoluteFill>
        <RecordingSlot src={params.form} record="" width={740} height={780} style={{ position: "absolute", left: 145, top: 255 }} />
      </AbsoluteFill>
    );

  // typing: done ~10 frames before the click
  const typeEnd = Math.max(typeAt + 12, Math.min(typeAt + 30, startAt - 12));
  const typed = interpolate(frame, [typeAt, typeEnd], [0, 1], clamp);
  const text = params.idea.slice(0, Math.round(typed * params.idea.length));
  const typing = frame >= typeAt - 4 && frame < typeEnd + 6;
  const caretOn = typing || Math.floor(frame / 9) % 2 === 0;
  const done = typed >= 1;

  // focus: the box while typing, then the Start button
  const boxHot = interpolate(frame, [typeAt - 6, typeAt, typeEnd + 4, typeEnd + 12], [0.35, 1, 1, 0], clamp);
  const ready = prog(frame, typeEnd, 8);

  // cursor glides to Start and clicks
  const btnCx = 515;
  const btnCy = BTN_TOP + BTN_H / 2;
  const cur = interpolate(frame, [startAt - 16, startAt - 2], [0, 1], { ...clamp, easing: EASE_OUT });
  const cx = interpolate(cur, [0, 1], [btnCx + 280, btnCx + 170]);
  const cy = interpolate(cur, [0, 1], [btnCy + 130, btnCy + 4]);
  const press = interpolate(frame, [startAt - 1, startAt + 2, startAt + 8], [1, 0.95, 1], clamp);
  const flash = interpolate(frame, [startAt, startAt + 4, startAt + 20], [0, 1, 0.35], clamp);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the one Video idea box */}
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: BOX_TOP,
            width: W,
            height: BOX_H,
            boxSizing: "border-box",
            background: CARD_BG,
            borderRadius: 30,
            border: `4px solid ${boxHot > 0.5 ? c.accent : GREY}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5), 0 0 ${60 * boxHot}px ${c.accent}${boxHot > 0.05 ? "55" : "00"}`,
            padding: "40px 44px",
            fontFamily: c.fontUi,
            fontWeight: 700,
            fontSize: 68,
            lineHeight: 1.22,
            color: LIGHT,
            letterSpacing: -0.5,
          }}
        >
          {text}
          {caretOn && !done ? (
            <span style={{ display: "inline-block", width: 6, height: 70, background: c.accent, marginLeft: 6, verticalAlign: "-10px" }} />
          ) : null}
        </div>

        {/* the other fields: two dimmed grey bars */}
        {FIELD_Y.map((y, i) => (
          <Bar key={i} w={i === 0 ? W * 0.62 : W * 0.44} h={30} style={{ position: "absolute", left: LEFT + 6, top: y, opacity: 0.35 }} />
        ))}

        {/* the Start button */}
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: BTN_TOP,
            width: W,
            height: BTN_H,
            borderRadius: 30,
            background: `color-mix(in srgb, ${c.accent} ${Math.round(interpolate(ready, [0, 1], [45, 100]))}%, ${CARD_BG})`,
            scale: `${press * (1 + 0.012 * ready * pulse(frame, 30))}`,
            boxShadow: `0 16px 48px rgba(0,0,0,0.45), 0 0 ${70 * ready}px ${c.accent}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: c.fontStrong,
            fontSize: 72,
            color: "#fff",
          }}
        >
          {params.button}
        </div>
        {/* the click lights the button up */}
        <div
          style={{
            position: "absolute",
            left: btnCx - 380,
            top: btnCy - 110,
            width: 760,
            height: 220,
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
