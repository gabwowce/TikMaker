import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { LIGHT_TEXT, SCENE_COLORS, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { ASSETS, Backdrop, Camera, OUT, Pan, clampAll, glass, usePop } from "./shared";

export const description =
  "The three projects' real pages (catcopter.com, r2d2-tv, nesformer) shrink into a row of cards, a white comment bubble 'What would you build? 👇' pops below and a '#2 next week' tag slides in";

export const schema = z.object({
  comment: field.text("Comment bubble", "What would you build? 👇"),
  tag: field.text("Tag", "#2 next week: 3 more"),
  tagOn: field.word("Tag slides in on", "follow"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;

const CARDS = [
  { a: ASSETS.catcopter, cx: 490, cy: 260, s: 0.4 },
  { a: ASSETS.ghR2d2Full, cx: 420, cy: 2330, s: 0.34 },
  { a: ASSETS.ghNesFull, cx: 420, cy: 2020, s: 0.34 },
];

export default function Scene9({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const commentAt = wordFrame(words, "build", 23) - 16;
  const tagAt = wordFrame(words, params.tagOn, 42);
  const bubble = usePop(Math.max(4, commentAt));
  const tagP = interpolate(frame, [tagAt - 3, tagAt + 11], [0, 1], { ...clampAll, easing: OUT });
  const settle = interpolate(frame, [0, 16], [0, 1], { ...clampAll, easing: OUT });

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={620} fromY={640} />
      <Camera duration={durationInFrames} punchAt={[tagAt]}>
        {CARDS.map((card, i) => {
          const x = 130 + i * 270;
          const fromX = 515 - 125 + (i - 1) * 120;
          const float = Math.sin((frame + i * 9) / 14) * 7;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: interpolate(settle, [0, 1], [fromX, x]),
                top: 300,
                width: 230,
                height: 300,
                ...glass(230),
                borderRadius: 30,
                overflow: "hidden",
                padding: 8,
                boxSizing: "border-box",
                transform: `perspective(1200px) translateY(${float}px) rotateZ(${interpolate(settle, [0, 1], [(i - 1) * 8, (i - 1) * 3])}deg) scale(${interpolate(settle, [0, 1], [1.6, 1])})`,
                zIndex: i === 1 ? 2 : 1,
              }}
            >
              <div style={{ borderRadius: 22, overflow: "hidden" }}>
                <Pan src={card.a.src} nw={card.a.w} nh={card.a.h} w={214} h={284} cx={card.cx} cy={card.cy} s={card.s} />
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 130, width: 770, top: 680, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              padding: "32px 40px",
              borderRadius: 44,
              background: "#ffffff",
              boxShadow: `0 16px 50px rgba(0,0,0,0.45), 0 0 60px ${COLOR}55`,
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 50,
              color: LIGHT_TEXT,
              whiteSpace: "nowrap",
              opacity: bubble.opacity,
              transform: `scale(${bubble.scale}) translateY(${Math.sin(frame / 14) * 5}px)`,
              transformOrigin: "20% 100%",
            }}
          >
            {params.comment}
            <div
              style={{
                position: "absolute",
                left: 70,
                bottom: -22,
                width: 0,
                height: 0,
                borderLeft: "22px solid transparent",
                borderRight: "22px solid transparent",
                borderTop: "26px solid #ffffff",
              }}
            />
          </div>
        </div>
        <div style={{ position: "absolute", left: 130, width: 770, top: 920, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              height: 96,
              padding: "0 44px",
              borderRadius: 48,
              background: COLOR,
              boxShadow: `0 12px 40px ${COLOR}88`,
              display: "flex",
              alignItems: "center",
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 48,
              color: "#fff",
              whiteSpace: "nowrap",
              opacity: tagP,
              transform: `translateX(${(1 - tagP) * 500}px) rotate(${(1 - tagP) * 6 - 2}deg)`,
            }}
          >
            {params.tag}
          </div>
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
