import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  cardStyle,
  clamp,
  columnRects,
  EASE_IN,
  GREY,
  lerpRect,
  prog,
  pulse,
  rectStyle,
  rowRects,
  Slot,
  Stage,
  type Rect,
} from "./shared";

export const description =
  "The three filled command slots shrink into a column on the left; a comment bubble pops up beside them, then a big Follow button lights orange and pulses";

export const schema = z.object({
  button: field.text("Button", "+ Follow"),
  commentOn: field.word("Comment bubble on", "comment"),
  followOn: field.word("Follow lights up on", "follow"),
});
type Params = z.infer<typeof schema>;

const BUBBLE: Rect = { x: 450, y: 300, w: 540, h: 290 };
const BUTTON: Rect = { x: 450, y: 720, w: 540, h: 170 };

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const commentAt = wordFrame(words, params.commentOn, 19) - 3;
  const followAt = wordFrame(words, params.followOn, 122) - 3;

  const move = prog(frame, 6, 16);
  const from = rowRects(2);
  const to = columnRects();

  const out = prog(frame, 0, 9, EASE_IN);
  const bubble = bounceIn(frame, commentAt, 12);
  const bubbleHot = interpolate(frame, [commentAt, commentAt + 6, followAt, followAt + 8], [0, 1, 1, 0], clamp);
  const btnIn = prog(frame, commentAt + 14, 12);
  const lit = prog(frame, followAt, 6);
  const btnPulse = 1 + lit * 0.04 * pulse(frame - followAt, 30);
  const press = interpolate(frame, [followAt, followAt + 4, followAt + 10], [1, 0.94, 1], clamp);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {from.map((r, i) => (
          <Slot
            key={i}
            n={i + 1}
            look={{
              rect: lerpRect(r, to[i], move),
              label: i === 2 ? "Plan mode" : undefined,
              labelFont: "strong",
              filled: 1,
              dim: interpolate(move, [0, 1], [i === 2 ? 1 : 0.5, 0.6]),
            }}
          />
        ))}

        {/* scene 5's plan and files leave */}
        {out < 1 ? (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - out, translate: `0px ${out * 60}px` }}>
            <div style={{ ...rectStyle({ x: 90, y: 400, w: 570, h: 650 }), ...cardStyle(570), opacity: 0.5 }} />
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ ...rectStyle({ x: 740, y: 410 + i * 225, w: 250, h: 190 }), ...cardStyle(250) }} />
            ))}
          </div>
        ) : null}

        {/* the comment bubble */}
        <div
          style={{
            ...rectStyle(BUBBLE),
            opacity: bubble > 0 ? Math.min(1, bubble * 1.5) * interpolate(lit, [0, 1], [1, 0.55]) : 0,
            scale: `${interpolate(bubble, [0, 1], [0.6, 1])}`,
            transformOrigin: "20% 100%",
          }}
        >
          <div
            style={{
              ...cardStyle(BUBBLE.w),
              position: "absolute",
              inset: 0,
              borderRadius: 44,
              border: bubbleHot > 0.02 ? `3px solid rgba(255,112,36,${bubbleHot})` : "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 34,
              padding: "0 44px",
            }}
          >
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 55,
                flexShrink: 0,
                background: bubbleHot > 0.5 ? c.accent : "#4a4d55",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <Bar w={300} h={30} color="#55585f" />
              <Bar w={230} h={26} color={GREY} />
              <Bar w={160} h={26} color={GREY} />
            </div>
          </div>
          {/* tail */}
          <div
            style={{
              position: "absolute",
              left: 70,
              bottom: -34,
              width: 0,
              height: 0,
              borderLeft: "0px solid transparent",
              borderRight: "52px solid transparent",
              borderTop: `40px solid ${bubbleHot > 0.5 ? c.accent : "#1c1e23"}`,
            }}
          />
        </div>

        {/* the follow button */}
        <div
          style={{
            ...rectStyle(BUTTON),
            borderRadius: BUTTON.h / 2,
            background: lit > 0.5 ? c.accent : "#2a2c32",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5), 0 0 ${70 * lit}px ${c.accent}88`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: c.fontStrong,
            fontSize: 76 * c.widthFactor,
            color: lit > 0.5 ? c.bg : c.textSoft,
            paddingTop: 6,
            boxSizing: "border-box",
            opacity: btnIn,
            translate: `0px ${(1 - btnIn) * 30}px`,
            scale: `${btnPulse * press}`,
          }}
        >
          {params.button}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
