import type { FreeScene } from "../../../experiments/codeVideo/FreeVideo";
import type { CodeSceneProps } from "../../../video/code/types";
import { BrandVideoBody } from "./Video";
import { STATES } from "./states";

// Test 4 of the experiment was written as ONE component for the whole video
// (one card that morphs from scene to scene). In a project every scene is a
// code scene of its own, so each one draws that video seen from its scene:
// the scene starts on frame 0, the one before it has just ended (the card
// morphs in from its last shape), the one after starts when this one ends.
const FAR = 1000;

export function Test4Scene({ s, props }: { s: number; props: CodeSceneProps }) {
  const scenes: FreeScene[] = STATES.map((_, i) => ({
    index: i,
    from:
      i < s ? -FAR * (s - i) : i === s ? 0 : props.durationInFrames + FAR * (i - s - 1),
    durationInFrames: i === s ? props.durationInFrames : FAR,
    voiceover: i === s ? props.voiceover : "",
    words: i === s ? props.words : [],
  }));
  return <BrandVideoBody scenes={scenes} durationInFrames={props.durationInFrames} />;
}
