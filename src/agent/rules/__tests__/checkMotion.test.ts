import { describe, expect, it } from "vitest";
import type { ScriptFromAi } from "../../run/3-script";
import type { BlocksFromAi } from "../../run/4-blocks";
import type { BlockMotionFromAi, MotionFromAi } from "../../run/4-motion";
import { checkMotion } from "../checkMotion";

const scene = (voiceover: string) => ({
  role: "item",
  voiceover,
  onScreen: "",
  visual: "",
  needsRecording: false,
});
// Two scenes of ~3 s; the second's first block comes on its 4th word.
const script = {
  scenes: [
    scene("Claude and GitHub work together on every single commit now"),
    scene("So you pick a tool and check the result"),
  ],
} as unknown as ScriptFromAi;
const blocks: BlocksFromAi = {
  wishes: [],
  scenes: [
    {
      stage: "split",
      keywords: [],
      blocks: [
        { onWord: "Claude", kind: "logos", ids: ["claude", "github"] },
        { onWord: "commit", kind: "badge", text: "01" },
      ],
    },
    {
      stage: "top",
      keywords: [],
      blocks: [{ onWord: "tool", kind: "list", items: ["Pick", "Check"] }],
    },
  ],
};

const calm: BlockMotionFromAi = {
  entrance: "fade",
  enterFrames: 8,
  exit: "fade",
  exitFrames: 6,
};
const motion = (
  first: BlockMotionFromAi[],
  second: Partial<MotionFromAi["scenes"][number]> = {},
): MotionFromAi => ({
  idea: "In from the right, out to the left.",
  scenes: [
    { transition: "cut", blocks: first },
    { transition: "cut", blocks: [calm], ...second },
  ],
});
const messages = (m: MotionFromAi) =>
  checkMotion(m, blocks, script).map((p) => p.message);

describe("checkMotion", () => {
  it("passes calm motion", () => {
    expect(messages(motion([calm, calm]))).toEqual([]);
  });

  it("wants one entry per block", () => {
    expect(messages(motion([calm]))[0]).toMatch(/1 blocks of motion/);
  });

  it("does not let a block show before its word", () => {
    expect(messages(motion([{ ...calm, entrance: "none" }, calm]))[0]).toMatch(
      /before "Claude" is said/,
    );
  });

  it("wants the entrance and exit to fit the block's time", () => {
    const slow = { ...calm, enterFrames: 30, exitFrames: 30 };
    expect(messages(motion([calm, slow]))[0]).toMatch(/do not fit/);
  });

  it("keeps a move in the frame and off the other place's picture", () => {
    const out = { ...calm, moves: [{ onWord: "every", y: 2, scale: 1 }] };
    expect(messages(motion([out, calm])).join()).toMatch(/out of the frame/);
    // the top place of the split moving down onto the bottom one
    const onto = { ...calm, moves: [{ onWord: "every", y: 58, scale: 0.68 }] };
    expect(messages(motion([onto, calm])).join()).toMatch(/other place/);
  });

  it("wants a move on a word said while the block is there", () => {
    const early = { ...calm, moves: [{ onWord: "nothing", y: 30, scale: 1 }] };
    expect(messages(motion([early, calm]))[0]).toMatch(/not on a word/);
  });

  it("lets only a scene's last block be carried, on a cut", () => {
    const carried = { ...calm, carry: true };
    expect(messages(motion([calm, carried]))).toEqual([]);
    expect(messages(motion([carried, calm]))[0]).toMatch(/last block/);
    expect(
      messages(motion([calm, carried], { transition: "slideLeft" }))[0],
    ).toMatch(/must be cut/);
  });
});
