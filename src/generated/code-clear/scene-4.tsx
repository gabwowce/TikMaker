import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  clamp,
  EASE_OUT,
  FileCard,
  fileRects,
  GREY,
  ITEM_TERM,
  lerpRect,
  prog,
  rowRects,
  Slots,
  Terminal,
  type Rect,
} from "./shared";

export const description =
  "Slot 2 fills with /compact; a tall scrolling chat history squeezes down into one short block while the thread line from its first to its last message stays unbroken";

export const schema = z.object({
  command: field.text("Command", "/compact"),
  labelOn: field.word("Slot fills on", "compact"),
  longOn: field.word("History speeds up on", "long"),
  shrinkOn: field.word("History squeezes on", "shrinks"),
  threadOn: field.word("Thread lights up on", "thread"),
});
type Params = z.infer<typeof schema>;

const TALL: Rect = { x: 140, y: 410, w: 800, h: 660 };
const SHORT: Rect = { x: 140, y: 570, w: 800, h: 340 };
const START: Rect = { x: 90, y: 800, w: 900, h: 250 };

// one chat bubble: side, width share, rows
const BUBBLES = [
  [1, 0.7, 2],
  [0, 0.55, 1],
  [1, 0.8, 3],
  [0, 0.6, 2],
  [1, 0.5, 1],
  [0, 0.75, 2],
  [1, 0.65, 2],
  [0, 0.5, 1],
] as const;
const BUBBLE_GAP = 22;
const bubbleH = (rows: number) => 30 + rows * 22 + (rows - 1) * 14;
const LIST_H = BUBBLES.reduce((s, b) => s + bubbleH(b[2]) + BUBBLE_GAP, 0);

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const labelAt = wordFrame(words, params.labelOn, 19) - 3;
  const longAt = wordFrame(words, params.longOn, 66) - 3;
  const shrinkAt = wordFrame(words, params.shrinkOn, 103) - 3;
  const threadAt = wordFrame(words, params.threadOn, 159) - 3;

  const move = prog(frame, 0, 18);
  const from = rowRects(0);
  const to = rowRects(1);
  const label = prog(frame, labelAt, 10);
  const slotHot = frame >= labelAt && frame < shrinkAt ? 1 : 0;

  const sq = interpolate(frame, [shrinkAt, shrinkAt + 14], [0, 1], { ...clamp, easing: EASE_OUT });
  const win = lerpRect(lerpRect(ITEM_TERM, TALL, move), SHORT, sq);
  const threadHot = prog(frame, threadAt, 8);
  const summaryHot = frame >= shrinkAt && frame < threadAt ? 1 : 0;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const drift = Math.sin(frame / 24) * 5;

  // the history scrolls up; faster once it "gets long"
  const scroll = frame * 1.4 + interpolate(frame, [longAt, shrinkAt], [0, 260], clamp);
  const offset = scroll % LIST_H;
  const filesOut = interpolate(frame, [0, 8], [1, 0], clamp);

  const looks = from.map((r, i) => ({
    rect: lerpRect(r, to[i], move),
    label: i === 1 && label > 0 ? params.command : undefined,
    hot: i === 1 ? slotHot : 0,
    filled: i === 0 ? 1 : i === 1 ? label : 0,
    dim: i === 1 ? 1 : 0.5,
  }));

  const bodyH = win.h - 64;
  const threadX = 46;

  return (
    <AbsoluteFill style={{ scale: `${push}` }}>
      <Slots looks={looks} />

      {filesOut > 0
        ? fileRects(START.y, START.h).map((r, i) => (
            <FileCard key={i} rect={r} clean={1} style={{ opacity: filesOut * 0.55, translate: `0px ${(1 - filesOut) * 40}px` }} />
          ))
        : null}

      <Terminal
        rect={{ ...win, y: win.y + drift * move }}
        style={{ border: summaryHot ? `3px solid ${c.accent}` : undefined }}
      >
        {/* the history (bubbles), clipped and scrolling */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: bodyH,
            overflow: "hidden",
            opacity: (1 - sq) * move,
          }}
        >
          <div style={{ position: "absolute", left: threadX + 44, right: 36, top: 24 - offset }}>
            {[...BUBBLES, ...BUBBLES, ...BUBBLES].map(([side, share, rows], i) => (
              <div key={i} style={{ display: "flex", justifyContent: side ? "flex-end" : "flex-start", marginBottom: BUBBLE_GAP }}>
                <div
                  style={{
                    width: `${share * 100}%`,
                    height: bubbleH(rows),
                    boxSizing: "border-box",
                    padding: "15px 22px",
                    borderRadius: 22,
                    background: side ? "#2a2c32" : "rgba(255,255,255,0.04)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {Array.from({ length: rows }).map((_, k) => (
                    <Bar key={k} w={`${k === rows - 1 && rows > 1 ? 60 : 100}%`} h={22} color={side ? "#454850" : GREY} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* the summary block it squeezes into */}
        <div
          style={{
            position: "absolute",
            left: threadX + 44,
            right: 36,
            top: 30,
            bottom: 30,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 24,
            opacity: sq,
            scale: `${interpolate(sq, [0, 1], [1.2, 1])} ${interpolate(sq, [0, 1], [2.2, 1])}`,
          }}
        >
          <Bar w="92%" h={28} color="#4a4d55" />
          <Bar w="78%" h={28} color="#4a4d55" />
          <Bar w="54%" h={28} color="#4a4d55" />
        </div>

        {/* the thread: first message → last message, never broken */}
        <div
          style={{
            position: "absolute",
            left: threadX - 4,
            top: 30,
            bottom: 30,
            width: 8,
            borderRadius: 4,
            background: threadHot > 0.5 ? c.accent : "#5a5d66",
            boxShadow: `0 0 ${threadHot * 26}px ${c.accent}`,
            opacity: move,
          }}
        />
        {[0, 1].map((end) => (
          <div
            key={end}
            style={{
              position: "absolute",
              left: threadX - 15,
              ...(end ? { bottom: 18 } : { top: 18 }),
              width: 30,
              height: 30,
              borderRadius: 15,
              background: threadHot > 0.5 ? c.accent : "#8a8d96",
              opacity: move,
              scale: `${1 + 0.25 * Math.sin(Math.PI * prog(frame, threadAt, 12))}`,
            }}
          />
        ))}
      </Terminal>
    </AbsoluteFill>
  );
}
