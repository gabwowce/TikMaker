import type { FreeScene } from "../../../experiments/codeVideo/FreeVideo";
import { z } from "zod";
import { field } from "../../../video/brand/kit";
import type { CodeSceneProps } from "../../../video/code/types";
import { FieldsContext } from "./anim";
import { BrandVideoBody } from "./Video";
import { STATES } from "./states";

// Test 4 of the experiment was written as ONE component for the whole video
// (one card that morphs from scene to scene). In a project every scene is a
// code scene of its own, so each one draws that video seen from its scene:
// the scene starts on frame 0, the one before it has just ended (the card
// morphs in from its last shape), the one after starts when this one ends.
const FAR = 1000;

// The fields every scene of test 4 lets the creator change: the strip over the
// card and the headline (empty – none).
export const COPY_DEFAULTS: { pill: string; headline: string }[] = [
  { pill: "", headline: "Your tokens are *burning*" },
  { pill: "", headline: "" },
  { pill: "MISTAKE 01", headline: "One *endless* session" },
  { pill: "FIX 01", headline: "*/clear* between tasks" },
  { pill: "MISTAKE 02", headline: "Reading the *whole repo*" },
  { pill: "FIX 02", headline: "Point at *the file*" },
  { pill: "MISTAKE 03", headline: "No *CLAUDE.md*" },
  { pill: "FIX 03", headline: "*CLAUDE.md* once" },
  { pill: "", headline: "" },
];

export function copyFields(s: number) {
  return {
    pill: field.text("Strip over the card", COPY_DEFAULTS[s].pill),
    headline: field.text("Headline (*word* – key word)", COPY_DEFAULTS[s].headline),
  };
}

export const copySchema = (s: number) => z.object(copyFields(s));

export function Test4Scene({ s, props }: { s: number; props: CodeSceneProps }) {
  const scenes: FreeScene[] = STATES.map((_, i) => ({
    index: i,
    from:
      i < s ? -FAR * (s - i) : i === s ? 0 : props.durationInFrames + FAR * (i - s - 1),
    durationInFrames: i === s ? props.durationInFrames : FAR,
    voiceover: i === s ? props.voiceover : "",
    words: i === s ? props.words : [],
  }));
  const params = props.params as { pill?: string; headline?: string; photo?: string };
  return (
    <FieldsContext.Provider value={{ s, ...params }}>
      <BrandVideoBody scenes={scenes} durationInFrames={props.durationInFrames} />
    </FieldsContext.Provider>
  );
}
