import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { linkLayerToNextScene, linkVisualToNextScene } from "../linkScenes";

function fixture() {
  const scenes: Scene[] = ["first", "second"].map((id) => ({
    id,
    type: "visual-explainer",
    background: "solid-dark",
    content: {},
    motion: { transition: "push" },
  }));
  scenes[0].visual = { type: "image", src: "test.png" };
  scenes[0].visualExit = "fade";
  scenes[0].content.visuals = [
    {
      id: "image",
      visual: { type: "image", src: "test.png" },
      x: 30,
      y: 60,
      scale: 1,
      exit: "fade",
      exitSfx: "sound",
    },
  ];
  return { ...createEmptyProject("links", "Links"), scenes };
}

describe("scene links", () => {
  it("links adjacent scene visuals without mutating the input", () => {
    const project = fixture();
    const linked = linkVisualToNextScene(project, "first");
    expect(linked.scenes[0].visualLink).toEqual(linked.scenes[1].visualLink);
    expect(linked.scenes[0].visualExit).toBeUndefined();
    expect(linked.scenes[1].visual).toEqual(project.scenes[0].visual);
    expect(linked.scenes[1].visualPosition).toEqual({ x: 50, y: 20 });
    expect(linked.scenes[1].visualScale).toBe(0.5);
    expect(linked.scenes[1].motion?.transition).toBe("cut");
    expect(project.scenes[0].visualExit).toBe("fade");
    expect(project.scenes[1].visual).toBeUndefined();
  });
  it("replaces a previously linked layer instead of duplicating it", () => {
    const project = fixture();
    const once = linkLayerToNextScene(project, "first", "image");
    const twice = linkLayerToNextScene(once, "first", "image");
    expect(twice.scenes[1].content.visuals).toHaveLength(1);
    expect(twice.scenes[1].content.visuals![0]).toMatchObject({
      x: 30,
      y: 20,
      scale: 0.6,
    });
    expect(twice.scenes[0].content.visuals![0].exitSfx).toBeUndefined();
    expect(project.scenes[0].content.visuals![0].exitSfx).toBe("sound");
  });
  it("leaves the project unchanged when linking is impossible", () => {
    const project = fixture();
    expect(linkVisualToNextScene(project, "second")).toBe(project);
    expect(linkLayerToNextScene(project, "first", "missing")).toBe(project);
    project.scenes[1].content.visuals = Array.from(
      { length: 6 },
      (_, index) => ({
        id: String(index),
        visual: { type: "image", src: "other.png" },
        x: 50,
        y: 50,
      }),
    );
    expect(linkLayerToNextScene(project, "first", "image")).toBe(project);
  });
});
