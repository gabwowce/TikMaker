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

// One picture builds up on its words (Claude, GitHub), then the command.
const good: BlocksFromAi = {
  wishes: [],
  scenes: [
    {
      happens:
        "Claude and GitHub join into one chain, then a push gets checked",
      stage: "top",
      keywords: ["Claude", "checked"],
      blocks: [
        {
          onWord: "Claude",
          kind: "logos",
          ids: ["claude", "github"],
          partWords: ["Claude", "GitHub"],
        },
        { onWord: "push", kind: "terminal", lines: ["git push"] },
      ],
    },
  ],
};

const messages = (plan: BlocksFromAi) =>
  checkBlocks(plan, script, library).map((p) => p.message);

describe("checkBlocks", () => {
  it("passes one picture per thought that builds up on its words", () => {
    expect(messages(good)).toEqual([]);
  });

  it("asks what happens in the scene", () => {
    const plan = structuredClone(good);
    delete plan.scenes[0].happens;
    expect(messages(plan)).toContain(
      "Scene 1: write happens: one sentence of what the viewer sees happening, understandable with the sound off",
    );
  });

  it("finds a missing field, an id not in the library and a wrong word", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks[0].ids = ["claude", "notion"];
    plan.scenes[0].blocks[1] = {
      onWord: "deploy",
      kind: "list",
      items: ["one"],
      partWords: ["one"],
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
      'Scene 1: block 2 (logos) on "Claude" is out of order',
    );
  });

  it("finds a stretch with nothing happening and a late first block", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks = [
      { onWord: "together", kind: "terminal", lines: ["git push"] },
    ];
    expect(messages(plan)).toEqual(
      expect.arrayContaining([
        "Scene 1: the hook's picture comes at 1.3 s – put it on the first or second word",
        "Scene 1: block 1: nothing happens for 4.3 s – let a part appear on a word (partWords) or change the picture, at least every 3 s",
      ]),
    );
  });

  it("finds a picture that flickers past", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks.push({
      onWord: "checked",
      kind: "object",
      id: "padlock",
    });
    expect(messages(plan)).toContain(
      "Scene 1: block 2 is on screen only 0.6 s – it flickers past; keep one picture for the thought and let it build up (partWords) instead of swapping it",
    );
  });

  it("puts every part on a word the voice says", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks[0].partWords = ["Claude"];
    expect(messages(plan)).toContain(
      "Scene 1: block 1 (logos) needs partWords – one spoken word for each of its 2 parts",
    );
    plan.scenes[0].blocks[0].partWords = ["Claude", "Notion"];
    expect(messages(plan)).toContain(
      'Scene 1: block 1 (logos), part 2: "Notion" is not in the voiceover – a block of parts fits when the voice names every part',
    );
  });

  it("counts a part appearing as something happening", () => {
    const plan = structuredClone(good);
    // one list for the whole 5.5 s scene: a new item every ~2 s keeps it moving
    plan.scenes[0].blocks = [
      {
        onWord: "Claude",
        kind: "list",
        items: ["Together", "Every commit", "Anyone"],
        partWords: ["Claude", "commit", "anyone"],
      },
    ];
    expect(messages(plan)).toEqual([]);
  });

  it("finds a block standing empty before its first part", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks[0].partWords = ["together", "commit"];
    expect(messages(plan)).toContain(
      "Scene 1: block 1 stands empty 1.3 s before its first part – put the block on its first part's word, or that part on the block's word",
    );
  });

  it("lets a split's block stay until the block two after it", () => {
    const plan = structuredClone(good);
    // three blocks on two places: block 1 stays until block 3 arrives
    plan.scenes[0].stage = "split";
    plan.scenes[0].blocks = [
      { onWord: "Claude", kind: "number", value: 1, text: "One" },
      { onWord: "GitHub", kind: "number", value: 2, text: "Two" },
      { onWord: "commit", kind: "number", value: 3, text: "Three" },
    ];
    expect(messages(plan).filter((m) => m.includes("flickers"))).toEqual([]);
  });

  it("finds a part said after its picture is gone", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks[0].partWords = ["Claude", "checked"];
    expect(messages(plan)).toContain(
      "Scene 1: block 1 has a part on a word said after the next block replaced it",
    );
  });

  it("asks a screen for what to record and how long", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks[1] = {
      onWord: "commit",
      kind: "screen",
      text: "Push a commit",
    };
    expect(messages(plan)).toContain(
      "Scene 1: block 2 (screen) needs record (what exactly to record), seconds (how long showing it takes)",
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

  it("finds the same stage too many scenes in a row", () => {
    const plan = structuredClone(good);
    const scene = plan.scenes[0];
    plan.scenes = [scene, scene, scene];
    const long = { ...script, scenes: [0, 1, 2].map(() => script.scenes[0]) };
    const found = checkBlocks(plan, long, library).map((p) => p.message);
    expect(found).toContain(
      'Scenes 1–3 are all "top" (your stages: top, top, top) – the same frame again and again gets dull; change the stage where the story changes',
    );
  });

  it("checks a shape and what a new block needs", () => {
    const plan = structuredClone(good);
    plan.scenes[0].blocks[1] = {
      onWord: "push",
      kind: "list",
      shape: "hub",
      items: ["One", "Two"],
      partWords: ["push", "checked"],
    };
    expect(messages(plan)).toContain(
      "Scene 1: block 2 (list) needs a list shape (rows, grid, orbit, stack)",
    );
    plan.scenes[0].blocks[1] = { onWord: "push", kind: "progress", value: 140 };
    expect(messages(plan)).toContain(
      "Scene 1: block 2 (progress) needs value (0–100), text (what fills up)",
    );
    plan.scenes[0].blocks[1] = {
      onWord: "push",
      kind: "transform",
      nodes: [{ label: "Commit" }],
      partWords: ["push"],
    };
    expect(messages(plan)).toContain(
      "Scene 1: block 2 (transform) needs exactly 2 nodes",
    );
  });

  it("finds the same look too many times in the video", () => {
    const plan = structuredClone(good);
    const scene = plan.scenes[0];
    plan.scenes = [scene, scene, scene].map((s, i) => ({
      ...s,
      stage: i === 1 ? "bottom" : "top",
    }));
    const long = { ...script, scenes: [0, 1, 2].map(() => script.scenes[0]) };
    const found = checkBlocks(plan, long, library).map((p) => p.message);
    expect(found).toContain(
      '"logos" is used 3 times (your pictures: 1: logos + terminal; 2: logos + terminal; 3: logos + terminal) – the same look again and again reads as one slide repeated; at most 2 times – use another block or shape where it fits what happens',
    );
  });

  it("asks the hook for a picture, not words alone", () => {
    const plan = structuredClone(good);
    plan.scenes[0].stage = "statement";
    plan.scenes[0].blocks = [];
    expect(messages(plan)).toContain(
      "Scene 1: the hook needs a picture from its first word – words on an empty frame are the weakest opening; show its first frame",
    );
  });

  it("asks for one recording per scene, and the hook's over the whole frame", () => {
    const plan = structuredClone(good);
    const screen = (onWord: string) => ({
      onWord,
      kind: "screen" as const,
      text: "Type it",
      record: "Type the idea",
      seconds: 3,
    });
    plan.scenes[0].blocks = [screen("Claude"), screen("push")];
    const found = messages(plan);
    expect(found).toContain(
      "Scene 1: 2 recordings in one scene – one action is one recording; merge them into one screen block",
    );
    expect(found).toContain(
      "Scene 1: the hook shows a recording – put it on the full stage, over the whole frame, not in a small card",
    );
  });

  it("marks taste as advice and what is broken as a problem", () => {
    const plan = structuredClone(good);
    // a picture that flickers (taste) and a block missing its field (broken)
    plan.scenes[0].blocks.push({ onWord: "checked", kind: "object" });
    const found = checkBlocks(plan, script, library);
    const flicker = found.find((p) => p.message.includes("flickers"));
    const missing = found.find((p) => p.message.includes("needs id"));
    expect(flicker?.advice).toBe(true);
    expect(missing?.advice).toBeUndefined();
  });

  it("wants one simple picture in a split's small place, not a second diagram", () => {
    const plan = structuredClone(good);
    plan.scenes[0].stage = "split";
    const schema = (label: string) => ({
      kind: "schema" as const,
      shape: "chain" as const,
      nodes: [{ label }, { label: `${label} 2` }],
    });
    plan.scenes[0].blocks = [
      { onWord: "Claude", ...schema("A"), partWords: ["Claude", "GitHub"] },
      { onWord: "commit", ...schema("B"), partWords: ["commit", "commit"] },
    ];
    expect(messages(plan).join()).toMatch(/block 2 goes into the split's small place/);
    plan.scenes[0].blocks[1] = {
      onWord: "commit",
      kind: "number",
      value: 2,
      text: "Two",
    };
    expect(messages(plan).join()).not.toMatch(/small place/);
  });

  it("keeps text-heavy blocks out of a split", () => {
    const plan = structuredClone(good);
    plan.scenes[0].stage = "split";
    plan.scenes[0].blocks = [
      {
        onWord: "Claude",
        kind: "chat",
        items: ["Hi", "Hello"],
        partWords: ["Claude", "GitHub"],
      },
      { onWord: "push", kind: "number", value: 2, text: "Two" },
    ];
    expect(messages(plan)).toContain(
      "Scene 1: a chat is mostly text and too small to read in a split – use another stage, or a picture block here",
    );
  });

  it("never says a recording stands still, and notes too many of them", () => {
    const screen = {
      onWord: "Claude",
      kind: "screen" as const,
      text: "Type it",
      record: "Type the idea",
      seconds: 5,
    };
    const plan = structuredClone(good);
    plan.scenes = Array.from({ length: 5 }, (_, i) => ({
      ...structuredClone(good.scenes[0]),
      stage: i % 2 ? ("top" as const) : ("bottom" as const),
      blocks: [screen],
    }));
    const long = { ...script, scenes: plan.scenes.map(() => script.scenes[0]) };
    const found = checkBlocks(plan, long, library).map((p) => p.message);
    expect(found.some((m) => m.includes("nothing happens"))).toBe(false);
    expect(found).toContain(
      "5 scenes ask for a recording – that is a lot to record; about 4 at most, the rest shown with blocks",
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
