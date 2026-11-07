import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  cardStyle,
  clamp,
  columnRects,
  EASE_BOUNCE,
  lerpRect,
  popScale,
  prog,
  rowRects,
  Slots,
  Terminal,
  type Rect,
} from "./shared";

export const description =
  "The three filled slots shrink into a column on the left; a comment bubble pops up beside them, then a Follow button lights orange and pulses";

export const schema = z.object({
  button: field.text("Button", "Follow"),
  commentOn: field.word("Comment bubble on", "comment"),
  followOn: field.word("Follow button lights on", "follow"),
});
type Params = z.infer<typeof schema>;

const PLAN: Rect = { x: 90, y: 430, w: 590, h: 585 };
const BUBBLE: Rect = { x: 500, y: 340, w: 490, h: 330 };
const BUTTON: Rect = { x: 500, y: 790, w: 490, h: 170 };

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const commentAt = wordFrame(words, params.commentOn, 19) - 3;
  const followAt = wordFrame(words, params.followOn, 122) - 3;

  const move = prog(frame, 0, 20);
  const from = rowRects(2);
  const to = columnRects();
  const prevOut = interpolate(frame, [0, 8], [1, 0], clamp);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const drift = Math.sin(frame / 24) * 5;

  const bubbleIn = prog(frame, commentAt, 12, EASE_BOUNCE);
  const followHot = frame >= followAt;
  const bubbleHot = frame >= commentAt && !followHot;
  const buttonIn = prog(frame, commentAt + 10, 12);
  const pulse = followHot ? 1 + 0.05 * Math.max(0, Math.sin(((frame - followAt) / 30) * Math.PI * 2)) : 1;

  const looks = from.map((r, i) => ({
    rect: lerpRect(r, to[i], move),
    filled: 1,
    dim: interpolate(move, [0, 1], [i === 2 ? 1 : 0.5, 0.7]),
  }));

  return (
    <AbsoluteFill style={{ scale: `${push}` }}>
      {prevOut > 0 ? <Terminal rect={PLAN} style={{ opacity: prevOut * 0.5 }} /> : null}

      <Slots looks={looks.map((l) => ({ ...l, rect: { ...l.rect, y: l.rect.y + drift * move } }))} />

      {/* the comment bubble */}
      <div
        style={{
          position: "absolute",
          left: BUBBLE.x,
          top: BUBBLE.y,
          width: BUBBLE.w,
          height: BUBBLE.h,
          opacity: prog(frame, commentAt, 6) * (followHot ? 0.5 : 1),
          scale: `${bubbleIn}`,
          transformOrigin: "20% 100%",
          translate: `0px ${-drift}px`,
        }}
      >
        <div
          style={{
            ...cardStyle(BUBBLE.w),
            position: "absolute",
            inset: 0,
            borderRadius: 48,
            border: bubbleHot ? `3px solid ${c.accent}` : "1px solid rgba(255,255,255,0.12)",
            padding: "52px 44px",
            display: "flex",
            gap: 30,
          }}
        >
          <div style={{ width: 96, height: 96, borderRadius: 48, background: bubbleHot ? c.accent : "#4a4d55", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1, paddingTop: 10 }}>
            <Bar w="90%" h={28} color="#4a4d55" />
            <Bar w="100%" h={28} />
            <Bar w="60%" h={28} />
          </div>
        </div>
        {/* tail */}
        <svg width={90} height={70} style={{ position: "absolute", left: 70, top: BUBBLE.h - 4 }}>
          <path d="M 0 0 L 70 0 L 10 62 Z" fill="#1c1e23" stroke={bubbleHot ? c.accent : "rgba(255,255,255,0.12)"} strokeWidth={bubbleHot ? 3 : 1} />
          <rect x={2} y={-4} width={66} height={6} fill="#1c1e23" />
        </svg>
      </div>

      {/* the follow button */}
      <div
        style={{
          position: "absolute",
          left: BUTTON.x,
          top: BUTTON.y,
          width: BUTTON.w,
          height: BUTTON.h,
          ...cardStyle(BUTTON.w),
          borderRadius: BUTTON.h / 2,
          background: followHot ? c.accent : "#2a2c32",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          opacity: buttonIn * (followHot ? 1 : 0.6),
          scale: `${popScale(frame, commentAt + 10) * pulse}`,
          boxShadow: followHot
            ? `0 0 ${50 * pulse}px ${c.accent}88, 0 24px 64px rgba(0,0,0,0.5)`
            : "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ fontFamily: c.fontStrong, fontSize: 84, color: followHot ? c.bg : c.text, lineHeight: 1, marginTop: 6 }}>+</div>
        <div style={{ fontFamily: c.fontStrong, fontSize: 72 * c.widthFactor, color: followHot ? c.bg : c.text, paddingTop: 8 }}>
          {params.button}
        </div>
      </div>
    </AbsoluteFill>
  );
}
