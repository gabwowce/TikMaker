import { z } from "zod";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";
import { SCENE_COLORS, asset, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  ASSETS,
  Backdrop,
  BrowserCard,
  Camera,
  CreatorChip,
  Headline,
  Motif,
  Pan,
  Swap,
  cardMotion,
  focusAt,
  words as w,
} from "./shared";

const page = ASSETS.ghNesFull;

export const description =
  "The real nesformer GitHub page scrolls down in a glass browser card; 'The craziest' turns into 'A Nintendo / inside an AI model', dbreunig pinned below";

export const schema = z.object({
  repo: field.recording(
    "Repo scrolling (optional – by default the camera scrolls the real page)",
    "github.com/dbreunig/nesformer scrolling down the README to its game pictures",
  ),
  first: field.text("Headline", "The *craziest*"),
  firstSub: field.text("Headline line 2", "#3 this week"),
  second: field.text("Headline after the turn", "A *Nintendo*"),
  secondSub: field.text("Line 2 after the turn", "inside an AI model"),
  creator: field.text("Creator", "dbreunig"),
  url: field.text("Link", "github.com/dbreunig/nesformer"),
  turnOn: field.word("Headline turns on", "Nintendo"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.purple;

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const craziest = wordFrame(words, "craziest", 21);
  const turn = wordFrame(words, params.turnOn, 71);
  const inside = wordFrame(words, "inside", 94);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={640} fromY={560} />
      <Motif src={ASSETS.ghNes.src} rotate={7} />
      <Camera duration={durationInFrames} punchAt={[turn]}>
        <Swap to={turn - 3}>
          <Headline lines={[w(params.first, Math.min(4, craziest), Math.max(3, craziest - 4)), w(params.firstSub, 6, 3)]} size={100} top={232} color={COLOR} />
        </Swap>
        <Swap from={turn}>
          <Headline lines={[w(params.second, turn - 4, 3), w(params.secondSub, inside - 4, 3)]} size={100} top={232} color={COLOR} />
        </Swap>
        <div style={{ position: "absolute", left: 130, top: 445, ...cardMotion(frame, -40) }}>
          <BrowserCard url={params.url} icon={ASSETS.github} bodyHeight={450} glow={COLOR}>
            {params.repo ? (
              <OffthreadVideo
                src={asset(params.repo)}
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 0%" }}
              />
            ) : (
              <Pan
                src={page.src}
                nw={page.w}
                nh={page.h}
                w={770}
                h={450}
                {...focusAt(frame, [
                  [0, { cx: 640, cy: 560, s: 0.62 }],
                  [turn, { cx: 560, cy: 2150, s: 0.74 }],
                  [durationInFrames, { cx: 560, cy: 2330, s: 0.8 }],
                ])}
              />
            )}
          </BrowserCard>
        </div>
        <CreatorChip name={params.creator} top={1002} color={COLOR} />
      </Camera>
    </AbsoluteFill>
  );
}
