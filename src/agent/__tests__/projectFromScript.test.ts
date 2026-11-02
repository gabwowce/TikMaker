import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../schema/project";
import { parseProject } from "../../utils/normalizeProject";
import { projectFromScript } from "../projectFromScript";
import type { AgentRun } from "../run/run";

const scene = (role: string, needsRecording = false) => ({
  role,
  voiceover: `The ${role} line.`,
  onScreen: `${role} words`,
  visual: "a terminal",
  needsRecording,
});
const run = {
  id: "run-1",
  projectId: "p1",
  createdAt: 0,
  status: "awaiting_approval",
  input: {
    idea: "How to undo the last git commit in a few seconds",
    workspaceId: "dev",
    targetSeconds: 40,
    motionOnly: false,
    withFace: false,
    generateVoice: false,
  },
  template: { videoTemplateId: "how-to-steps", pickedBy: "agent" },
  script: {
    scenes: [scene("hook"), scene("item", true), scene("cta")],
    skipped: [],
    problems: [],
    approved: true,
  },
  steps: [],
} as AgentRun;

describe("projectFromScript", () => {
  const project = projectFromScript(createEmptyProject("p1", "Test"), run);

  it("turns every scene of the script into a project scene, in order", () => {
    expect(project.scenes.map((s) => s.plan?.role)).toEqual([
      "hook",
      "item",
      "cta",
    ]);
    expect(project.scenes[1]).toMatchObject({
      type: "visual-explainer",
      vo: "The item line.",
      content: { headline: "item words" },
      plan: { visualBrief: "a terminal" },
      notes: "🎥 Your own recording",
    });
    expect(project.scenes[0].type).toBe("hook-centered");
    expect(project.scenes[2].type).toBe("takeaway");
  });

  it("remembers the idea, the template and the channel", () => {
    expect(project.storyPlan?.premise).toBe(run.input.idea);
    expect(project.videoTemplateId).toBe("how-to-steps");
    expect(project.workspaceId).toBe("dev");
  });

  it("makes a project the editor can open (NFR-05)", () => {
    expect(() => parseProject(project)).not.toThrow();
  });
});
