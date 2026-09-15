import { describe, expect, it } from "vitest";
import { parseProject } from "../normalizeProject";
import {
  projectPlanJson,
  sceneOnScreenText,
  withOnScreenText,
} from "../projectStoryPlan";
function project() {
  return parseProject({
    id: "plan-test",
    title: "Plan test",
    fps: 30,
    width: 1080,
    height: 1920,
    scenes: [
      {
        id: "s1",
        type: "visual-explainer",
        background: "solid-dark",
        vo: "Say this",
        content: {
          richHeadline: [
            { text: "ONE", size: "headline", animation: "slideUp" },
            { text: "TWO", size: "title" },
          ],
        },
        motion: {},
      },
    ],
  });
}
describe("project story plan", () => {
  it("migrates old scenes to an inline plan", () => {
    expect(project().scenes[0].plan?.role).toBe("benefit");
  });
  it("edits visible lines without losing their authored styles", () => {
    const scene = withOnScreenText(project().scenes[0], "NEW\nCOPY");
    expect(sceneOnScreenText(scene)).toBe("NEW\nCOPY");
    expect(scene.content.richHeadline?.[0].animation).toBe("slideUp");
    expect(scene.content.richHeadline?.[1].size).toBe("title");
  });
  it("exports a compact AI handoff without render configuration", () => {
    const exported = JSON.parse(projectPlanJson(project()));
    expect(exported.format).toBe("tikmaker-story-plan-v1");
    expect(exported.scenes[0]).toMatchObject({
      voiceover: "Say this",
      onScreenText: "ONE\nTWO",
    });
    expect(exported.scenes[0].content).toBeUndefined();
  });
});
