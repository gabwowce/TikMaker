import { describe, expect, it } from "vitest";
import { isLimitError } from "../limits.js";

describe("usage limits", () => {
  it("knows a limit from any other failure", () => {
    expect(
      isLimitError(
        new Error("Claude Code: You've hit your 5-hour limit · resets 5pm"),
      ),
    ).toBe(true);
    expect(isLimitError(new Error("429 Too Many Requests"))).toBe(true);
    expect(isLimitError(new Error("The answer does not match"))).toBe(false);
  });

});
