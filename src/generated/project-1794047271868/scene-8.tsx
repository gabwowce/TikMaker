import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { StepRecording } from "./shared";

export const description =
  "The MP4 station lights orange on the pipeline above the real editor, where the scene strip and timeline fill, 'Render MP4' is clicked and the finished file appears to download";

const RECORD =
  "TikMaker editor as the agent finishes: the scene strip and the timeline fill with the video's scenes. Click 'Render MP4' top right, let the progress bar run (speed it up if long), stop when the finished MP4 with its download link appears. Crop to the timeline + the top-right corner.";

export const schema = z.object({
  demo: field.recording("Render MP4", RECORD),
  lightOn: field.word("Station lights up on", "Render"),
});
type Params = z.infer<typeof schema>;

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StepRecording
        frame={frame}
        duration={durationInFrames}
        active={4}
        lightAt={wordFrame(words, params.lightOn, 49) - 3}
        src={params.demo}
        record={RECORD}
      />
    </AbsoluteFill>
  );
}
