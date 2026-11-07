import { describe, expect, it } from "vitest";
import { createEmptyProject } from "../../schema/project";
import { resolveSceneDuration } from "../../utils/pacing";
import { wordFrame } from "../../utils/voWords";
import { STAGE_LAYOUTS } from "../../video/stage/stageTypes";
import { projectFromBlocks } from "../projectFromBlocks";
import { projectFromScript } from "../projectFromScript";
import type { AgentRun } from "../run/run";

const script = {
  approved: true,
  problems: [],
  skipped: [],
  scenes: [
    {
      role: "hook",
      voiceover: "Claude and GitHub work together on every commit",
      onScreen: "Claude + GitHub",
      visual: "two logos",
      needsRecording: false,
    },
    {
      role: "item",
      voiceover: "Pick a tool, check the result and move on",
      onScreen: "Pick, check",
      visual: "a list",
      needsRecording: false,
    },
  ],
};
const run = {
  id: "r1",
  projectId: "p",
  createdAt: 0,
  status: "done",
  input: { idea: "An idea", workspaceId: "dev", targetSeconds: 45 },
  steps: [],
  script,
  blocks: {
    problems: [],
    wishes: [],
    scenes: [
      {
        keywords: ["Claude"],
        blocks: [
          { onWord: "Claude", kind: "logos", ids: ["claude", "github"] },
          { onWord: "commit", kind: "badge", text: "01" },
        ],
      },
      {
        stage: "bottom",
        keywords: ["check"],
        blocks: [{ onWord: "Pick", kind: "list", items: ["Pick", "Check"] }],
      },
    ],
  },
} as unknown as AgentRun;

const project = projectFromBlocks(
  projectFromScript(createEmptyProject("p", "p"), run),
  run,
);
const [first, second] = project.scenes;

describe("projectFromBlocks", () => {
  it("makes every block a layer that starts on its word", () => {
    const layers = first.content.visuals ?? [];
    expect(layers.map((l) => l.visual.type)).toEqual([
      "stage-block",
      "stage-block",
    ]);
    expect(layers[0].delay).toBe(wordFrame(0, 30)); // "Claude"
    expect(layers[1].delay).toBe(wordFrame(7, 30)); // "commit"
    // the first leaves when the second arrives in its place
    expect(layers[0].exitAt).toBe(layers[1].delay);
  });

  it("puts the picture and the stage where the scene's stage type says", () => {
    expect(first.stage).toBe("top");
    expect(first.background).toBe("stage");
    expect(second.stage).toBe("bottom");
    const [list] = second.content.visuals ?? [];
    expect(list.scale).toBe(STAGE_LAYOUTS.bottom.visuals[0].scale);
    expect(list.y).toBeCloseTo(
      (STAGE_LAYOUTS.bottom.visuals[0].y / 1920) * 100,
    );
  });

  it("lets the last picture leave by the scene's end, nothing moving on", () => {
    const last = (first.content.visuals ?? [])[1];
    const end = Math.round(resolveSceneDuration(first) * 30);
    expect(last.exitAt).toBe(end);
    expect(last.keyframes).toBeUndefined();
  });

  it("rebuilds only the scene the agent changed, keeping the rest", () => {
    // a hand edit in scene 1, then the agent changes scene 2
    const edited = {
      ...project,
      scenes: [{ ...first, notes: "moved by hand" }, second],
    };
    const changed = structuredClone(run);
    changed.blocks!.scenes[1].blocks = [
      { onWord: "Pick", kind: "number", value: 2, text: "Two" },
    ];
    const after = projectFromBlocks(edited, changed, 1);
    expect(after.scenes[0]).toEqual(edited.scenes[0]);
    const layers = after.scenes[1].content.visuals ?? [];
    expect(layers).toHaveLength(1);
    expect(layers[0].visual).toMatchObject({
      type: "stage-block",
      block: { kind: "number" },
    });
  });

  it("keeps the creator's picture when the scene is rebuilt asking for the same one", () => {
    const withPicture = structuredClone(run);
    const picture = {
      onWord: "Pick",
      kind: "picture" as const,
      text: "A robot hand",
      find: "a robot hand holding a glowing globe, cut out",
      look: "cutout" as const,
    };
    withPicture.blocks!.scenes[1].blocks = [picture];
    const built = projectFromBlocks(project, withPicture, 1);
    // the creator puts a file into the block (right-click → Replace asset)
    const filled = structuredClone(built);
    const layer = filled.scenes[1].content.visuals![0];
    if (layer.visual.type === "stage-block") layer.visual.src = "/assets/hand.png";
    // rebuilt with the same request: the file stays …
    const again = projectFromBlocks(filled, withPicture, 1);
    expect(again.scenes[1].content.visuals![0].visual).toMatchObject({
      src: "/assets/hand.png",
    });
    // … asking for another picture: empty again
    const other = structuredClone(withPicture);
    other.blocks!.scenes[1].blocks = [{ ...picture, find: "a folder" }];
    const changed = projectFromBlocks(filled, other, 1);
    expect(changed.scenes[1].content.visuals![0].visual).not.toHaveProperty(
      "src",
    );
  });

  it("turns the captions kinetic with the agent's key words", () => {
    expect(project.captions).toMatchObject({
      style: "kinetic",
      keywords: ["Claude", "check"],
    });
  });
});
