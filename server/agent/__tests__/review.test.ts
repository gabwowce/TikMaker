import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../src/schema/project.js";
import { parseProject } from "../../../src/utils/normalizeProject.js";
import { framesToReview } from "../frames.js";
import { reviewResult } from "../steps/7-review.js";

// A project of two 3-second scenes (vo set so the length comes from it): the
// first with two layers, the second with none.
function project() {
  const base = createEmptyProject("p", "Review");
  const layer = (id: string, delay: number, exitAt?: number) => ({
    id,
    visual: { type: "prop" as const, asset: "rocket" },
    x: 50,
    y: 40,
    delay,
    ...(exitAt !== undefined ? { exitAt } : {}),
  });
  return parseProject({
    ...base,
    scenes: [
      {
        id: "s1",
        type: "visual-explainer",
        background: "stage",
        durationSeconds: 3,
        content: { headline: "One", visuals: [layer("a", 0, 40), layer("b", 40)] },
      },
      {
        id: "s2",
        type: "visual-explainer",
        background: "stage",
        durationSeconds: 3,
        content: { headline: "Two" },
      },
    ],
  });
}

describe("framesToReview", () => {
  it("takes each block at its fullest, and the middle of a scene without one", () => {
    // scene 1 (90 frames): "a" leaves at 40 → 25, but never before 0 + 30;
    // "b" stays to the end → 75; scene 2 starts at 90, its middle is 45 in
    expect(framesToReview(project())).toEqual([
      { sceneIndex: 0, frame: 30 },
      { sceneIndex: 0, frame: 75 },
      { sceneIndex: 1, frame: 135 },
    ]);
  });
});

describe("reviewResult", () => {
  it("proposes one change per scene to fix and names the good ones", () => {
    const result = reviewResult(
      {
        scenes: [
          { sceneIndex: 0, sees: "A rocket", verdict: "good", problems: [] },
          {
            sceneIndex: 1,
            sees: "Two diagrams",
            verdict: "fix",
            problems: ["two diagrams of the same weight", "labels too small"],
            change: { kind: "pictures", instruction: "only the loop, big" },
          },
          // a scene that does not exist is dropped
          {
            sceneIndex: 7,
            sees: "?",
            verdict: "fix",
            problems: ["x"],
            change: { kind: "words", instruction: "shorter" },
          },
        ],
      },
      2,
    );
    expect(result.targets).toEqual([
      { kind: "pictures", sceneIndex: 1, instruction: "only the loop, big" },
    ]);
    expect(result.text).toContain(
      "Scene 2: two diagrams of the same weight; labels too small",
    );
    expect(result.text).toContain("Good as they are: 1.");
  });

  it("says a good scene's notes but never turns them into a change", () => {
    const result = reviewResult(
      {
        scenes: [
          {
            sceneIndex: 0,
            sees: "A rocket",
            verdict: "good",
            problems: ["a lot of empty space"],
          },
        ],
      },
      1,
    );
    expect(result.targets).toEqual([]);
    expect(result.text).toContain(
      "Note, scene 1 (left as it is): a lot of empty space",
    );
  });

  it("says so when every scene reads well", () => {
    const result = reviewResult(
      { scenes: [{ sceneIndex: 0, sees: "A", verdict: "good", problems: [] }] },
      1,
    );
    expect(result).toMatchObject({
      text: "I looked at the frames – every scene reads well.",
      targets: [],
    });
    expect(result.scenes).toHaveLength(1);
  });
});
