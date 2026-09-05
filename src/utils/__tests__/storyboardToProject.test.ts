import { describe, expect, it } from "vitest";
import type { Storyboard } from "../../schema/storyboard";
import { storyboardToProject } from "../storyboardToProject";

describe("storyboardToProject links", () => {
  it("keeps a durable storyboard and beat id on generated scenes", () => {
    const storyboard: Storyboard = {
      id: "sb-linked",
      title: "Linked edit",
      status: "ready",
      beats: [
        { id: "beat-hook", role: "hook", voiceover: "A hook" },
        { id: "beat-proof", role: "proof", onScreenText: "The proof" },
      ],
    };

    const project = storyboardToProject(storyboard);

    expect(project.storyboardId).toBe("sb-linked");
    expect(project.scenes.map((scene) => scene.storyboardBeatId)).toEqual(["beat-hook", "beat-proof"]);
  });
});
