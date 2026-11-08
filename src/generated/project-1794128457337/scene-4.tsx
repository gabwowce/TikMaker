import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { field, RecordingSlot, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Stage, StepPill } from "./shared";

export const description =
  "Step 2: the real hooks card in TikMaker's agent panel shows three hooks, each with what it shows, and the cursor clicks one";

const RECORD =
  "TikMaker agent panel during a run, crop to the 'hooks' card: the three hooks with what each one shows; move the cursor down the list and click the first hook. Start when the card is on screen, stop 1 s after the click (about 3 s).";

export const schema = z.object({
  step: field.number("Step number", 2, { min: 1, max: 9 }),
  hooks: field.recording("Hooks card", RECORD),
  startsOn: field.word("The recording starts on", "writes"),
});
type Params = z.infer<typeof schema>;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const at = wordFrame(words, params.startsOn, 22) - 10;
  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <StepPill n={params.step} />
        <div style={{ position: "absolute", left: 90, top: 355 }}>
          <RecordingSlot src={params.hooks} record={RECORD} at={at} width={900} height={700} />
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
