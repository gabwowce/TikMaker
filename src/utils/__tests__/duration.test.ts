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

describe("audio running past a scene", () => {
  const clip = (from: number, durationInFrames: number) =>
    ({ id: `a${from}`, sfxId: "vo-x", from, durationInFrames, volume: 1 }) as never;

  it("leaves a mid-video line alone — it is free to cross a cut", () => {
    // Scenes 0-60, 60-150, 150-180. A line inside scene 1 spilling into scene 2
    // is the normal way a voiceover carries across a cut, and must not retime
    // anything: the scene it crosses into keeps its own start and length.
    const timings = computeSceneTimings(
      project({ scenes: [scene("a", 2), scene("b", 3), scene("c", 1)], audioClips: [clip(30, 90)] as never })
    );
    expect(timings.map((t) => t.from)).toEqual([0, 60, 150]);
    expect(timings.map((t) => t.durationInFrames)).toEqual([60, 90, 30]);
  });

  it("holds the LAST scene until a line that overruns the video has finished", () => {
    // Same scenes, but the line starts at 160 and runs to 280 — 100 frames past
    // the end. Scenes only render inside their own Sequence, so without this the
    // tail would play over black (and collide with the loop restart).
    const timings = computeSceneTimings(
      project({ scenes: [scene("a", 2), scene("b", 3), scene("c", 1)], audioClips: [clip(160, 120)] as never })
    );
    const last = timings[timings.length - 1];
    expect(last.from).toBe(150);
    expect(last.from + last.durationInFrames).toBe(280);
    // Held, not stretched into a gap: everything before it is untouched.
    expect(timings.slice(0, -1).map((t) => t.from)).toEqual([0, 60]);
    // Seconds follow frames, so the scene's own exit still lands at the new end
    // instead of firing early and leaving a blank hold.
    expect(last.durationSeconds).toBeCloseTo(130 / 30);
  });

  it("does not shorten the last scene when the audio ends before it does", () => {
    const timings = computeSceneTimings(
      project({ scenes: [scene("a", 2), scene("b", 3)], audioClips: [clip(0, 10)] as never })
    );
    expect(timings[1].durationInFrames).toBe(90);
  });
});
