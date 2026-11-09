import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SCENE_COLORS, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { CLIP_SRC, Camera, Clip, Headline, Scrubber, TopShade } from "./shared";

export const description =
  "The 3D clip full screen from its start in slow motion: cracks glow over the bulb, it bursts into sparks and a gold city rises, under '12 seconds. All code.' with a scrubber running";

export const schema = z.object({
  clip: field.recording(
    "3D clip (seconds 0–5)",
    "Your finished 12-s bulb→city clip (9:16 MP4). This scene plays seconds 0–5 at 0.67× speed: glowing cracks, the burst into shards and sparks, the gold city rising",
  ),
  head1: field.text("Headline", "*12* seconds."),
  head2: field.text("Second line", "All code."),
  numberOn: field.word("Number on", "twelve"),
});
type Params = z.infer<typeof schema>;

const RATE = 0.667;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const n = wordFrame(words, params.numberOn, 29);
  const s = wordFrame(words, "seconds", 39);
  const l1 = params.head1.split(" ").map((t, i) => ({ text: t, at: i === 0 ? n : s }));
  const l2 = params.head2.split(" ").map((t, i) => ({ text: t, at: s + 10 + i * 4 }));
  const burst = wordFrame(words, "bursts", 93);

  return (
    <AbsoluteFill style={{ background: "#0b0907" }}>
      <Camera duration={durationInFrames} punchAt={[burst]}>
        <Clip
          src={params.clip || CLIP_SRC}
          from={0}
          rate={RATE}
          record="Your 3D clip, seconds 0–5: cracks, burst, the gold city rising"
        />
      </Camera>
      <TopShade height={820} strength={0.82} />
      <Headline lines={[l1, l2]} top={270} size={104} color={SCENE_COLORS.amber} soft shadow />
      <Scrubber seconds={(frame * RATE) / 30} color={SCENE_COLORS.amber} label="3D" />
    </AbsoluteFill>
  );
}
