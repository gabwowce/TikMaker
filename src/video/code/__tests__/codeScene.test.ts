import { describe, expect, it } from "vitest";
import { z } from "zod";
import projectJson from "../../../../db/projects/code-video-brand.json";
import { computeSceneTimings, projectDurationInFrames } from "../../../utils/duration";
import { parseProject } from "../../../utils/normalizeProject";
import { sceneWords } from "../../../utils/sceneWords";
import { sceneParams } from "../params";

describe("code scenes in a project", () => {
  const project = parseProject(projectJson);

  it("keeps the type, the file and the timing", () => {
    expect(project.scenes).toHaveLength(9);
    expect(project.scenes.every((scene) => scene.type === "code")).toBe(true);
    expect(project.scenes[2].code?.file).toBe("code-video-brand/scene-3.tsx");
    expect(project.scenes[0].durationSeconds).toBeCloseTo(3.276);
  });

  it("gives every scene its own words, from the scene's start", () => {
    const total = projectDurationInFrames(project);
    const timings = computeSceneTimings(project);
    const third = timings[2];
    const words = sceneWords(
      project,
      { from: third.from, durationInFrames: third.durationInFrames, vo: third.scene.vo },
      total,
    );
    expect(words.length).toBe(19);
    expect(words[0].frame).toBeGreaterThanOrEqual(0);
    expect(words[0].frame).toBeLessThan(10);
    expect(words[words.length - 1].frame).toBeLessThan(third.durationInFrames);
  });

  it("paces the voiceover when the scene has no voice yet", () => {
    const silent = { ...project, audioClips: [] };
    const words = sceneWords(silent, { from: 0, durationInFrames: 90, vo: "one two three" }, 90);
    expect(words.map((w) => w.text)).toEqual(["one", "two", "three"]);
    expect(words[1].frame).toBeGreaterThan(words[0].frame);
  });
});

describe("sceneParams", () => {
  const schema = z.object({
    title: z.string().default("Hello"),
    count: z.number().min(0).default(3),
  });

  it("fills in the defaults", () => {
    expect(sceneParams({ schema }, undefined)).toEqual({ title: "Hello", count: 3 });
  });

  it("keeps the fields that fit and resets the ones that do not", () => {
    expect(sceneParams({ schema }, { title: "Hi", count: -5 })).toEqual({
      title: "Hi",
      count: 3,
    });
  });

  it("passes the values on when the scene has no schema", () => {
    expect(sceneParams({}, { a: 1 })).toEqual({ a: 1 });
  });
});
