import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createEmptyProject } from "../../../src/schema/project.js";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-visuals-"));
process.env.TIKMAKER_ROOT = root;
process.env.TIKMAKER_KNOWLEDGE = path.join(root, "knowledge");
const { listVisuals, saveVisual, savedVisualsBrief, deleteVisual } = await import(
  "../visuals.js"
);
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const project = {
  ...createEmptyProject("p1", "P"),
  workspaceId: "dev",
  scenes: [
    { id: "a", type: "visual-explainer" as const, background: "stage" as const, content: {}, durationSeconds: 2 },
    {
      id: "b",
      type: "code" as const,
      background: "stage" as const,
      content: {},
      durationSeconds: 3,
      code: { file: "p1/scene-2.tsx", params: { headline: "Mine" } },
    },
  ],
};
const dir = path.join(root, "src", "generated", "p1");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, "scene-2.tsx"),
  `import { Gauge } from "./shared";\nexport const description = "A fuel gauge drains";\nexport default function S() { return null; }\n`,
);
fs.writeFileSync(path.join(dir, "shared.tsx"), "export const Gauge = 1;\n");

describe("my visuals", () => {
  it("saves a code scene with its code, shared helpers, frame and fields", async () => {
    const frames: number[] = [];
    const visual = await saveVisual(
      { workspaceId: "dev", project, sceneId: "b", title: "Fuel gauge" },
      async (_project, frame, file) => {
        frames.push(frame);
        fs.writeFileSync(file, "png");
      },
    );
    // scene b starts at frame 60 and lasts 90: near its end
    expect(frames).toEqual([60 + 70]);
    expect(visual).toMatchObject({
      title: "Fuel gauge",
      description: "A fuel gauge drains",
      from: { projectId: "p1", file: "p1/scene-2.tsx" },
      params: { headline: "Mine" },
      hasFrame: true,
    });
    const saved = path.join(root, "knowledge", "workspaces", "dev", "visuals", visual.id);
    expect(fs.readFileSync(path.join(saved, "scene.tsx"), "utf-8")).toContain("fuel gauge drains");
    expect(fs.existsSync(path.join(saved, "shared.tsx"))).toBe(true);
    expect(listVisuals("dev").map((v) => v.id)).toEqual([visual.id]);
    // the agent gets paths it can Read from the project's folder
    expect(savedVisualsBrief("dev")).toEqual([
      {
        id: visual.id,
        title: "Fuel gauge",
        description: "A fuel gauge drains",
        file: `knowledge/workspaces/dev/visuals/${visual.id}/scene.tsx`,
        frame: `knowledge/workspaces/dev/visuals/${visual.id}/frame.png`,
      },
    ]);
    deleteVisual("dev", visual.id);
    expect(listVisuals("dev")).toEqual([]);
  });

  it("refuses a scene that is not a code scene", async () => {
    await expect(
      saveVisual({ workspaceId: "dev", project, sceneId: "a", title: "No" }, async () => {}),
    ).rejects.toThrow(/Only a code scene/);
  });
});
