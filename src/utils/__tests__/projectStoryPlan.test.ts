import { describe, expect, it } from "vitest";
import { parseProject } from "../normalizeProject";
import { projectPlanJson, sceneOnScreenText, withOnScreenText } from "../projectStoryPlan";

const project = () => parseProject({
  id: "plan-test", title: "Plan test", fps: 30, width: 1080, height: 1920,
  scenes: [{
    id: "s1", type: "visual-explainer", background: "solid-dark", vo: "Say this",
    content: { richHeadline: [{ text: "ONE", size: "headline", animation: "slideUp" }, { text: "TWO", size: "title" }] },
    motion: {},
  }],
});

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
    expect(exported.scenes[0]).toMatchObject({ voiceover: "Say this", onScreenText: "ONE\nTWO" });
    expect(exported.scenes[0].content).toBeUndefined();
  });

  it("repairs the legacy Claude draft to the accepted seven-scene flow once", () => {
    const scenes = Array.from({ length: 11 }, (_, index) => ({
      id: ["scene-odn7i8z", "scene-01-hook", "scene-1gkt5f9", "scene-03-reveal", "scene-04-solution", "scene-05-step", "scene-06-step", "scene-07-step", "scene-08-demo", "scene-09-proof", "scene-10-cta"][index],
      type: index < 3 ? "hook-centered" : index === 3 ? "hook-visual" : index === 10 ? "takeaway" : "visual-explainer",
      background: "solid-dark",
      content: { headline: `Old ${index}` },
      motion: {},
    }));
    const migrated = parseProject({ id: "project-mtii3v8d", title: "Claude", fps: 30, width: 1080, height: 1920, scenes });
    expect(migrated.scenes).toHaveLength(7);
    expect(migrated.scenes.map((scene) => scene.plan?.role)).toEqual(["hook", "reveal", "benefit", "mechanism", "setup", "proof", "cta"]);
    expect(migrated.scenes[5].vo).toBe("Open it, send your prompt, and watch Claude test the app.");
  });
});
