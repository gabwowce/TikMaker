import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { useProjectStore } from "../projectStore";

vi.mock("../../timeline/useAudioWaveforms", () => ({
  cachedAudioDuration: vi.fn(),
}));

let projectNumber = 0;
const canUndo = () => useProjectStore.temporal.getState().pastStates.length > 0;

beforeEach(() => {
  const scenes: Scene[] = ["first", "second"].map((id) => ({
    id,
    type: "visual-explainer",
    background: "solid-dark",
    vo: "Original narration",
    content: { headline: "Original title", eyebrow: "Keep this eyebrow" },
    motion: { entrance: "fade", transition: "cut", sfx: "old-sound" },
  }));
  useProjectStore.getState().loadProject({
    ...createEmptyProject(`test-${++projectNumber}`, "Test project"),
    scenes,
  });
});

describe("scene updates", () => {
  it("updates the selected field without changing other scenes or content", () => {
    const actions = useProjectStore.getState();
    const second = actions.project.scenes[1];
    actions.updateSceneVisualPosition("first", { x: 25, y: 60 });
    actions.updateSceneRichHeadline("first", [
      { text: "New title", size: "headline" },
    ]);
    actions.updateSceneEntrance("first", "slideUp");
    const [first, unchanged] = useProjectStore.getState().project.scenes;
    expect(first.visualPosition).toEqual({ x: 25, y: 60 });
    expect(first.content.headline).toBe("Original title");
    expect(first.content.eyebrow).toBe("Keep this eyebrow");
    expect(first.content.richHeadline?.[0].text).toBe("New title");
    expect(first.motion).toEqual({
      entrance: "slideUp",
      transition: "cut",
      sfx: "old-sound",
    });
    expect(unchanged).toBe(second);
  });

  it("clears an optional field without clearing neighbouring motion settings", () => {
    useProjectStore.getState().updateSceneSfx("first", undefined);
    const motion = useProjectStore.getState().project.scenes[0].motion;
    expect(motion?.sfx).toBeUndefined();
    expect(motion?.entrance).toBe("fade");
    expect(motion?.transition).toBe("cut");
  });

  it("records one undo step for a delegated action", () => {
    const actions = useProjectStore.getState();
    actions.updateSceneTransition("first", "push");
    expect(canUndo()).toBe(true);
    actions.undo();
    expect(
      useProjectStore.getState().project.scenes[0].motion?.transition,
    ).toBe("cut");
    expect(canUndo()).toBe(false);
    actions.redo();
    expect(
      useProjectStore.getState().project.scenes[0].motion?.transition,
    ).toBe("push");
  });

  it("groups multiple slider changes into one undo step", () => {
    const actions = useProjectStore.getState();
    actions.beginHistoryTransaction();
    actions.updateSceneStagger("first", 8);
    actions.updateSceneStagger("first", 12);
    actions.endHistoryTransaction();
    actions.undo();
    expect(
      useProjectStore.getState().project.scenes[0].motion?.stagger,
    ).toBeUndefined();
    expect(canUndo()).toBe(false);
    actions.redo();
    expect(useProjectStore.getState().project.scenes[0].motion?.stagger).toBe(
      12,
    );
  });
});

describe("undo history (zundo)", () => {
  it("selecting a scene is not an undo step, but undo restores the selection", () => {
    const actions = useProjectStore.getState();
    actions.selectScene("second");
    expect(canUndo()).toBe(false);
    actions.updateSceneTransition("second", "push");
    actions.selectScene("first");
    actions.undo();
    expect(useProjectStore.getState().selectedSceneId).toBe("second");
  });

  it("a drag that changed nothing adds no step", () => {
    const actions = useProjectStore.getState();
    actions.beginHistoryTransaction();
    actions.endHistoryTransaction();
    expect(canUndo()).toBe(false);
  });

  it("a new edit after undo drops the redo branch", () => {
    const actions = useProjectStore.getState();
    actions.updateSceneTransition("first", "push");
    actions.undo();
    actions.updateSceneStagger("first", 5);
    expect(useProjectStore.temporal.getState().futureStates).toHaveLength(0);
  });

  it("opening another project starts with an empty history", () => {
    const actions = useProjectStore.getState();
    actions.updateSceneTransition("first", "push");
    expect(canUndo()).toBe(true);
    actions.openProject(createEmptyProject("other", "Other"));
    expect(canUndo()).toBe(false);
  });
});

describe("visual keyframe updates", () => {
  beforeEach(() => {
    useProjectStore.getState().updateSceneVisuals("first", [
      {
        id: "image",
        visual: { type: "image", src: "test.png" },
        x: 30,
        y: 60,
        scale: 1,
      },
      {
        id: "other",
        visual: { type: "image", src: "other.png" },
        x: 50,
        y: 50,
      },
    ]);
  });

  it("merges position and scale at the same frame and preserves other layers", () => {
    const actions = useProjectStore.getState();
    const other = actions.project.scenes[0].content.visuals![1];
    actions.addVisualKeyframe("first", "image", 20, "position", {
      x: 40,
      y: 70,
    });
    actions.addVisualKeyframe("first", "image", 20, "scale", {
      x: 0,
      y: 0,
      scale: 2,
    });
    const visuals =
      useProjectStore.getState().project.scenes[0].content.visuals!;
    expect(visuals[0].keyframes).toHaveLength(1);
    expect(visuals[0].keyframes![0]).toMatchObject({
      frame: 20,
      x: 40,
      y: 70,
      scale: 2,
    });
    expect(visuals[1]).toBe(other);
    actions.undo();
    expect(
      useProjectStore.getState().project.scenes[0].content.visuals![0]
        .keyframes![0].scale,
    ).toBeUndefined();
  });

  it("sorts moved keyframes and clears the final removed keyframe", () => {
    const actions = useProjectStore.getState();
    actions.addVisualKeyframe("first", "image", 20, "position");
    actions.addVisualKeyframe("first", "image", 10, "position");
    const keyframes =
      useProjectStore.getState().project.scenes[0].content.visuals![0]
        .keyframes!;
    expect(keyframes.map((keyframe) => keyframe.frame)).toEqual([10, 20]);
    actions.updateVisualKeyframe("first", "image", keyframes[0].id, {
      frame: 30,
    });
    expect(
      useProjectStore
        .getState()
        .project.scenes[0].content.visuals![0].keyframes!.map(
          (keyframe) => keyframe.frame,
        ),
    ).toEqual([20, 30]);
    for (const keyframe of keyframes)
      actions.removeVisualKeyframe("first", "image", keyframe.id);
    expect(
      useProjectStore.getState().project.scenes[0].content.visuals![0]
        .keyframes,
    ).toBeUndefined();
    actions.undo();
    expect(
      useProjectStore.getState().project.scenes[0].content.visuals![0]
        .keyframes,
    ).toHaveLength(1);
  });

  it("ignores missing layers without changing project data", () => {
    const actions = useProjectStore.getState();
    const project = actions.project;
    actions.addVisualKeyframe("first", "missing", 10, "position");
    actions.updateVisualKeyframe("missing", "image", "missing", { frame: 20 });
    actions.removeVisualKeyframe("first", "missing", "missing");
    expect(useProjectStore.getState().project).toBe(project);
  });
});
