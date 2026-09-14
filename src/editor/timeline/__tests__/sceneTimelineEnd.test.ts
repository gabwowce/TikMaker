import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { sceneTimelineEnd } from "../sceneTimelineEnd";

function fixture() {
  const scene: Scene = {
    id: "scene",
    type: "visual-explainer",
    background: "solid-dark",
    content: {},
  };
  const project = { ...createEmptyProject("test", "Test"), scenes: [scene] };
  const timing = { scene, from: 0, durationInFrames: 300, durationSeconds: 10 };
  return { project, timing, scene };
}

describe("scene timeline bounds", () => {
  it("leaves editing space after the scene", () => {
    const { project, timing } = fixture();
    expect(sceneTimelineEnd(project, timing)).toBe(600);
  });
  it("includes explicit scene and object end frames", () => {
    const { project, timing, scene } = fixture();
    scene.motion = { exitAt: 700 };
    expect(sceneTimelineEnd(project, timing)).toBe(700);
    scene.content.richHeadline = [
      { text: "Late text", size: "headline", exitAt: 900 },
    ];
    expect(sceneTimelineEnd(project, timing)).toBe(900);
  });
});
