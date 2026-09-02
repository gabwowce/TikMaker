import { describe, expect, it } from "vitest";
import { poseAtFrame, hasKeyframePath, keyframesFor } from "../visualKeyframes";
import type { PositionedVisualEntry } from "../../../schema/scene";

/**
 * Position and scale are INDEPENDENT tracks.
 *
 * They were not always: every keyframe used to be resolved against the layer's
 * base pose for the fields it left out, so a keyframe that only moved the layer
 * also asserted a scale, and a scale keyframe dragged the position back. These
 * tests pin the behaviour that replaced it, because the failure mode is silent
 * — the render simply animates the wrong property and nothing errors.
 */

function layer(keyframes: PositionedVisualEntry["keyframes"]): PositionedVisualEntry {
  return {
    id: "v",
    visual: { type: "prop", asset: "key" },
    x: 50,
    y: 50,
    scale: 1,
    keyframes,
  } as PositionedVisualEntry;
}

describe("keyframe tracks", () => {
  it("treats a position keyframe as invisible to scale, and the reverse", () => {
    const entry = layer([
      { id: "a", frame: 0, x: 10, y: 10 },
      { id: "b", frame: 30, scale: 2 },
    ]);
    expect(keyframesFor(entry, "position").map((k) => k.id)).toEqual(["a"]);
    expect(keyframesFor(entry, "scale").map((k) => k.id)).toEqual(["b"]);
  });

  it("holds a single-keyframe track flat instead of easing toward the base pose", () => {
    const entry = layer([
      { id: "a", frame: 0, x: 10, y: 10 },
      { id: "b", frame: 30, scale: 2 },
    ]);
    // The position track has one keyframe, so x stays at 10 the whole time —
    // it must NOT drift back to the base 50 just because a scale keyframe sits
    // later on the timeline.
    expect(poseAtFrame(entry, 0).x).toBe(10);
    expect(poseAtFrame(entry, 15).x).toBe(10);
    expect(poseAtFrame(entry, 30).x).toBe(10);
  });

  it("spreads the travel across the whole gap instead of front-loading it", () => {
    const entry = layer([
      { id: "a", frame: 0, x: 0, y: 0 },
      { id: "b", frame: 100, x: 100, y: 0 },
    ]);
    expect(poseAtFrame(entry, 0).x).toBe(0);
    expect(poseAtFrame(entry, 100).x).toBe(100);

    // The curve used to be the ARRIVAL easing, which covered half the distance
    // in the first tenth of the gap and 94% by the fourth — so widening the gap
    // lengthened the stillness after the move, not the move. Asserting only
    // "the midpoint is somewhere between the ends" passes for that curve too,
    // which is exactly why it went unnoticed. These bounds do not.
    expect(poseAtFrame(entry, 10).x).toBeLessThan(15);
    expect(poseAtFrame(entry, 50).x).toBeGreaterThan(40);
    expect(poseAtFrame(entry, 50).x).toBeLessThan(60);
    expect(poseAtFrame(entry, 90).x).toBeGreaterThan(85);
  });

  it("keeps the motion symmetric, so the middle of the gap is the middle of the move", () => {
    const entry = layer([
      { id: "a", frame: 0, x: 0, y: 0 },
      { id: "b", frame: 100, x: 100, y: 0 },
    ]);
    const quarter = poseAtFrame(entry, 25).x;
    const threeQuarters = poseAtFrame(entry, 75).x;
    expect(quarter + threeQuarters).toBeCloseTo(100, 0);
  });

  it("is still travelling at a moment the tighter pair has already finished", () => {
    const tight = layer([
      { id: "a", frame: 0, x: 0, y: 0 },
      { id: "b", frame: 30, x: 100, y: 0 },
    ]);
    const loose = layer([
      { id: "a", frame: 0, x: 0, y: 0 },
      { id: "b", frame: 120, x: 100, y: 0 },
    ]);
    // At the same instant the tighter pair is further along its travel. That is
    // the entire contract of a keyframe pair: the gap IS the duration.
    expect(poseAtFrame(tight, 20).x).toBeGreaterThan(poseAtFrame(loose, 20).x);
  });

  it("holds at both ends rather than extrapolating off screen", () => {
    const entry = layer([
      { id: "a", frame: 30, x: 20, y: 0 },
      { id: "b", frame: 60, x: 80, y: 0 },
    ]);
    expect(poseAtFrame(entry, 0).x).toBe(20);
    expect(poseAtFrame(entry, 999).x).toBe(80);
  });

  it("leaves scale untouched when nothing keyframes it", () => {
    const entry = layer([
      { id: "a", frame: 0, x: 0, y: 0 },
      { id: "b", frame: 30, x: 50, y: 0 },
    ]);
    expect(poseAtFrame(entry, 15).scale).toBe(1);
  });

  it("counts a path per track, not across the whole array", () => {
    // One position keyframe plus one scale keyframe is a path in neither.
    expect(hasKeyframePath(layer([{ id: "a", frame: 0, x: 1, y: 1 }, { id: "b", frame: 9, scale: 2 }]))).toBe(false);
    expect(hasKeyframePath(layer([{ id: "a", frame: 0, x: 1, y: 1 }, { id: "b", frame: 9, x: 2, y: 2 }]))).toBe(true);
  });
});
