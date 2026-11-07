import { describe, expect, it } from "vitest";
import { isLimitError, resumeStatus } from "../limits.js";

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

  it("goes on from the nearest point the agent can start from", () => {
    expect(resumeStatus("writing_script")).toBe("awaiting_hook");
    // the build skips what it already has, so a pause in the review goes on
    // with the review
    expect(resumeStatus("reviewing")).toBe("awaiting_approval");
    expect(resumeStatus("laying_out")).toBe("awaiting_approval");
    expect(resumeStatus("writing_hooks")).toBe("created");
  });
});
