import { describe, expect, it } from "vitest";
import type { DesignRule } from "../../knowledge";
import type { VideoProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { secondsWithoutChange } from "../visualChange";

const rule: DesignRule = { id: "visual-change", check: "secondsWithoutChange", max: 5, level: "warning" };
const scene = (id: string, durationSeconds: number, visuals: unknown[] = []) =>
  ({ id, durationSeconds, background: "solid-dark", content: { visuals } }) as unknown as Scene;
const project = (scenes: Scene[]) => ({ fps: 30, scenes }) as unknown as VideoProject;
const layer = (type: string, delay?: number) => ({ id: "l", visual: { type }, delay });

describe("secondsWithoutChange", () => {
  it("is quiet when scenes are short", () => {
    expect(secondsWithoutChange(project([scene("a", 4), scene("b", 4)]), rule)).toEqual([]);
  });

  it("warns about a long scene where nothing new appears", () => {
    const result = secondsWithoutChange(project([scene("a", 4), scene("b", 8)]), rule);
    expect(result.map((v) => v.sceneId)).toEqual(["b"]);
    expect(result[0].message).toBe(
      "Scene 2: nothing changes on screen for 8.0 s, the limit is 5 s. Add a visual or split the scene.",
    );
  });

  it("counts a layer arriving mid-scene as a change", () => {
    // 8 s scene, a layer at 4 s (frame 120): two 4 s stretches.
    expect(secondsWithoutChange(project([scene("a", 8, [layer("prop", 120)])]), rule)).toEqual([]);
  });

  it("lets a recording carry a long scene", () => {
    expect(secondsWithoutChange(project([scene("a", 12, [layer("recording")])]), rule)).toEqual([]);
  });
});
