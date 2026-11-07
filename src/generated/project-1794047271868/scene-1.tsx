import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { EASE_OUT, alpha, clamp, popScale, prog } from "./shared";

export const description =
  "The real TikMaker editor fills the frame: one sentence is typed into the 'Video idea' box, then the finished vertical video plays in the preview next to it";

export const schema = z.object({
  demo: field.recording(
    "Idea typed → finished video",
    "TikMaker editor, empty project, agent panel on the right. Start recording, click the 'Video idea' box and type one sentence (e.g. 'How I make a TikTok with one sentence'). Then cut to the same editor with the finished video: press play in the vertical preview so the video with its captions plays. Stop after ~2 s of playback. Crop so the idea box and the preview sit side by side.",
  ),
  glowOn: field.word("Frame lights up on", "finished"),
});
type Params = z.infer<typeof schema>;

const W = 900;
const H = 860;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const glowAt = wordFrame(words, params.glowOn, 69) - 3;
  const glow = prog(frame, glowAt, 10);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: (1080 - W) / 2,
          top: 210,
          width: W,
          height: H,
          borderRadius: 28,
          scale: `${popScale(frame, 0, 0.94) * push}`,
          opacity: interpolate(frame, [0, 6], [0, 1], { ...clamp, easing: EASE_OUT }),
          boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5), 0 0 ${70 * glow}px ${alpha(c.accent, 0.4 * glow)}`,
          outline: `4px solid ${alpha(c.accent, glow)}`,
          outlineOffset: 6,
        }}
      >
        <RecordingSlot src={params.demo} record="Type one sentence into 'Video idea', then the finished vertical video plays in the preview" width={W} height={H} />
      </div>
    </AbsoluteFill>
  );
}
