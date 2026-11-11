import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SCENE_COLORS, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  ASSETS,
  Backdrop,
  BrowserCard,
  CAT_RECORD,
  Camera,
  CatScreen,
  CreatorChip,
  Headline,
  Motif,
  Swap,
  cardMotion,
  focusAt,
  words as w,
} from "./shared";

export const description =
  "catcopter.com in a big glass browser card (the game playing), '13 years' above it turning into 'AI built it', the creator pawelwentpawel pinned below";

export const schema = z.object({
  gameplay: field.recording("Catcopter gameplay", CAT_RECORD),
  first: field.text("Headline", "*13* years"),
  second: field.text("Headline after the turn", "*AI* built it"),
  creator: field.text("Creator", "pawelwentpawel"),
  url: field.text("Link", "catcopter.com"),
  turnOn: field.word("Headline turns on", "AI"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const turn = wordFrame(words, params.turnOn, 85);
  const built = wordFrame(words, "built", turn + 20);
  const focus = focusAt(frame, [
    [0, { cx: 1280, cy: 800, s: 0.32 }],
    [turn - 4, { cx: 1100, cy: 640, s: 0.42 }],
    [built + 8, { cx: 490, cy: 250, s: 0.82 }],
  ]);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={640} />
      <Motif src={ASSETS.catcopter.src} />
      <Camera duration={durationInFrames} punchAt={[turn]}>
        <Swap to={turn - 3}>
          <Headline lines={[w(params.first, 0, 4)]} size={110} top={255} color={COLOR} />
        </Swap>
        <Swap from={turn}>
          <Headline lines={[w(params.second, turn - 2, 4)]} size={110} top={255} color={COLOR} />
        </Swap>
        <div style={{ position: "absolute", left: 130, top: 420, ...cardMotion(frame, -40) }}>
          <BrowserCard url={params.url} bodyHeight={470} glow={COLOR}>
            <CatScreen src={params.gameplay} at={0} width={770} height={470} focus={focus} />
          </BrowserCard>
        </div>
        <CreatorChip name={params.creator} link="built it with Claude" top={1002} color={COLOR} />
      </Camera>
    </AbsoluteFill>
  );
}
