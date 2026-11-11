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

const page = ASSETS.ghR2d2Full;

export const description =
  "The real r2d2-tv GitHub page scrolls down in a glass browser card; 'A dad's TV / got an unwanted update' turns into 'He rewrote it / with 4 AI models', anubhavmalhotra pinned below";

export const schema = z.object({
  repo: field.recording(
    "Repo scrolling (optional – by default the camera scrolls the real page)",
    "github.com/anubhavmalhotra/r2d2-tv scrolling slowly down into the README",
  ),
  first: field.text("Headline", "A dad's *TV*"),
  firstSub: field.text("Headline line 2", "got an unwanted update"),
  second: field.text("Headline after the turn", "He *rewrote* it"),
  secondSub: field.text("Line 2 after the turn", "with 4 AI models"),
  creator: field.text("Creator", "anubhavmalhotra"),
  url: field.text("Link", "github.com/anubhavmalhotra/r2d2-tv"),
  turnOn: field.word("Headline turns on", "rewrote"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.blue;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const tv = wordFrame(words, "TV", 42);
  const update = wordFrame(words, "update", 63);
  const turn = wordFrame(words, params.turnOn, 155);
  const four = wordFrame(words, "four", 188);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={640} fromY={660} />
      <Motif src={ASSETS.ghR2d2.src} rotate={-6} />
      <Camera duration={durationInFrames} punchAt={[turn, four]}>
        <Swap to={turn - 3}>
          <Headline lines={[w(params.first, Math.min(6, tv), 4), w(params.firstSub, update - 4, 3)]} size={96} top={232} color={COLOR} />
        </Swap>
        <Swap from={turn}>
          <Headline lines={[w(params.second, turn - 4, 3), w(params.secondSub, four - 4, 3)]} size={96} top={232} color={COLOR} />
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
                  [update + 10, { cx: 560, cy: 1500, s: 0.66 }],
                  [turn, { cx: 560, cy: 2390, s: 0.74 }],
                  [durationInFrames, { cx: 560, cy: 2700, s: 0.78 }],
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
