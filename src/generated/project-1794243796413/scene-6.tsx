import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SCENE_COLORS, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  ASSETS,
  Backdrop,
  BigStat,
  BrowserCard,
  Camera,
  CreatorChip,
  Headline,
  HnZoom,
  Motif,
  Swap,
  cardMotion,
  words as w,
} from "./shared";

export const description =
  "The real Hacker News post of nesformer: its line 'Opus 5.5 built working weights and code with only two prompts' glows under '2 prompts', then the camera flies to '298 points' and rings it while a huge 298 counts up";

export const schema = z.object({
  first: field.text("Headline", "*2* prompts"),
  firstSub: field.text("Headline line 2", "Claude Opus built it"),
  points: field.number("Points on Hacker News", 298, { min: 0 }),
  pointsLabel: field.text("Under the number", "points on Hacker News"),
  creator: field.text("Creator", "dbreunig"),
  link: field.text("Link next to the creator", "nesformer on GitHub"),
  promptsOn: field.word("'2 prompts' appears on", "two"),
  statOn: field.word("Number appears on", "298"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.amber;

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const two = wordFrame(words, params.promptsOn, 40);
  const stat = wordFrame(words, params.statOn, 72);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={600} fromY={640} />
      <Motif src={ASSETS.hnNes.src} rotate={-5} />
      <Camera duration={durationInFrames} punchAt={[two, stat]}>
        <Swap to={stat - 5}>
          <Headline lines={[w(params.first, two - 2, 4), w(params.firstSub, 2, 4)]} size={110} top={240} color={COLOR} />
        </Swap>
        <Swap from={stat - 2}>
          <BigStat value={params.points} at={stat} label={params.pointsLabel} color={COLOR} />
        </Swap>
        <div style={{ position: "absolute", left: 130, top: 540, ...cardMotion(frame, -40) }}>
          <BrowserCard url="news.ycombinator.com" icon={ASSETS.hn} bodyHeight={340} glow={COLOR}>
            <HnZoom
              shot={ASSETS.hnNes}
              story={{ x: 72, y: 682, w: 900, h: 32 }}
              points={{ x: 66, y: 136, w: 96, h: 24 }}
              moveAt={stat - 10}
              width={770}
              height={340}
              color={COLOR}
            />
          </BrowserCard>
        </div>
        <CreatorChip name={params.creator} link={params.link} top={1004} color={COLOR} />
      </Camera>
    </AbsoluteFill>
  );
}
