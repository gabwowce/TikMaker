import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { useProjectStore } from "../projectStore";

vi.mock("../fileLibrary", () => ({ deleteEntry: vi.fn(), saveNow: vi.fn() }));
vi.mock("../projectLibrary", () => ({
  libraryIndexFrom: () => [],
  loadInitialState: vi.fn(),
  persist: vi.fn(),
  readLibrary: () => ({}),
  rememberLastOpened: vi.fn(),
  writeLibrary: vi.fn(),
}));
vi.mock("../../timeline/useAudioWaveforms", () => ({
  cachedAudioDuration: vi.fn(),
}));

let projectNumber = 0;

beforeEach(() => {
  const scenes: Scene[] = ["first", "second"].map((id) => ({
    id,
    type: "visual-explainer",
    background: "solid-dark",
    vo: "Original narration",
    content: {
      richHeadline: [
        { text: "Keep this eyebrow", size: "label" as const },
        { text: "Original title", size: "headline" as const },
      ],
    },
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
    actions.updateSceneVisuals("first", [
      { id: "layer", visual: { type: "image", src: "a.png" }, x: 25, y: 60 },
    ]);
    actions.updateSceneRichHeadline("first", [
      { text: "New title", size: "headline" },
    ]);
    actions.updateSceneEntrance("first", "slideUp");
    const [first, unchanged] = useProjectStore.getState().project.scenes;
    expect(first.content.visuals?.[0]).toMatchObject({ x: 25, y: 60 });
    expect(first.content.richHeadline?.[0].text).toBe("New title");
    expect(first.content.richHeadline).toHaveLength(1);
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
    expect(useProjectStore.getState().canUndo).toBe(true);
    actions.undo();
    expect(
      useProjectStore.getState().project.scenes[0].motion?.transition,
    ).toBe("cut");
    expect(useProjectStore.getState().canUndo).toBe(false);
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
    expect(useProjectStore.getState().canUndo).toBe(false);
    actions.redo();
    expect(useProjectStore.getState().project.scenes[0].motion?.stagger).toBe(
      12,
    );
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
