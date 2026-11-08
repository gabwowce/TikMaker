import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Badge, ChatBubble, clamp, EASE_IN, EASE_OUT, prog, Sheet, Stage } from "./shared";

export const description =
  "In front of the finished, blurred calendar the chat bubble gets struck through in orange and falls away; the 'Content Strategist' ID badge slides in and takes its place";

export const schema = z.object({
  title: field.text("Badge title", "Content Strategist"),
  strikeOn: field.word("Strike-through on", "not"),
  badgeOn: field.word("Badge lands on", "employee"),
});
type Params = z.infer<typeof schema>;

const BUBBLE = { x: 220, y: 500, w: 640, h: 230 };
const BADGE_POS = { x: 160, y: 440, w: 760, h: 400 };

export default function Scene10({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const strikeAt = wordFrame(words, params.strikeOn, 9) - 2;
  const badgeAt = wordFrame(words, params.badgeOn, 65) - 3;
  const dropAt = Math.min(strikeAt + 30, badgeAt - 16);

  const strike = interpolate(frame, [strikeAt, strikeAt + 10], [0, 1], { ...clamp, easing: EASE_OUT });
  const drop = interpolate(frame, [dropAt, dropAt + 12], [0, 1], { ...clamp, easing: EASE_IN });
  const slide = interpolate(frame, [badgeAt - 12, badgeAt], [1, 0], { ...clamp, easing: EASE_OUT });
  const settle = interpolate(frame, [badgeAt - 2, badgeAt + 4, badgeAt + 10], [1, 1.025, 1], clamp);

  const sx = BUBBLE.x + 30;
  const sy = BUBBLE.y + BUBBLE.h - 40;
  const ex = BUBBLE.x + BUBBLE.w - 30;
  const ey = BUBBLE.y + 40;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the finished calendar, behind */}
        <Sheet x={90} y={250} w={900} h={760} rows={7} fill={() => 1} style={{ opacity: 0.3, filter: "blur(5px)" }} />

        {drop < 1 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              translate: `0px ${drop * 260}px`,
              rotate: `${drop * 8}deg`,
              opacity: (1 - drop) * prog(frame, 0, 6),
            }}
          >
            <ChatBubble {...BUBBLE} side="left" bars={[0.9, 0.75, 0.5]} />
            <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
              <line
                x1={sx}
                y1={sy}
                x2={sx + (ex - sx) * strike}
                y2={sy + (ey - sy) * strike}
                stroke={c.accent}
                strokeWidth={16}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 12px ${c.accent}aa)` }}
              />
            </svg>
          </div>
        ) : null}

        <Badge
          {...BADGE_POS}
          title={params.title}
          titleIn={1}
          hot={prog(frame, badgeAt, 8)}
          style={{
            translate: `${slide * 900}px 0px`,
            scale: `${settle}`,
            opacity: frame < badgeAt - 12 ? 0 : 1,
          }}
        />
      </Stage>
    </AbsoluteFill>
  );
}
