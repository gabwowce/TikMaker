import { describe, expect, it } from "vitest";
import type { DesignRule } from "../../../schema/knowledge";
import type { VideoProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { countSfx, sfxPer10s } from "../sfxDensity";

// "none" switches the automatic scene sound off, so only what a test adds counts.
const scene = (id: string, motion: Scene["motion"] = { sfx: "none" }) =>
  ({ id, durationSeconds: 5, content: {}, motion }) as unknown as Scene;
const project = (scenes: Scene[], audioClips: VideoProject["audioClips"] = []) =>
  ({ fps: 30, scenes, audioClips }) as unknown as VideoProject;
const rule: DesignRule = { id: "sfx-density", check: "sfxPer10s", max: 3, level: "warning" };

describe("countSfx", () => {
  it("counts scene cues and timeline clips", () => {
    const p = project(
      [scene("a", { sfx: "d-pop" }), scene("b")],
      [{ id: "c", sfxId: "soft-whoosh", from: 0 }],
    );
    expect(countSfx(p)).toBe(2);
  });
});

describe("sfxPer10s", () => {
  it("is quiet under the limit", () => {
    expect(sfxPer10s(project([scene("a", { sfx: "d-pop" }), scene("b")]), rule)).toEqual([]);
  });

  it("warns over the limit", () => {
    // 10 s of video with 4 sounds = 4 per 10 s.
    const clips = ["1", "2", "3", "4"].map((id) => ({ id, sfxId: "soft-whoosh", from: 0 }));
    const result = sfxPer10s(project([scene("a"), scene("b")], clips), rule);
    expect(result[0].message).toBe(
      "4.0 sound effects per 10 s, the limit is 3. Keep sounds for the key moments.",
    );
  });
});
