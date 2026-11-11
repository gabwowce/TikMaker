import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SCENE_COLORS, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { BulbIcon, FIT, GAME, GAME_RECORD, Gameplay, GlassPill, PlaneIcon, RingIcon } from "./shared";

export const description =
  "Full-screen gameplay: the plane threads ring after ring into a speed boost while three glass pills – paper plane, 22 lights, rings = speed – pop in one by one";

export const schema = z.object({
  gameplay: field.recording("Gameplay", GAME_RECORD),
  startSec: field.number("Recording starts at (s)", 7.7, { min: 0, max: 18 }),
  one: field.text("Point 1", "Paper plane"),
  two: field.text("Point 2", "*22* lights"),
  three: field.text("Point 3", "Rings = *speed*"),
  oneOn: field.word("Point 1 on", "plane"),
  twoOn: field.word("Point 2 on", "22"),
  threeOn: field.word("Point 3 on", "rings"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.amber;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  useCurrentFrame();
  const a = wordFrame(words, params.oneOn, 16);
  const b = wordFrame(words, params.twoOn, 34);
  const c = wordFrame(words, params.threeOn, 62);
  const ic = { size: 42, color: "#fff" };
  return (
    <AbsoluteFill>
      <Gameplay
        src={params.gameplay || GAME}
        startSec={params.startSec}
        duration={durationInFrames}
        zoom={[1.0, 1.05]}
        origin="50% 20%"
        fit={FIT}
        streak={{ scale: 0.6, centerY: 465 }}
        scrim={[1350, 1550]}
        punchAt={[wordFrame(words, "speed", 72)]}
      />
      <GlassPill at={a - 4} icon={<PlaneIcon {...ic} />} text={params.one} top={532} color={COLOR} size={46} />
      <GlassPill at={b - 4} icon={<BulbIcon {...ic} />} text={params.two} top={640} color={COLOR} size={46} />
      <GlassPill at={c - 4} icon={<RingIcon {...ic} />} text={params.three} top={748} color={COLOR} size={46} />
    </AbsoluteFill>
  );
}
