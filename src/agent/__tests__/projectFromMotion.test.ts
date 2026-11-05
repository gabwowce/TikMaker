import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../schema/project";
import { wordFrame } from "../../utils/voWords";
import { STAGE_LAYOUTS } from "../../video/stage/stageTypes";
import { projectFromBlocks } from "../projectFromBlocks";
import { projectFromScript } from "../projectFromScript";
import type { AgentRun } from "../run/run";

const scene = (voiceover: string) => ({
  role: "item",
  voiceover,
  onScreen: "",
  visual: "",
  needsRecording: false,
});
const run = {
  id: "r1",
  projectId: "p",
  createdAt: 0,
  status: "done",
  input: { idea: "An idea", workspaceId: "dev", targetSeconds: 45 },
  steps: [],
  script: {
    approved: true,
    problems: [],
    skipped: [],
    scenes: [
      scene("Claude and GitHub work together on every single commit"),
      scene("So you pick a tool and check the result"),
    ],
  },
  blocks: {
    problems: [],
    wishes: [],
    scenes: [
      {
        stage: "top",
        keywords: [],
        blocks: [
          { onWord: "Claude", kind: "logos", ids: ["claude", "github"] },
          { onWord: "together", kind: "badge", text: "01" },
        ],
      },
      {
        stage: "bottom",
        keywords: [],
        blocks: [{ onWord: "tool", kind: "list", items: ["Pick", "Check"] }],
      },
    ],
  },
  motion: {
    problems: [],
    idea: "In from the right, carried into the next scene.",
    scenes: [
      {
        transition: "cut",
        blocks: [
          {
            entrance: "slideLeft",
            enterFrames: 10,
            exit: "slideLeft",
            exitFrames: 6,
          },
          {
            entrance: "pop",
            enterFrames: 8,
            exit: "fade",
            exitFrames: 6,
            moves: [{ onWord: "commit", y: 30, scale: 0.8 }],
            carry: true,
          },
        ],
      },
      {
        transition: "cut",
        blocks: [
          { entrance: "fade", enterFrames: 8, exit: "fade", exitFrames: 6 },
        ],
      },
    ],
  },
} as unknown as AgentRun;

const project = projectFromBlocks(
  projectFromScript(createEmptyProject("p", "p"), run),
  run,
);
const [first, second] = project.scenes;

describe("projectFromBlocks with the agent's motion", () => {
  it("gives every block the entrance and exit the agent picked", () => {
    const [logos] = first.content.visuals ?? [];
    expect(logos).toMatchObject({
      entrance: "slideLeft",
      entranceDuration: 10,
      exit: "slideLeft",
      exitDuration: 6,
    });
  });

  it("turns a move into keyframes on its word", () => {
    const badge = (first.content.visuals ?? [])[1];
    const [from, to] = badge.keyframes ?? [];
    expect(from.frame).toBe(wordFrame(8, 30)); // "commit"
    expect(to).toMatchObject({ y: 30, scale: 0.8 });
  });

  it("carries the last block into the next scene's first place", () => {
    const badge = (first.content.visuals ?? [])[1];
    // it stays to the end, no exit of its own
    expect(badge.exit).toBe("none");
    const [carried, list] = second.content.visuals ?? [];
    expect(carried.visual).toMatchObject({
      type: "stage-block",
      settled: true,
    });
    expect(carried.delay).toBe(0);
    // it glides from the pose it ended on to this scene's place …
    expect(carried.keyframes?.[0]).toMatchObject({ y: 30, scale: 0.8 });
    expect(carried.keyframes?.[1].y).toBeCloseTo(
      (STAGE_LAYOUTS.bottom.visuals[0].y / 1920) * 100,
    );
    // … and leaves when this scene's first block arrives there
    expect(carried.exitAt).toBe(list.delay);
  });
});
