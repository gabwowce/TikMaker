import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatTimecode,
  frameStep,
  framesToSeconds,
} from "../timecode";
describe("timecode", () => {
  it("shows milliseconds, because one frame at 30fps is 33ms", () => {
    expect(formatTimecode(74, 30)).toBe("0:02.467");
  });
  it("keeps minutes even at zero so the field never changes width", () => {
    expect(formatTimecode(0, 30)).toBe("0:00.000");
  });
  it("carries a rounded-up millisecond into the next second", () => {
    expect(formatTimecode(59.994, 30)).toBe("0:02.000");
  });
  it("formats a duration without minutes", () => {
    expect(formatDuration(45, 30)).toBe("1.500s");
  });
  it("steps by exactly one frame", () => {
    expect(frameStep(30)).toBe(0.0333);
    expect(framesToSeconds(45, 30)).toBe(1.5);
  });
});
