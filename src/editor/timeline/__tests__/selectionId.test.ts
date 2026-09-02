import { describe, expect, it } from "vitest";
import { objectIdOf, parseSelection, qualifySelection, sceneIdOf } from "../selectionId";

/**
 * A selection id has to say WHICH SCENE its object lives in, because a bare
 * `line-2` means "the third headline line of whatever scene is open" — which
 * made cross-scene copy resolve against the wrong scene and made a multi-scene
 * selection impossible to express at all.
 */
describe("selection ids", () => {
  it("round-trips a scene-owned object", () => {
    const id = qualifySelection("scene-07", "line-2");
    expect(parseSelection(id)).toEqual({ sceneId: "scene-07", objectId: "line-2" });
  });

  it("leaves audio clips bare — they belong to the project, not a scene", () => {
    const id = qualifySelection("scene-07", "audio-clip-abc");
    expect(id).toBe("audio-clip-abc");
    expect(parseSelection(id).sceneId).toBeNull();
  });

  it("reads an id minted before scenes were part of it", () => {
    expect(parseSelection("visual-abc")).toEqual({ sceneId: null, objectId: "visual-abc" });
    expect(sceneIdOf("visual-abc", "scene-open")).toBe("scene-open");
  });

  it("keeps the object id intact when it contains separators of its own", () => {
    const id = qualifySelection("scene-1", "check-visual-a-3");
    expect(objectIdOf(id)).toBe("check-visual-a-3");
  });

  it("does not qualify when there is no scene to qualify with", () => {
    expect(qualifySelection(undefined, "line-0")).toBe("line-0");
  });
});
