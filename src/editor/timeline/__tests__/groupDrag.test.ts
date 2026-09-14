import { describe, expect, it } from "vitest";
import { groupDragPositions } from "../groupDrag";
import { snapFrame } from "../sceneTimelineLayout";

describe("timeline movement", () => {
  it("moves selected clips by the same delta and keeps their lengths", () => {
    const origins = [
      { id: "a", start: 10, end: 30 },
      { id: "b", start: 40, end: 70 },
    ];
    expect([...groupDragPositions(origins, 5)]).toEqual([
      ["a", { start: 15, end: 35 }],
      ["b", { start: 45, end: 75 }],
    ]);
    expect(origins[0].start).toBe(10);
  });
  it("limits clips to the scene boundaries", () => {
    const origins = [{ id: "a", start: 10, end: 30 }];
    expect(groupDragPositions(origins, -50, 100).get("a")).toEqual({
      start: 0,
      end: 20,
    });
    expect(groupDragPositions(origins, 100, 100).get("a")).toEqual({
      start: 80,
      end: 100,
    });
  });
  it("converts full timeline positions to local scene frames", () => {
    expect(
      groupDragPositions(
        [
          { id: "visual", start: 120, end: 150, offset: 100 },
          { id: "audio", start: 120, end: 150 },
        ],
        10,
      ).get("visual"),
    ).toEqual({ start: 30, end: 60 });
    expect(
      groupDragPositions([{ id: "audio", start: 120, end: 150 }], 10).get(
        "audio",
      ),
    ).toEqual({ start: 130, end: 160 });
  });
  it("snaps only within seven screen pixels at the current zoom", () => {
    expect(snapFrame(12, [10, 20], 2)).toBe(10);
    expect(snapFrame(12, [10, 20], 4)).toBe(12);
    expect(snapFrame(17, [10, 20], 2)).toBe(20);
  });
});
