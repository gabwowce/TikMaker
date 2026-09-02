import { describe, expect, it } from "vitest";
import { computeSceneTimings, projectDurationInFrames } from "../duration";
import type { VideoProject } from "../../schema/project";

function project(patch: Partial<VideoProject>): VideoProject {
  return {
    id: "p",
    title: "T",
    fps: 30,
    width: 1080,
    height: 1920,
    scenes: [],
    ...patch,
  } as VideoProject;
}

const scene = (id: string, durationSeconds: number, content: Record<string, unknown> = {}) =>
  ({ id, type: "hook-centered", background: "solid-dark", durationSeconds, content }) as never;

/**
 * `computeSceneTimings` is the single source of truth for where each scene
 * starts — both the Remotion composition and `SceneRenderer` read it. If they
 * ever computed it separately, scenes would play past the declared length or
 * leave dead frames at the end.
 */
describe("scene timings", () => {
  it("lays scenes end to end with no gaps or overlaps", () => {
    const timings = computeSceneTimings(project({ scenes: [scene("a", 2), scene("b", 3), scene("c", 1)] }));
    expect(timings.map((t) => t.from)).toEqual([0, 60, 150]);
    expect(timings.map((t) => t.durationInFrames)).toEqual([60, 90, 30]);
  });

  it("extends the video for an element whose exit crosses the last cut", () => {
    const plain = projectDurationInFrames(project({ scenes: [scene("a", 2)] }));
    const overflowing = projectDurationInFrames(
      project({
        scenes: [scene("a", 2, { blocks: [{ id: "b", type: "text", text: "x", x: 50, y: 50, exitAt: 200 }] })],
      })
    );
    expect(overflowing).toBeGreaterThan(plain);
    expect(overflowing).toBeGreaterThanOrEqual(200);
  });

  it("extends the video for audio that runs past the last scene", () => {
    const duration = projectDurationInFrames(
      project({ scenes: [scene("a", 1)], audioClips: [{ id: "c", sfxId: "x", from: 20, durationInFrames: 400 }] })
    );
    expect(duration).toBeGreaterThanOrEqual(420);
  });

  it("never returns zero, even with no scenes at all", () => {
    expect(projectDurationInFrames(project({ scenes: [] }))).toBeGreaterThan(0);
  });
});
