import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Arrow, clamp, IdeaCard, PhoneVideo, popScale, prog, Stage } from "./shared";

export const description =
  "Split screen: on the left one line gets typed into a big, bright idea box, an orange arrow points right, and the finished vertical video lights up and plays";

export const schema = z.object({
  video: field.recording(
    "The finished video",
    "The finished 9:16 video of this project playing in TikMaker's preview (or the exported MP4), 3 seconds, no UI around it",
  ),
  typedOn: field.word("Idea typed on", "typed"),
  videoOn: field.word("Video lights up on", "This"),
});
type Params = z.infer<typeof schema>;

// Layout: the pair is centred in the picture zone; the video card's right
// edge (glow included) ends at about x 860; everything stays in y 300–950.
const MID_Y = 625;
const IDEA_W = 340;
const IDEA_SCALE = 1.2; // the idea box, 20 % bigger → 408 px wide
const IDEA_H = 270; // the idea card's own height before the scale
const IDEA_LEFT = 148;
const ARROW_LEFT = IDEA_LEFT + IDEA_W * IDEA_SCALE + 10;
const ARROW_LEN = 44;
const PHONE_LEFT = ARROW_LEFT + ARROW_LEN + 12;
const PHONE_W = 826 - PHONE_LEFT;
const PHONE_H = (PHONE_W * 16) / 9;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typedOn, 5) - 2;
  const videoAt = wordFrame(words, params.videoOn, 37) - 3;

  const typed = interpolate(frame, [typeAt, typeAt + 26], [0, 1], clamp);
  const lit = prog(frame, videoAt, 10);
  const arrow = prog(frame, videoAt - 4, 10);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* left: the one sentence – as bright as the video card */}
        <div
          style={{
            position: "absolute",
            left: IDEA_LEFT,
            top: MID_Y - (IDEA_H * IDEA_SCALE) / 2,
            scale: `${IDEA_SCALE}`,
            transformOrigin: "0 0",
            borderRadius: IDEA_W * 0.038,
            boxShadow: `0 0 36px ${c.accent}44`,
          }}
        >
          <IdeaCard w={IDEA_W} typed={typed} frame={frame} hot={1} />
        </div>
        {/* the arrow */}
        <div style={{ position: "absolute", left: ARROW_LEFT, top: MID_Y - 20 }}>
          <Arrow len={ARROW_LEN} p={arrow} color={c.accent} />
        </div>
        {/* right: the video it made */}
        <div
          style={{
            position: "absolute",
            left: PHONE_LEFT,
            top: MID_Y - PHONE_H / 2,
            opacity: interpolate(lit, [0, 1], [0.45, 1]),
            scale: `${frame >= videoAt ? popScale(frame, videoAt, 0.97) : 0.97}`,
          }}
        >
          {params.video ? (
            <RecordingSlot src={params.video} record="" width={PHONE_W} height={PHONE_H} style={{ borderRadius: 34, border: `4px solid ${c.accent}` }} />
          ) : (
            <PhoneVideo w={PHONE_W} frame={frame} hot={lit} />
          )}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
