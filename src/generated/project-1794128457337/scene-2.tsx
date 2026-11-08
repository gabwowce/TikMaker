import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { field, RecordingSlot, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Stage } from "./shared";

export const description =
  "The real new video form in TikMaker's agent panel: the idea is typed into 'Video idea', 40 seconds, 'Let the AI pick', and the cursor clicks Start";

const RECORD =
  "TikMaker, an empty project, the AI agent panel on the right – crop to the form. Type the one-line idea into 'Video idea', set the length to 40, leave the template on 'Let the AI pick', then click 'Start'. Start recording when the typing starts, stop 1 s after the click (about 5 s).";

export const schema = z.object({
  form: field.recording("New video form", RECORD),
  startsOn: field.word("The recording starts on", "I'm"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const at = wordFrame(words, params.startsOn, 0);
  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <div style={{ position: "absolute", left: 90, top: 225 }}>
          <RecordingSlot src={params.form} record={RECORD} at={at} width={900} height={830} />
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
