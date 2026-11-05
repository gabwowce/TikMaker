import { describe, expect, it } from "vitest";
import type { ScriptFromAi } from "../../run/3-script";
import type { BlocksFromAi } from "../../run/4-blocks";
import { checkBlocks } from "../checkBlocks";

const library = { logos: ["claude", "github"], props: ["padlock"] };

// One scene of 16 words: ~5.5 s of voiceover.
const script: ScriptFromAi = {
  skipped: [],
  scenes: [
    {
      role: "hook",
      voiceover:
        "Claude and GitHub work together so every commit you push is checked before anyone sees it",
      onScreen: "Claude + GitHub",
      visual: "two logos",
      needsRecording: false,
    },
  ],
};

const good: BlocksFromAi = {
  wishes: [],
  scenes: [
    {
      stage: "top",
      keywords: ["Claude", "checked"],
      blocks: [
        { onWord: "Claude", kind: "logos", ids: ["claude", "github"] },
        { onWord: "commit", kind: "terminal", lines: ["git push"] },
        { onWord: "checked", kind: "object", id: "padlock" },
      ],
    },
  ],
};

const messages = (plan: BlocksFromAi) =>
  checkBlocks(plan, script, library).map((p) => p.message);

describe("checkBlocks", () => {
  it("passes blocks that follow the voiceover", () => {
    expect(messages(good)).toEqual([]);
  });

  it("finds a missing field, an id not in the library and a wrong word", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks[0].ids = ["claude", "notion"];
    plan.scenes[0].blocks[1] = {
      onWord: "deploy",
      kind: "list",
      items: ["one"],
    };
    expect(messages(plan)).toEqual(
      expect.arrayContaining([
        'Scene 1: block 1 (logos) needs "notion" is not in the library – put it in wishes',
        'Scene 1: block 2 (list): "deploy" is not in the voiceover',
        "Scene 1: block 2 (list) needs 2–4 items",
      ]),
    );
  });

  it("finds blocks out of order", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks.reverse();
    expect(messages(plan)).toContain(
      'Scene 1: block 2 (terminal) on "commit" is out of order',
    );
  });

  it("finds a picture that stays too long and a late first block", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks = [
      { onWord: "together", kind: "logos", ids: ["claude", "github"] },
    ];
    expect(messages(plan)).toEqual(
      expect.arrayContaining([
        "Scene 1: the first block comes at 1.3 s – start it within 1 s",
        "Scene 1: block 1 stays 4.3 s – change the picture at least every 3 s",
      ]),
    );
  });

  it("asks for a stage that fits what the scene shows", () => {
    const plan = structuredClone(good);
    delete plan.scenes[0].stage;
    expect(messages(plan)).toContain(
      "Scene 1: pick a stage: top, bottom, statement, full or split",
    );
    plan.scenes[0].stage = "statement";
    expect(messages(plan)).toContain(
      "Scene 1: a statement shows no picture – leave its blocks empty",
    );
    plan.scenes[0].stage = "split";
    plan.scenes[0].blocks = plan.scenes[0].blocks.slice(0, 1);
    expect(messages(plan)).toContain(
      "Scene 1: a split shows two pictures – give it at least 2 blocks",
    );
  });

  it("finds a keyword that is not said", () => {
    const plan = structuredClone(good);
    plan.scenes[0].keywords = ["Notion"];
    expect(messages(plan)).toContain(
      'Scene 1: the keyword "Notion" is not in the voiceover',
    );
  });
});
