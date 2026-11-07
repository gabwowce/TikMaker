import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, BUBBLE, cardStyle, clamp, EASE_IN, GREY_HI, IdeaBubble, mix, PHONE, Phone, Pipe, popScale, prog, Rail, Stage } from "./shared";

export const description =
  "The phone keeps playing as it moves left; an orange comment bubble pops up beside it and the TikMaker name lands under it";

export const schema = z.object({
  name: field.text("Name", "TikMaker"),
  commentOn: field.word("Comment pops on", "comment"),
  nameOn: field.word("Name appears on", "TikMaker"),
});
type Params = z.infer<typeof schema>;

const TO = { x: 100, y: 300, w: 380, h: 700 };
const COMMENT = { x: 530, y: 440, w: 450, h: 170 };

export default function Scene9({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const commentAt = Math.max(4, wordFrame(words, params.commentOn, 9) - 2);
  const nameAt = wordFrame(words, params.nameOn, 57) - 3;

  const move = prog(frame, 0, 16);
  const out = prog(frame, 0, 8, EASE_IN);
  const ph = {
    x: mix(PHONE.x, TO.x, move),
    y: mix(PHONE.y, TO.y, move),
    w: mix(PHONE.w, TO.w, move),
    h: mix(PHONE.h, TO.h, move),
  };
  const comment = popScale(frame, commentAt, 0.6);
  const commentIn = prog(frame, commentAt, 6);
  const nameIn = prog(frame, nameAt, 12);
  const commentHot = interpolate(frame, [nameAt, nameAt + 8], [1, 0], clamp);
  const underline = prog(frame, nameAt + 6, 12);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {out < 1 ? (
          <div style={{ opacity: 1 - out }}>
            <Pipe draw={1} glow={0.22} />
            <Rail morph={0} done={6} active={-1} />
            <IdeaBubble hot={0} style={{ translate: `${-out * 140}px 0px`, transformOrigin: `0px ${BUBBLE.h}px` }} />
          </div>
        ) : null}

        <Phone frame={frame + 60} {...ph} lit={1} hot={0.6 * (1 - move)} />

        {/* the comment */}
        {commentIn > 0 ? (
          <div
            style={{
              position: "absolute",
              left: COMMENT.x,
              top: COMMENT.y,
              width: COMMENT.w,
              height: COMMENT.h,
              ...cardStyle(COMMENT.w),
              borderRadius: 40,
              borderBottomLeftRadius: 10,
              background: "#24242c",
              display: "flex",
              alignItems: "center",
              gap: 28,
              padding: "0 36px",
              opacity: commentIn,
              scale: `${comment}`,
              transformOrigin: "0px 170px",
            }}
          >
            <div style={{ scale: `${bounceIn(frame, commentAt + 4, 10)}` }}>
              <svg width={100} height={100} viewBox="0 0 24 24" style={{ display: "block" }}>
                <path
                  d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"
                  fill={commentHot > 0.5 ? c.accent : GREY_HI}
                />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Bar w={230} h={26} color={GREY_HI} />
              <Bar w={160} h={26} color={GREY_HI} />
            </div>
          </div>
        ) : null}

        {/* the name */}
        {nameIn > 0 ? (
          <div
            style={{
              position: "absolute",
              left: COMMENT.x,
              width: COMMENT.w,
              top: 690,
              textAlign: "center",
              opacity: nameIn,
              translate: `0px ${(1 - nameIn) * 40}px`,
            }}
          >
            <div style={{ fontFamily: c.fontStrong, fontSize: 104 * c.widthFactor, color: c.text, lineHeight: 1.1 }}>{params.name}</div>
            <div style={{ margin: "14px auto 0", width: 340 * underline, height: 12, borderRadius: 6, background: c.accent, boxShadow: `0 0 24px ${c.accent}88` }} />
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
}
