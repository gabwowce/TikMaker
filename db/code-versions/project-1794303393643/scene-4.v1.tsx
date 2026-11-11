import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SCENE_COLORS, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { ClockIcon, GAME, GAME_RECORD, Gameplay, GlassPill, LinkIcon } from "./shared";

export const description =
  "Full-screen gameplay: the plane spirals round the glass tower, 'All 22 lights!' lands at 14.2 s and fireworks burst; pills 'under 1 hour' and 'playable link' pop in";

export const schema = z.object({
  gameplay: field.recording("Gameplay", GAME_RECORD),
  startSec: field.number("Recording starts at (s)", 12.6, { min: 0, max: 18 }),
  hour: field.text("Pill 1", "under *1 hour*"),
  link: field.text("Pill 2", "*playable* link"),
  hourOn: field.word("Pill 1 on", "Under"),
  linkOn: field.word("Pill 2 on", "playable"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.teal;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  useCurrentFrame();
  const h = wordFrame(words, params.hourOn, 92);
  const l = wordFrame(words, params.linkOn, 118);
  const ic = { size: 46, color: "#fff" };
  return (
    <AbsoluteFill>
      <Gameplay
        src={params.gameplay || GAME}
        startSec={params.startSec}
        duration={durationInFrames}
        punchAt={[wordFrame(words, "14.2", 24)]}
      />
      <GlassPill at={h - 3} icon={<ClockIcon {...ic} />} text={params.hour} top={820} color={COLOR} size={50} />
      <GlassPill at={l - 3} icon={<LinkIcon {...ic} />} text={params.link} top={945} color={COLOR} size={50} />
    </AbsoluteFill>
  );
}
