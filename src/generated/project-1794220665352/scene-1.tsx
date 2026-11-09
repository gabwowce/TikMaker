import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { SCENE_COLORS, asset, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { CLIP_SRC, Camera, Clip, Headline, TopShade, clampAll, glass, usePop } from "./shared";

export const description =
  "The 3D clip full screen from the moment the city has risen: the little city glowing gold, then by day with cars, while '3D took YEARS' punches in and swaps to 'Now just ask' + a Claude Code chip";

export const schema = z.object({
  clip: field.recording(
    "3D clip (seconds 4.2–7)",
    "Your finished 12-s bulb→city clip (9:16 MP4). This scene plays seconds 4.2–7 at 0.7× speed: the city just risen out of the light, cooling from gold to day, cars starting to drive",
  ),
  line1: field.text("Headline", "3D took *YEARS*"),
  line2: field.text("Second headline", "Now just *ask*"),
  chip: field.text("Chip", "Claude Code"),
  swapOn: field.word("Headline swaps on", "Now"),
  chipOn: field.word("Chip pops on", "Claude"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const swap = wordFrame(words, params.swapOn, 55);
  const chipAt = wordFrame(words, params.chipOn, 82);

  // Spread the headline words over the spoken words they match (fallbacks: even spacing).
  const toWords = (text: string, from: number, after: number) =>
    text.split(" ").map((t, i) => ({
      text: t,
      at: Math.min(wordFrame(words, t.replace(/\*/g, ""), from + i * 9, after), from + 40),
    }));
  const a = toWords(params.line1, 0, 0).map((w, i) => (i === 0 ? { ...w, at: Math.max(2, w.at) } : w));
  // Hard swap: line 1 slides up and is gone by swap - 2; line 2 starts popping at swap (its words appear from at - 2).
  const b = toWords(params.line2, swap, words.findIndex((w) => w.frame >= swap)).map((w) => ({
    ...w,
    at: Math.max(swap + 2, w.at),
  }));

  const outA = interpolate(frame, [swap - 7, swap - 2], [1, 0], clampAll);
  const chip = usePop(chipAt);

  return (
    <AbsoluteFill style={{ background: "#0b0907" }}>
      <Camera duration={durationInFrames} punchAt={[a[a.length - 1]?.at ?? 31]}>
        <Clip
          src={params.clip || CLIP_SRC}
          from={4.2}
          rate={0.7}
          record="Your 3D clip, seconds 4.2–7: the city, from gold to day"
        />
      </Camera>
      <TopShade height={720} strength={0.6} />
      {frame < swap - 2 && (
        <div style={{ opacity: outA, transform: `translateY(${(1 - outA) * -70}px)` }}>
          <Headline lines={[a]} top={290} size={104} color={SCENE_COLORS.orange} shadow />
        </div>
      )}
      {frame >= swap && (
        <Headline lines={[b]} top={290} size={104} color={SCENE_COLORS.orange} shadow />
      )}
      <div
        style={{
          position: "absolute",
          left: 515 - 230,
          top: 450,
          width: 460,
          height: 116,
          ...glass(460),
          borderRadius: 58,
          background: "rgba(20,14,10,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          opacity: chip.opacity,
          transform: `scale(${chip.scale})`,
        }}
      >
        <Img src={asset("/assets/agent/project-1794220665352/claude.svg")} style={{ width: 62, height: 62 }} />
        <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 50, color: "#fff" }}>
          {params.chip}
        </span>
      </div>
    </AbsoluteFill>
  );
}
