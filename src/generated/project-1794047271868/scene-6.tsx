import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { StepRecording } from "./shared";

export const description =
  "The script station lights orange on the pipeline above the real agent panel, where the script card scrolls scene by scene and the cursor clicks 'Approve'";

const RECORD =
  "TikMaker agent panel right after picking a hook: the script card appears with each scene's voiceover and on-screen words. Scroll slowly through it (~2 s), then click the 'Approve' button at the bottom. Stop ~0.5 s after the click.";

export const schema = z.object({
  demo: field.recording("Script → Approve", RECORD),
  lightOn: field.word("Station lights up on", "Third"),
});
type Params = z.infer<typeof schema>;

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StepRecording
        frame={frame}
        duration={durationInFrames}
        active={2}
        lightAt={wordFrame(words, params.lightOn, 0) - 2}
        src={params.demo}
        record={RECORD}
      />
    </AbsoluteFill>
  );
}
