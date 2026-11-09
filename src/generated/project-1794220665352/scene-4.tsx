import { z } from "zod";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { SCENE_COLORS, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  CLIP_SECONDS,
  CLIP_SRC,
  Camera,
  Clip,
  Headline,
  MoonIcon,
  SunIcon,
  TopShade,
  WordPill,
  clampAll,
} from "./shared";

export const description =
  "The whole 12-second 3D clip, full screen, once and without a cut – its speed ramps so each part plays on its words: cracks, burst and the gold city rising under '12 seconds. All code.', the city by day with a DAY pill, then night and the windows lighting up with a NIGHT pill";

export const schema = z.object({
  clip: field.recording(
    "3D clip (all 12 seconds)",
    "Your finished 12-s bulb→city clip (9:16 MP4). This scene plays all of it once, start to end: seconds 0–6 on the first sentence, 6–8.3 on 'by day', 8.3–12 on 'night'",
  ),
  head1: field.text("Headline", "*12* seconds."),
  head2: field.text("Second line", "All code."),
  numberOn: field.word("Number on", "twelve"),
  dayWord: field.text("Day pill", "DAY"),
  dayOn: field.word("Day pill on", "day"),
  nightWord: field.text("Night pill", "NIGHT"),
  nightOn: field.word("Night pill on", "night"),
});
type Params = z.infer<typeof schema>;

// Where the clip's parts meet (seconds into the clip): the result up to the
// city by day, the day, then dusk and night.
const DAY_STARTS = 6.0;
const NIGHT_STARTS = 8.3;
const CLIP_END = CLIP_SECONDS - 0.05;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const n = wordFrame(words, params.numberOn, 29);
  const s = wordFrame(words, "seconds", 39);
  const l1 = params.head1.split(" ").map((t, i) => ({ text: t, at: i === 0 ? n : s }));
  const l2 = params.head2.split(" ").map((t, i) => ({ text: t, at: s + 10 + i * 4 }));
  const burst = wordFrame(words, "bursts", 93);
  const day = wordFrame(words, params.dayOn, 235);
  const night = wordFrame(words, params.nightOn, 317);

  // One take, no repeats: each part of the clip is stretched or squeezed to
  // the words about it. Each part is mounted ahead of time (premountFor), so
  // the cut between them is invisible in the preview too.
  const cuts = [0, day - 6, night - 6, durationInFrames];
  const spans = [0, DAY_STARTS, NIGHT_STARTS, CLIP_END];
  const parts = [0, 1, 2].map((k) => {
    const frames = Math.max(1, cuts[k + 1] - cuts[k]);
    return {
      from: cuts[k],
      frames,
      clipFrom: spans[k],
      rate: ((spans[k + 1] - spans[k]) * 30) / frames,
    };
  });

  // the headline makes room for the city before "day"; the DAY pill gives
  // way to NIGHT
  const headline = interpolate(frame, [day - 30, day - 14], [1, 0], clampAll);
  const dayPill = interpolate(frame, [night - 8, night - 3], [1, 0], clampAll);

  return (
    <AbsoluteFill style={{ background: "#0b0907" }}>
      <Camera duration={durationInFrames} punchAt={[burst]}>
        {parts.map((part, k) => (
          <Sequence key={k} from={part.from} durationInFrames={part.frames} premountFor={20}>
            <Clip
              src={params.clip || CLIP_SRC}
              from={part.clipFrom}
              rate={part.rate}
              record="Your 3D clip, all 12 seconds"
            />
          </Sequence>
        ))}
      </Camera>
      {headline > 0 ? (
        <div style={{ opacity: headline }}>
          <TopShade height={820} strength={0.82} />
          <Headline lines={[l1, l2]} top={270} size={104} color={SCENE_COLORS.amber} soft shadow />
        </div>
      ) : null}
      {frame >= day - 6 && dayPill > 0 ? (
        <div style={{ opacity: dayPill }}>
          <WordPill
            at={day - 4}
            word={params.dayWord}
            color={SCENE_COLORS.amber}
            icon={<SunIcon size={84} color="#ffd27a" stroke={3.6} />}
          />
        </div>
      ) : null}
      {frame >= night - 5 ? (
        <WordPill
          at={night - 3}
          word={params.nightWord}
          color={SCENE_COLORS.purple}
          icon={<MoonIcon size={80} color="#c7b8ff" stroke={3.6} />}
        />
      ) : null}
    </AbsoluteFill>
  );
}
