import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Arrow, clamp, IdeaCard, PhoneVideo, popScale, prog, Stage } from "./shared";

export const description =
  "Split screen: on the left one line gets typed into the idea box, an orange arrow points right, and the finished vertical video lights up and plays";

export const schema = z.object({
  video: field.recording(
    "The finished video",
    "The finished 9:16 video of this project playing in TikMaker's preview (or the exported MP4), 3 seconds, no UI around it",
  ),
  typedOn: field.word("Idea typed on", "typed"),
  videoOn: field.word("Video lights up on", "This"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typedOn, 5) - 2;
  const videoAt = wordFrame(words, params.videoOn, 37) - 3;

  const typed = interpolate(frame, [typeAt, typeAt + 26], [0, 1], clamp);
  const lit = prog(frame, videoAt, 10);
  const arrow = prog(frame, videoAt - 4, 10);
  const phoneW = 330;
  const phoneH = (phoneW * 16) / 9;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* left: the one sentence */}
        <div style={{ position: "absolute", left: 140, top: 560, opacity: interpolate(lit, [0, 1], [1, 0.45]) }}>
          <IdeaCard w={340} typed={typed} frame={frame} hot={1 - lit} />
        </div>
        {/* the arrow */}
        <div style={{ position: "absolute", left: 494, top: 640 }}>
          <Arrow len={60} p={arrow} color={c.accent} />
        </div>
        {/* right: the video it made */}
        <div
          style={{
            position: "absolute",
            left: 568,
            top: 340,
            opacity: interpolate(lit, [0, 1], [0.45, 1]),
            scale: `${frame >= videoAt ? popScale(frame, videoAt, 0.97) : 0.97}`,
          }}
        >
          {params.video ? (
            <RecordingSlot src={params.video} record="" width={phoneW} height={phoneH} style={{ borderRadius: 34, border: `4px solid ${c.accent}` }} />
          ) : (
            <PhoneVideo w={phoneW} frame={frame} hot={lit} />
          )}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
