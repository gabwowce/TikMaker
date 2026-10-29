import { describe, expect, it } from "vitest";
import type { DesignRule } from "../../../schema/knowledge";
import type { VideoProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { onScreenWordsPerScene, sceneOnScreenWords } from "../onScreenWords";

// Only the fields the check reads; the rest of a scene does not matter here.
const scene = (id: string, content: Partial<Scene["content"]>) =>
  ({ id, content }) as unknown as Scene;
const project = (scenes: Scene[]) => ({ scenes }) as unknown as VideoProject;
const rule: DesignRule = {
  id: "on-screen-words",
  check: "onScreenWordsPerScene",
  max: 5,
  level: "warning",
};

describe("sceneOnScreenWords", () => {
  it("counts eyebrow, headline and blocks", () => {
    const s = scene("a", {
      eyebrow: "STEP 01",
      headline: "Open the terminal",
      blocks: [{ id: "b", type: "text", text: "one two", x: 50, y: 50 }],
    });
    expect(sceneOnScreenWords(s)).toBe(7);
  });

  it("counts a rich headline instead of the plain one", () => {
    const s = scene("a", {
      headline: "this is ignored",
      richHeadline: [{ text: "Two words", size: "hero" }],
    });
    expect(sceneOnScreenWords(s)).toBe(2);
  });
});

describe("onScreenWordsPerScene", () => {
  it("warns only about the scene over the limit", () => {
    const result = onScreenWordsPerScene(
      project([
        scene("short", { headline: "Fine" }),
        scene("long", { headline: "one two three four five six" }),
      ]),
      rule,
    );
    expect(result).toEqual([
      {
        ruleId: "on-screen-words",
        sceneId: "long",
        level: "warning",
        message: "Scene 2: 6 words on screen, the limit is 5.",
      },
    ]);
  });
});
