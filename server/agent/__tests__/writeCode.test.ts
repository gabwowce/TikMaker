import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import { createEmptyProject } from "../../../src/schema/project.js";
import { framesToReview } from "../frames.js";
import { writeCodePrompt, type CodeJob } from "../prompts/writeCode.js";

const scene = (voiceover: string): SceneFromAi => ({
  role: "item",
  voiceover,
  onScreen: "Key words",
  visual: "a terminal filling up",
  needsRecording: false,
});

const job: CodeJob = {
  input: { idea: "3 Claude Code mistakes", workspaceId: "dev", targetSeconds: 45 } as CodeJob["input"],
  workspace: {
    id: "dev",
    name: "TikMaker and AI coding",
    brief: "AI coding tips",
    audience: "developers",
    tone: "direct",
    language: "en",
  },
  folder: "p1",
  scenes: [
    {
      scene: scene("Every message resends the history"),
      file: "p1/scene-1.tsx",
      from: 0,
      durationInFrames: 120,
      words: [
        { text: "Every", frame: 0, endFrame: 6 },
        { text: "message", frame: 7, endFrame: 15 },
      ],
    },
    {
      scene: { ...scene("Record it"), needsRecording: true },
      file: "p1/scene-2.tsx",
      from: 120,
      durationInFrames: 90,
      words: [],
      current: "export default function Old() { return null; }",
    },
  ],
  write: [1],
  instruction: "Make the terminal bigger",
  propsFile: "out/agent/p1/props.json",
  visuals: [
    { id: "fuel", title: "Fuel gauge", description: "A gauge that drains", file: "knowledge/workspaces/dev/visuals/fuel/code.tsx" },
  ],
};

describe("writeCodePrompt", () => {
  const { system, user } = writeCodePrompt(job);

  it("points Claude Code at the three layers of skills and the folder", () => {
    expect(system).toContain(".claude/skills/tikmaker-explainer/SKILL.md");
    expect(system).toContain(".claude/skills/remotion-best-practices/remotion-markup/REFERENCE.md");
    expect(system).toContain("src/video/brand/kit.tsx");
    expect(system).toContain("npx tsc --noEmit -p .");
    expect(user).toContain("Folder: src/generated/p1/");
  });

  it("gives every scene its words, length and file, and what to write now", () => {
    expect(user).toContain("Words (word@frame from the scene's start): Every@0 message@7");
    expect(user).toContain("## Scene 1 (item) – already written, keep src/generated/p1/scene-1.tsx");
    expect(user).toContain("## Scene 2 (item) – WRITE src/generated/p1/scene-2.tsx");
    expect(user).toContain("Rewrite scene(s) 2 – the change asked for: Make the terminal bigger");
    // a rewrite sees the code there now
    expect(user).toContain("export default function Old()");
    expect(user).toContain("RecordingSlot");
  });

  it("tells it how to render a frame of the scene it writes", () => {
    // 70 % into scene 2: 120 + 63
    expect(user).toContain(
      "npx remotion still TikTokVideo out/agent/p1/scene-2.png --props=out/agent/p1/props.json --frame=183 --scale=0.5",
    );
  });

  it("lists the channel's saved visuals", () => {
    expect(user).toContain("Fuel gauge: A gauge that drains (code: knowledge/workspaces/dev/visuals/fuel/code.tsx)");
  });
});

describe("framesToReview for code scenes", () => {
  it("looks halfway in and near the end", () => {
    const project = createEmptyProject("p", "p");
    project.scenes = [
      { id: "a", type: "code", background: "stage", content: {}, durationSeconds: 4, code: { file: "p/scene-1.tsx" } },
    ];
    expect(framesToReview(project)).toEqual([
      { sceneIndex: 0, frame: 54 },
      { sceneIndex: 0, frame: 105 },
    ]);
  });
});

describe("checkScenes", () => {
  it("finds a scene not written and one without a component", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-code-"));
    process.env.TIKMAKER_ROOT = root;
    process.env.TIKMAKER_TSC = "off";
    const { checkScenes } = await import("../codeScenes.js");
    const dir = path.join(root, "src", "generated", "p1");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "scene-1.tsx"), "export const x = 1;");
    const found = await checkScenes({ ...job, write: [0, 1] });
    expect(found.get(0)).toEqual(["p1/scene-1.tsx has no default export (the component)"]);
    expect(found.get(1)).toEqual(["p1/scene-2.tsx was not written"]);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
