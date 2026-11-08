import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, cardStyle, clamp, prog, pulse, Stage, GREY, Sparkle } from "./shared";

export const description =
  "Split screen: on the left one orange line types itself into the idea box, an arrow draws across, and on the right the finished vertical video plays";

export const schema = z.object({
  video: field.recording(
    "Finished video playing",
    "TikMaker editor: crop to ONLY the 9:16 preview player while it plays the finished video with its kinetic captions – 3 s, start mid-video on a moving frame",
  ),
  typedOn: field.word("The line types on", "typed"),
  videoOn: field.word("The video lights up on", "This"),
});
type Params = z.infer<typeof schema>;

const IDEA = { x: 90, y: 520, w: 400, h: 250 };
const VIDEO = { x: 600, y: 270, w: 390, h: 693 };

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typedOn, 5) - 2;
  const videoAt = wordFrame(words, params.videoOn, 37) - 3;

  // the one sentence types in as one orange bar
  const typed = interpolate(frame, [typeAt, typeAt + 22], [0, 1], clamp);
  const caret = typed < 1 || Math.floor(frame / 12) % 2 === 0;
  const arrow = prog(frame, videoAt - 8, 12);
  const lit = prog(frame, videoAt, 10);
  // the focus moves from the sentence to the video
  const ideaHot = 1 - lit * 0.6;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the idea box */}
        <div
          style={{
            position: "absolute",
            left: IDEA.x,
            top: IDEA.y,
            width: IDEA.w,
            height: IDEA.h,
            ...cardStyle(IDEA.w),
            border: `3px solid rgba(255,112,36,${0.9 * ideaHot})`,
            padding: 34,
            display: "flex",
            flexDirection: "column",
            gap: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Sparkle size={34} color={c.textSoft} />
            <Bar w={130} h={18} color={GREY} />
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 18,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              padding: "0 22px",
              gap: 8,
            }}
          >
            <Bar w={260 * typed} h={30} color={c.accent} style={{ opacity: 0.4 + 0.6 * ideaHot }} />
            <div style={{ width: 5, height: 52, borderRadius: 3, background: c.text, opacity: caret ? 0.9 : 0 }} />
          </div>
        </div>

        {/* the arrow: one sentence → this video */}
        <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
          <path
            d="M 505 645 L 575 645"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - arrow}
            stroke={c.textSoft}
            strokeWidth={10}
            strokeLinecap="round"
          />
          <path
            d="M 556 624 L 580 645 L 556 666"
            fill="none"
            stroke={c.textSoft}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={arrow > 0.9 ? 1 : 0}
          />
        </svg>

        {/* the finished video (a soft glow behind it, nothing over it) */}
        <div
          style={{
            position: "absolute",
            left: VIDEO.x - 60,
            top: VIDEO.y - 60,
            width: VIDEO.w + 120,
            height: VIDEO.h + 120,
            borderRadius: 80,
            background: `radial-gradient(closest-side, rgba(255,112,36,${0.35 * lit * (0.7 + 0.3 * pulse(frame))}), transparent)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: VIDEO.x,
            top: VIDEO.y,
            opacity: interpolate(lit, [0, 1], [0.55, 1]),
            scale: `${interpolate(lit, [0, 0.6, 1], [0.97, 1.02, 1])}`,
          }}
        >
          <RecordingSlot src={params.video} record="TikMaker preview playing the finished video – crop to the 9:16 player" width={VIDEO.w} height={VIDEO.h} />
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
