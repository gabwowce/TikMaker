import { describe, expect, it } from "vitest";
import type { DesignRule } from "../../../schema/knowledge";
import type { VideoProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { hookSeconds, sceneSeconds } from "../sceneLength";

// A fixed durationSeconds keeps pacing out of the test.
const scene = (id: string, durationSeconds: number, role?: string) =>
  ({
    id,
    durationSeconds,
    content: {},
    plan: role ? { role } : undefined,
  }) as unknown as Scene;
const project = (scenes: Scene[]) =>
  ({ fps: 30, scenes }) as unknown as VideoProject;
const rule = (id: string, max: number): DesignRule => ({
  id,
  check: id,
  max,
  level: "warning",
});

describe("sceneSeconds", () => {
  it("warns about a scene longer than the limit", () => {
    const result = sceneSeconds(
      project([scene("a", 4), scene("b", 12)]),
      rule("scene-length", 9),
    );
    expect(result.map((v) => v.sceneId)).toEqual(["b"]);
    expect(result[0].message).toBe("Scene 2: 12.0 s, the limit is 9 s.");
  });
});

describe("hookSeconds", () => {
  it("checks the scene planned as hook", () => {
    const result = hookSeconds(
      project([scene("a", 3), scene("b", 7, "hook")]),
      rule("hook-length", 5),
    );
    expect(result.map((v) => v.sceneId)).toEqual(["b"]);
  });

  it("checks the first scene when nothing is planned", () => {
    const result = hookSeconds(
      project([scene("a", 7), scene("b", 9)]),
      rule("hook-length", 5),
    );
    expect(result.map((v) => v.sceneId)).toEqual(["a"]);
  });
});
