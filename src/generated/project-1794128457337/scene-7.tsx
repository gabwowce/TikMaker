import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { EASE_OUT, Stage, clamp, pulse } from "./shared";

export const description =
  "The real TikMaker editor right after the build: the scene strip fills, the timeline shows blocks, voice and caption clips, and the vertical preview plays the video";

const RECORD =
  "TikMaker editor the moment the agent finishes: the scene strip along the bottom fills with the scenes, the timeline shows the blocks, voice and caption clips, then press play so the vertical preview plays with its kinetic captions. Whole editor window, about 4 s.";

export const schema = z.object({
  editor: field.recording("Editor with the built video", RECORD),
  landsOn: field.word("It lands on", "lands"),
});
type Params = z.infer<typeof schema>;

const W = 900;
const H = 562;

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const land = wordFrame(words, params.landsOn, 31) - 3;
  // the window settles a touch on "lands", a soft orange glow behind it
  const settle = interpolate(frame, [land - 6, land, land + 10], [1, 1.035, 1], { ...clamp, easing: EASE_OUT });
  const glow = interpolate(frame, [land - 4, land + 6], [0, 1], clamp) * (0.7 + 0.3 * pulse(frame));
  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <div
          style={{
            position: "absolute",
            left: 90 - 80,
            top: 640 - H / 2 - 80,
            width: W + 160,
            height: H + 160,
            background: `radial-gradient(closest-side, rgba(255,112,36,${0.28 * glow}), transparent)`,
          }}
        />
        <div style={{ position: "absolute", left: 90, top: 640 - H / 2, scale: `${settle}` }}>
          <RecordingSlot src={params.editor} record={RECORD} width={W} height={H} />
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
