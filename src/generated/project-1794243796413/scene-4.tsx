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
  "Light scene: the real Hacker News post – first its line 'My daughter enjoys navigating TV through speech' glows, then the camera flies to '112 points' and rings it while a huge 112 counts up above";

export const schema = z.object({
  first: field.text("Headline", "His *daughter*"),
  firstSub: field.text("Headline line 2", "controls it by voice"),
  points: field.number("Points on Hacker News", 112, { min: 0 }),
  pointsLabel: field.text("Under the number", "points on Hacker News"),
  creator: field.text("Creator", "anubhavmalhotra"),
  link: field.text("Link next to the creator", "r2d2-tv on GitHub"),
  statOn: field.word("Number appears on", "112"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const daughter = wordFrame(words, "daughter", 93);
  const controls = wordFrame(words, "controls", 103);
  const stat = wordFrame(words, params.statOn, 163);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} light y={560} fromY={640} />
      <Motif src={ASSETS.hnR2d2.src} light rotate={-7} />
      <Camera duration={durationInFrames} punchAt={[stat]}>
        <Swap to={stat - 5}>
          <Headline
            lines={[w(params.first, Math.min(daughter - 4, 70), 4), w(params.firstSub, controls - 4, 3)]}
            size={100}
            top={250}
            light
            color={COLOR}
          />
        </Swap>
        <Swap from={stat - 2}>
          <BigStat value={params.points} at={stat} label={params.pointsLabel} light color={COLOR} />
        </Swap>
        <div style={{ position: "absolute", left: 130, top: 540, ...cardMotion(frame, -40) }}>
          <BrowserCard url="news.ycombinator.com" icon={ASSETS.hn} bodyHeight={340} light glow={COLOR}>
            <HnZoom
              shot={ASSETS.hnR2d2}
              story={{ x: 66, y: 296, w: 1000, h: 34 }}
              points={{ x: 66, y: 136, w: 96, h: 24 }}
              moveAt={stat - 10}
              width={770}
              height={340}
              color={COLOR}
            />
          </BrowserCard>
        </div>
        <CreatorChip name={params.creator} link={params.link} top={1004} light color={COLOR} />
      </Camera>
    </AbsoluteFill>
  );
}
