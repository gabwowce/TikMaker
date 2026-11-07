import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  cardStyle,
  ChatRows,
  clamp,
  EASE_IN,
  FileCard,
  fileRects,
  GREY,
  lerpRect,
  prog,
  pulse,
  rectStyle,
  rowRects,
  S3_FILES_H,
  S3_FILES_Y,
  S3_TERM,
  Slot,
  Stage,
  Terminal,
  type Rect,
} from "./shared";

export const description =
  "Slot 2 fills with /compact; a tall scrolling chat history squeezes down into a short block inside the outline of its old size, while an orange thread line from start to finish stays unbroken";

export const schema = z.object({
  command: field.text("The command", "/compact"),
  slotOn: field.word("Slot fills on", "compact"),
  growOn: field.word("History grows on", "long"),
  shrinkOn: field.word("Shrinks on", "shrinks"),
  threadOn: field.word("Thread lights up on", "without"),
});
type Params = z.infer<typeof schema>;

const SHORT: Rect = { x: 140, y: 470, w: 800, h: 380 };
const TALL: Rect = { x: 140, y: 400, w: 800, h: 660 };
const SMALL: Rect = { x: 140, y: 600, w: 800, h: 250 };

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const slotAt = wordFrame(words, params.slotOn, 19) - 3;
  const growAt = wordFrame(words, params.growOn, 66) - 3;
  const shrinkAt = wordFrame(words, params.shrinkOn, 103) - 3;
  const threadAt = wordFrame(words, params.threadOn, 131) - 3;

  // the row: slot 1 wide → slot 2 wide
  const swap = prog(frame, slotAt, 12);
  const from = rowRects(0);
  const to = rowRects(1);
  const slotHot = interpolate(frame, [slotAt, slotAt + 6, threadAt, threadAt + 8], [0, 1, 1, 0], clamp);

  // the previous scene's terminal and files leave
  const out = prog(frame, 0, 9, EASE_IN);

  // the history: enters short, grows tall, then squeezes small
  const enter = prog(frame, 8, 12);
  const grow = prog(frame, growAt, 22);
  const squeeze = prog(frame, shrinkAt, 16);
  const card = lerpRect(lerpRect(SHORT, TALL, grow), SMALL, squeeze);
  const scroll = frame * 1.6 + grow * 260;
  const longRows = 1 - prog(frame, shrinkAt + 4, 8);
  const summary = prog(frame, shrinkAt + 8, 10);
  const ghost = prog(frame, shrinkAt + 4, 10) * 0.35;

  const thread = prog(frame, threadAt, 8);
  const glow = thread * (0.6 + 0.4 * pulse(frame, 30));
  const threadColor = thread > 0.5 ? c.accent : "#5a5d66";
  const dot = 34;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {from.map((r, i) => (
          <Slot
            key={i}
            n={i + 1}
            look={{
              rect: lerpRect(r, to[i], swap),
              label: i === 0 ? "/rewind" : i === 1 ? params.command : undefined,
              hot: i === 1 ? slotHot : 0,
              filled: i === 0 ? 1 : i === 1 ? Math.max(swap, prog(frame, threadAt, 8)) : 0,
              dim: i === 1 ? 1 : 0.5,
            }}
          />
        ))}

        {out < 1 ? (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - out, translate: `0px ${out * 60}px` }}>
            <Terminal rect={S3_TERM} style={{ opacity: 0.4 }} />
            {fileRects(S3_FILES_Y, S3_FILES_H).map((r, i) => (
              <FileCard key={i} rect={r} clean={1} />
            ))}
          </div>
        ) : null}

        {/* the outline of the old, long session */}
        <div
          style={{
            ...rectStyle(TALL),
            borderRadius: 30,
            border: "4px dashed rgba(255,255,255,0.5)",
            boxSizing: "border-box",
            opacity: ghost,
          }}
        />

        <div
          style={{
            ...rectStyle(card),
            ...cardStyle(card.w),
            opacity: enter,
            scale: `${interpolate(enter, [0, 1], [0.95, 1])}`,
          }}
        >
          {/* long history */}
          <div
            style={{
              position: "absolute",
              left: 130,
              right: 50,
              top: 30,
              bottom: 30,
              overflow: "hidden",
              opacity: longRows,
              maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
            }}
          >
            <ChatRows width={620} offset={scroll % (12 * 74)} />
          </div>
          {/* the compact summary */}
          <div
            style={{
              position: "absolute",
              left: 130,
              right: 50,
              top: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 30,
              opacity: summary,
              translate: `0px ${(1 - summary) * 16}px`,
            }}
          >
            {[0.92, 0.74, 0.55].map((f, i) => (
              <Bar key={i} w={620 * f} h={32} color={i === 0 ? "#55585f" : GREY} />
            ))}
          </div>
          {/* the thread: start → finish, never broken */}
          <div
            style={{
              position: "absolute",
              left: 62,
              top: 40 + dot / 2,
              bottom: 40 + dot / 2,
              width: 10,
              marginLeft: -5,
              borderRadius: 5,
              background: threadColor,
              boxShadow: `0 0 ${24 * glow}px ${c.accent}`,
            }}
          />
          {[0, 1].map((k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: 62 - dot / 2,
                ...(k === 0 ? { top: 40 } : { bottom: 40 }),
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                background: threadColor,
                boxShadow: `0 0 ${30 * glow}px ${c.accent}`,
              }}
            />
          ))}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
