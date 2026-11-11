import { z } from "zod";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { SCENE_COLORS, asset, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { CLAUDE_LOGO, GAME, GAME_RECORD, Gameplay, GlassPill } from "./shared";

export const description =
  "The paper plane shoots through a glowing ring over the night street, edge to edge; a '3D game · months' pill turns into a Claude Code pill";

export const schema = z.object({
  gameplay: field.recording("Gameplay", GAME_RECORD),
  startSec: field.number("Recording starts at (s)", 3.8, { min: 0, max: 18 }),
  before: field.text("Pill before", "3D game = *months*"),
  after: field.text("Pill after", "just ask *Claude Code*"),
  turnOn: field.word("Pill turns on", "ask"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  useCurrentFrame();
  const g = wordFrame(words, "game", 24);
  const turn = wordFrame(words, params.turnOn, 112);
  return (
    <AbsoluteFill>
      <Gameplay
        src={params.gameplay || GAME}
        startSec={params.startSec}
        rate={0.75}
        duration={durationInFrames}
        punchAt={[turn]}
      />
      <GlassPill at={g - 3} out={turn - 8} text={params.before} top={450} color={COLOR} />
      <GlassPill
        at={turn - 2}
        text={params.after}
        top={450}
        color={COLOR}
        icon={<Img src={asset(CLAUDE_LOGO)} style={{ width: 52, height: 52, filter: "brightness(0) invert(1)" }} />}
      />
    </AbsoluteFill>
  );
}
