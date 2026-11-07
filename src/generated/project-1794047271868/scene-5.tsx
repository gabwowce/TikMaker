import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { StepRecording } from "./shared";

export const description =
  "The hooks station lights orange on the pipeline above the real agent panel, where the three-hooks card appears and the cursor clicks one";

const RECORD =
  "TikMaker agent panel after 'Start': the progress bar ticks from Idea to Angle and the card with three hooks appears (each with what it shows). Hold ~1.5 s so all three are visible, then move the cursor to the second hook and click it. Stop right after the click.";

export const schema = z.object({
  demo: field.recording("Three hooks → pick one", RECORD),
  lightOn: field.word("Station lights up on", "Second"),
});
type Params = z.infer<typeof schema>;

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StepRecording
        frame={frame}
        duration={durationInFrames}
        active={1}
        lightAt={wordFrame(words, params.lightOn, 0) - 2}
        src={params.demo}
        record={RECORD}
      />
    </AbsoluteFill>
  );
}
