import { z } from "zod";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_BOTTOM, CAPTION_TOP, LIGHT_TEXT, LIGHT_TEXT_SOFT, SCENE_COLORS, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, GAME, GameStill, OUT, cardMotion, clampAll, glass } from "./shared";

export const description =
  "Light scene: a big white chat card on a friend's phone – a bubble with the game's link (a real frame of the fireworks finish) slides in and the friend's touch taps Play";

export const schema = z.object({
  gameplay: field.recording("Link preview (gameplay)", "The same gameplay recording – its fireworks frame is the link preview"),
  friend: field.text("Friend's name", "Alex"),
  linkTitle: field.text("Link title", "Fly through my city"),
  bubbleOn: field.word("Bubble arrives on", "game"),
  tapOn: field.word("Thumb taps on", "friend"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;
const W = 770;
const H = 620;
const TOP = 700 - H / 2; // the card centred at y 700
const BUB_TOP = 226;
const BUB_W = 690;
const IMG_H = 270;

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useBrand();
  const bubbleAt = wordFrame(words, params.bubbleOn, 39) - 4;
  const tapAt = wordFrame(words, params.tapOn, 57);

  const b = spring({ frame: frame - bubbleAt, fps, config: { damping: 14, stiffness: 160 } });
  const bx = interpolate(b, [0, 1], [-440, 0]);
  const bOp = interpolate(frame - bubbleAt, [0, 4], [0, 1], clampAll);

  // the touch: comes in from the lower right, presses on the play button
  const tIn = interpolate(frame, [tapAt - 14, tapAt - 1], [0, 1], { ...clampAll, easing: OUT });
  const press = interpolate(frame, [tapAt - 1, tapAt + 1, tapAt + 6], [1, 0.82, 1], clampAll);
  const ripple = interpolate(frame, [tapAt, tapAt + 16], [0, 1], clampAll);
  const lit = interpolate(frame, [tapAt, tapAt + 6], [0, 1], clampAll);
  const g = glass(W, true);

  // play button centre inside the card (px)
  const px = 40 + BUB_W / 2;
  const py = BUB_TOP + IMG_H / 2;

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} light y={700} />
      <Camera duration={durationInFrames} punchAt={[tapAt]}>
        <div style={{ position: "absolute", left: 130, top: TOP, ...cardMotion(frame, -40) }}>
          <div style={{ width: W, height: H, ...g, borderRadius: 44, overflow: "hidden", position: "relative" }}>
            {/* chat header */}
            <div
              style={{
                height: 100,
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "0 34px",
                borderBottom: "1.5px solid rgba(20,30,60,0.07)",
              }}
            >
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: 31,
                  background: SCENE_COLORS.teal,
                  color: "#fff",
                  fontFamily: c.fontUi,
                  fontWeight: 800,
                  fontSize: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {params.friend.slice(0, 1).toUpperCase()}
              </div>
              <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 40, color: LIGHT_TEXT }}>{params.friend}</span>
              <span style={{ marginLeft: "auto", fontFamily: c.fontUi, fontWeight: 600, fontSize: 28, color: LIGHT_TEXT_SOFT }}>
                now
              </span>
            </div>
            {/* the earlier message, already there */}
            <div
              style={{
                position: "absolute",
                left: 40,
                top: 126,
                padding: "16px 30px",
                borderRadius: 30,
                borderTopLeftRadius: 10,
                background: "rgba(20,30,60,0.06)",
                fontFamily: c.fontUi,
                fontWeight: 600,
                fontSize: 34,
                color: LIGHT_TEXT,
              }}
            >
              made you something
            </div>
            {/* the link bubble */}
            <div
              style={{
                position: "absolute",
                left: 40,
                top: BUB_TOP,
                width: BUB_W,
                borderRadius: 30,
                borderTopLeftRadius: 10,
                background: "rgba(20,30,60,0.06)",
                overflow: "hidden",
                opacity: bOp,
                transform: `translateX(${bx}px) rotate(${interpolate(b, [0, 1], [-4, 0])}deg)`,
                boxShadow: `0 10px 30px rgba(20,30,60,${0.1 + lit * 0.1})`,
              }}
            >
              <div style={{ position: "relative", width: BUB_W, height: IMG_H }}>
                <GameStill
                  src={params.gameplay || GAME}
                  atSec={16.8}
                  style={{ width: BUB_W, height: IMG_H, objectPosition: "50% 30%", filter: `brightness(${1 + lit * 0.15})` }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: BUB_W / 2 - 52,
                    top: IMG_H / 2 - 52,
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    background: COLOR,
                    boxShadow: `0 8px 30px ${COLOR}aa`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${1 + lit * 0.08})`,
                  }}
                >
                  <svg width={46} height={46} viewBox="0 0 40 40">
                    <path d="M13 8l20 12-20 12z" fill="#fff" />
                  </svg>
                </div>
              </div>
              <div style={{ padding: "20px 28px 24px", fontFamily: c.fontUi, fontWeight: 800, fontSize: 40, color: LIGHT_TEXT }}>
                {params.linkTitle}
              </div>
            </div>
            {/* ripple where the touch lands */}
            {ripple > 0 && ripple < 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: px - 40 - 90 * ripple,
                  top: py - 40 - 90 * ripple,
                  width: 80 + 180 * ripple,
                  height: 80 + 180 * ripple,
                  borderRadius: "50%",
                  border: `5px solid ${COLOR}`,
                  opacity: 1 - ripple,
                }}
              />
            ) : null}
          </div>
        </div>
        {/* the friend's touch: a soft touch dot gliding in and pressing */}
        <div
          style={{
            position: "absolute",
            left: 130 + px - 50 + (1 - tIn) * 220 + 26,
            top: TOP + py - 50 + (1 - tIn) * 300 + 26,
            width: 100,
            height: 100,
            borderRadius: 50,
            background: "rgba(255,255,255,0.55)",
            border: "4px solid rgba(27,29,34,0.55)",
            boxShadow: "0 14px 34px rgba(20,30,60,0.3)",
            opacity: tIn * interpolate(frame, [tapAt + 14, tapAt + 22], [1, 0.0], clampAll),
            transform: `scale(${press})`,
          }}
        />
      </Camera>
      {/* a dark rounded plate under the caption band, so the video's white
          captions stay readable on this light scene */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: CAPTION_TOP + 4,
          height: CAPTION_BOTTOM - CAPTION_TOP - 8,
          borderRadius: 60,
          background: "rgba(22,24,30,0.92)",
          boxShadow: "0 18px 50px rgba(20,30,60,0.22)",
        }}
      />
    </AbsoluteFill>
  );
}
