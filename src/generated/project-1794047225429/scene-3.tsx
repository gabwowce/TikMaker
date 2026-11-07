import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, cardStyle, clamp, EASE_IN, EASE_OUT, GREY, GREY_HI, LIGHT, lerpPt, mix, prog, Rail, railPoint, Stage, Token } from "./shared";

export const description =
  "The token drops from the rail and splits into three hook cards; the middle one is tapped and lights orange, the other two fade, and it flies back up to tick step 2";

export const schema = z.object({
  hooks: field.number("Hook cards", 3, { min: 2, max: 3 }),
  picked: field.number("Picked card (1–3)", 2, { min: 1, max: 3 }),
  splitOn: field.word("Cards split on", "three"),
  pickOn: field.word("Card picked on", "pick"),
});
type Params = z.infer<typeof schema>;

const CARD_W = 270;
const CARD_H = 470;
const CARD_Y = 440;
const CENTER = { x: 540, y: CARD_Y + CARD_H / 2 };

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const n = Math.round(params.hooks);
  const pick = Math.min(n, Math.max(1, Math.round(params.picked))) - 1;
  const splitAt = wordFrame(words, params.splitOn, 41) - 3;
  const pickAt = wordFrame(words, params.pickOn, 104) - 2;

  // token: dot 1 → dot 2 on the rail, then down to the middle
  const slide = prog(frame, 0, 10);
  const drop = prog(frame, 10, 12, EASE_IN);
  const onRail = lerpPt(railPoint(0), railPoint(1), slide);
  const tokenP = lerpPt(onRail, CENTER, drop);
  const tokenPulse = 1 + 0.12 * Math.sin(frame / 3);
  const split = prog(frame, splitAt, 14);

  // the chosen card flies back up and ticks step 2
  const backAt = Math.min(pickAt + 14, durationInFrames - 20);
  const back = prog(frame, backAt, 12, EASE_IN);
  const tickAt = backAt + 12;
  const tick = prog(frame, tickAt, 8);

  const gap = 33;
  const totalW = n * CARD_W + (n - 1) * gap;
  const x0 = (1080 - totalW) / 2;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Rail morph={1} done={1} active={1} tick={tick} />

        {frame < splitAt + 4 ? <Token p={tokenP} size={44 * (frame > 22 ? tokenPulse : 1)} opacity={1 - prog(frame, splitAt, 4)} /> : null}

        {split > 0
          ? Array.from({ length: n }).map((_, i) => {
              const isPick = i === pick;
              const hot = isPick ? prog(frame, pickAt, 6) : 0;
              const dim = isPick ? 1 : interpolate(frame, [pickAt, pickAt + 8], [1, 0.28], clamp);
              const left = mix(CENTER.x - CARD_W / 2, x0 + i * (CARD_W + gap), split);
              const sc = mix(0.3, 1, split) * (isPick ? 1 + 0.06 * hot : interpolate(frame, [pickAt, pickAt + 8], [1, 0.94], clamp));
              const gone = isPick ? back : prog(frame, backAt, 8);
              // the picked card shrinks into the token's path back up
              const target = railPoint(1);
              const cx = left + CARD_W / 2;
              const cy = CARD_Y + CARD_H / 2;
              const dx = isPick ? (target.x - cx) * back : 0;
              const dy = isPick ? (target.y - cy) * back : 0;
              const thumb = bounceIn(frame, splitAt + 8 + i * 4, 10);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left,
                    top: CARD_Y,
                    width: CARD_W,
                    height: CARD_H,
                    ...cardStyle(CARD_W),
                    borderRadius: 28,
                    border: hot > 0.5 ? `4px solid ${c.accent}` : "1px solid rgba(255,255,255,0.12)",
                    boxShadow: hot > 0.5 ? `0 0 60px ${c.accent}55, 0 24px 64px rgba(0,0,0,0.5)` : cardStyle(CARD_W).boxShadow,
                    opacity: split * dim * (1 - gone),
                    scale: `${sc * (1 - 0.85 * back * (isPick ? 1 : 0))}`,
                    translate: `${dx}px ${dy}px`,
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 22,
                  }}
                >
                  {/* what the hook shows: a picture */}
                  <div
                    style={{
                      width: CARD_W - 48,
                      height: 240,
                      borderRadius: 18,
                      background: "#121216",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 110,
                        height: i === 2 ? 80 : 110,
                        borderRadius: i === 0 ? 55 : 18,
                        background: hot > 0.5 ? c.accent : i === 1 ? LIGHT : GREY_HI,
                        scale: `${thumb}`,
                        rotate: i === 1 ? "45deg" : "0deg",
                      }}
                    />
                  </div>
                  {/* the hook line */}
                  <Bar w="92%" h={28} color={hot > 0.5 ? c.text : GREY_HI} />
                  <Bar w="70%" h={28} color={hot > 0.5 ? c.text : GREY_HI} />
                  <Bar w="50%" h={20} color={GREY} />
                </div>
              );
            })
          : null}

        {/* the tap */}
        {frame >= pickAt - 2 && frame < pickAt + 14 ? (
          <div
            style={{
              position: "absolute",
              left: x0 + pick * (CARD_W + gap) + CARD_W / 2 - 60,
              top: CARD_Y + CARD_H * 0.62 - 60,
              width: 120,
              height: 120,
              borderRadius: 60,
              border: `6px solid ${c.text}`,
              scale: `${interpolate(frame, [pickAt - 2, pickAt + 12], [0.4, 1.6], { ...clamp, easing: EASE_OUT })}`,
              opacity: interpolate(frame, [pickAt - 2, pickAt + 2, pickAt + 14], [0, 0.9, 0], clamp),
            }}
          />
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
