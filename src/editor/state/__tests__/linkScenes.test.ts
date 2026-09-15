import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { linkLayerToNextScene } from "../linkScenes";

function fixture() {
  const scenes: Scene[] = ["first", "second"].map((id) => ({
    id,
    type: "visual-explainer",
    background: "solid-dark",
    content: {},
    motion: { transition: "push" },
  }));
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
  it("carries a layer into the next scene without mutating the input", () => {
    const project = fixture();
    const linked = linkLayerToNextScene(project, "first", "image");
    const from = linked.scenes[0].content.visuals![0];
    const to = linked.scenes[1].content.visuals![0];
    expect(from.link?.groupId).toBe(to.link?.groupId);
    expect(from.exit).toBeUndefined();
    expect(to.visual).toEqual(project.scenes[0].content.visuals![0].visual);
    expect(to).toMatchObject({ x: 30, y: 20, scale: 0.6 });
    expect(linked.scenes[1].motion?.transition).toBe("cut");
    expect(project.scenes[0].content.visuals![0].exit).toBe("fade");
    expect(project.scenes[1].content.visuals).toBeUndefined();
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
    expect(linkLayerToNextScene(project, "first", "missing")).toBe(project);
    expect(linkLayerToNextScene(project, "second", "image")).toBe(project);
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
