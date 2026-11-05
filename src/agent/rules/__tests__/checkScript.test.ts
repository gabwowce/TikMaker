import { describe, expect, it } from "vitest";
import { checkScript, sceneSeconds } from "../checkScript";
import type { DesignRule, VideoTemplate } from "../../knowledge";
import type { SceneFromAi } from "../../run/3-script";

// A small template: a hook and a payoff are needed, items are optional.
const template = {
  acts: [
    {
      act: "opening",
      scenes: [{ role: "hook", optional: false, purpose: "Grabs attention." }],
    },
    {
      act: "core",
      scenes: [{ role: "item", optional: true, purpose: "One step." }],
    },
    {
      act: "close",
      scenes: [{ role: "payoff", optional: false, purpose: "The result." }],
    },
  ],
} as unknown as VideoTemplate;
const rules: DesignRule[] = [
  {
    id: "on-screen-words",
    check: "onScreenWordsPerScene",
    max: 5,
    level: "warning",
  },
];

const scene = (
  role: SceneFromAi["role"],
  voiceover = "Short line.",
  onScreen = "Two words",
): SceneFromAi => ({
  role,
  voiceover,
  onScreen,
  visual: "a terminal",
  needsRecording: false,
});

describe("checkScript", () => {
  it("finds nothing wrong in a script that fits", () => {
    const script = {
      scenes: [scene("hook"), scene("item"), scene("payoff")],
      skipped: [],
    };
    expect(checkScript(script, 40, rules)).toEqual([]);
  });

  it("leaves the structure to the model: a template scene may be left out", () => {
    const script = { scenes: [scene("hook"), scene("item")], skipped: [] };
    expect(checkScript(script, 40, rules)).toEqual([]);
  });

  it("finds a script more than 15 % longer than asked for", () => {
    // 30 words spoken ≈ 9.9 s a scene, 3 scenes ≈ 30 s, asked for 20 s (max 23 s).
    const long = Array(30).fill("word").join(" ");
    const script = {
      scenes: [scene("hook", long), scene("item", long), scene("payoff", long)],
      skipped: [],
    };
    const problems = checkScript(script, 20, rules);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toMatch(/more than 23 s/);
  });

  it("finds a scene with too many words on screen, and says which", () => {
    const script = {
      scenes: [
        scene("hook"),
        scene("payoff", "Short line.", "one two three four five six"),
      ],
      skipped: [],
    };
    expect(checkScript(script, 40, rules)).toEqual([
      { sceneIndex: 1, message: "Scene 2: 6 words on screen, the limit is 5" },
    ]);
  });

  it("times a scene by whichever takes longer: speaking or reading", () => {
    expect(sceneSeconds(scene("hook", "One two."))).toBe(2); // the floor
    const spoken = Array(16).fill("word").join(" "); // 16 / 3.2 + 0.5
    expect(sceneSeconds(scene("hook", spoken))).toBeCloseTo(5.5);
  });
});
