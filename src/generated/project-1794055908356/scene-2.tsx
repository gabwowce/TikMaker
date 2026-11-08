import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, cardStyle, ChatBubble, clamp, EASE_INOUT, GREY, GREY_HI, mix, popScale, prog, Stage } from "./shared";

export const description =
  "A chat question and an AI answer bubble; then the answer's lines are copied by hand into a document while a pile of unfinished task cards grows beside it and lights up orange";

export const schema = z.object({
  tasks: field.number("Task cards in the pile", 4, { min: 2, max: 5 }),
  answerOn: field.word("Answer appears on", "chatbot"),
  copyOn: field.word("Copying starts on", "and"),
  pileOn: field.word("Pile lights up on", "work"),
});
type Params = z.infer<typeof schema>;

const USER = { x: 470, y: 240, w: 520, h: 120 };
const ANSWER = { x: 90, y: 400, w: 640, h: 230 };
const DOC = { x: 90, y: 700, w: 430, h: 360 };
const PILE = { x: 580, w: 410, bottom: 1060, cardH: 76, gap: 14 };
const ANSWER_BARS = [0.9, 0.75, 0.5];

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const answerAt = wordFrame(words, params.answerOn, 39) - 3;
  const copyAt = wordFrame(words, params.copyOn, 113, 8) - 4;
  const pileAt = wordFrame(words, params.pileOn, 150) - 3;

  const userIn = popScale(frame, 2);
  const ansIn = popScale(frame, answerAt);
  const chatDim = interpolate(frame, [copyAt, copyAt + 10], [1, 0.4], clamp);
  const docIn = popScale(frame, copyAt - 4);
  const pileHot = prog(frame, pileAt, 8);

  // three answer lines copied one by one into the document
  const copies = ANSWER_BARS.map((_, i) => copyAt + 4 + i * 11);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <div style={{ opacity: chatDim }}>
          <ChatBubble {...USER} side="right" bars={[0.8]} bg="#2c2c34" style={{ scale: `${userIn}`, opacity: prog(frame, 2, 6) }} />
          <ChatBubble
            {...ANSWER}
            side="left"
            bars={ANSWER_BARS}
            barColor={frame < copyAt ? "#8a8d96" : GREY_HI}
            style={{ scale: `${ansIn}`, opacity: prog(frame, answerAt, 6), transformOrigin: "0% 100%" }}
          />
        </div>

        {/* the document you fill by hand */}
        <div
          style={{
            position: "absolute",
            left: DOC.x,
            top: DOC.y,
            width: DOC.w,
            height: DOC.h,
            ...cardStyle(DOC.w),
            scale: `${docIn}`,
            opacity: prog(frame, copyAt - 4, 6),
            padding: 44,
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <Bar w="45%" h={28} color={GREY_HI} />
          {ANSWER_BARS.map((b, i) => (
            <Bar key={i} w={(DOC.w - 88) * b * prog(frame, copies[i] + 10, 4)} h={22} color={GREY} />
          ))}
        </div>

        {/* bars flying from the answer into the document */}
        {ANSWER_BARS.map((b, i) => {
          const t = interpolate(frame, [copies[i], copies[i] + 12], [0, 1], { ...clamp, easing: EASE_INOUT });
          if (t <= 0 || t >= 1) return null;
          const fromX = ANSWER.x + 44;
          const fromY = ANSWER.y + 61 + i * 42;
          const toX = DOC.x + 44;
          const toY = DOC.y + 44 + 58 + i * 52;
          const arc = Math.sin(t * Math.PI) * -40;
          return (
            <Bar
              key={i}
              w={mix((ANSWER.w - 88) * b, (DOC.w - 88) * b, t)}
              h={24}
              color={c.text}
              style={{ position: "absolute", left: mix(fromX, toX, t), top: mix(fromY, toY, t) + arc, opacity: 0.9 }}
            />
          );
        })}

        {/* the pile of tasks still waiting */}
        {Array.from({ length: params.tasks }, (_, i) => {
          const at = copyAt + 2 + i * 7;
          const s = bounceIn(frame, at, 10);
          const top = PILE.bottom - (i + 1) * PILE.cardH - i * PILE.gap;
          const tilt = [1.5, -2, 2.5, -1.5, 2][i % 5];
          const shake = pileHot > 0 && pileHot < 1 ? Math.sin(frame * 1.6 + i) * 3 : 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: PILE.x,
                top,
                width: PILE.w,
                height: PILE.cardH,
                ...cardStyle(PILE.w),
                borderRadius: 18,
                background: "#24242c",
                border: pileHot > 0.5 ? `3px solid ${c.accent}` : "1px solid rgba(255,255,255,0.12)",
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 16px 40px rgba(0,0,0,0.45)${pileHot > 0.5 ? `, 0 0 40px ${c.accent}44` : ""}`,
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "0 26px",
                rotate: `${tilt + shake}deg`,
                scale: `${s}`,
                opacity: interpolate(s, [0, 0.3], [0, 1], clamp),
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `4px solid ${pileHot > 0.5 ? c.accent : GREY_HI}`,
                  boxSizing: "border-box",
                }}
              />
              <Bar w={PILE.w * [0.55, 0.45, 0.6, 0.4, 0.5][i % 5]} h={20} color={pileHot > 0.5 ? c.accent : GREY_HI} />
            </div>
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
