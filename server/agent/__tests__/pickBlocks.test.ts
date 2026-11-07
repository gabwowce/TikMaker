import { MockLanguageModelV4 } from "ai/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ideaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import type { BlocksFromAi } from "../../../src/agent/run/4-blocks.js";
import { loadKnowledge } from "../knowledge.js";
import { blockLibrary, pickBlocks } from "../prompts/pickBlocks.js";

// The real knowledge base: the "dev" channel, as in the other step tests.
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../knowledge",
);
const { knowledge } = await loadKnowledge(root);
const workspace = knowledge.workspaces.find(
  (entry) => entry.workspace.id === "dev",
)!.workspace;
const input = ideaFromUser.parse({
  idea: "How to undo the last git commit",
  workspaceId: "dev",
});
const scenes: SceneFromAi[] = [
  {
    role: "hook",
    voiceover: "Made a bad commit? You can undo it in one command.",
    onScreen: "Undo a commit",
    visual: "a terminal",
    needsRecording: false,
  },
];
const answer: BlocksFromAi = {
  wishes: [],
  scenes: [
    {
      stage: "top",
      keywords: ["undo"],
      blocks: [
        { onWord: "Made", kind: "object", id: blockLibrary.props[0] },
        {
          onWord: "undo",
          kind: "terminal",
          lines: ["git reset --soft HEAD~1"],
        },
      ],
    },
  ],
};

// A model that answers with the given JSON texts, one per call.
function fakeModel(...answers: object[]) {
  return new MockLanguageModelV4({
    doGenerate: answers.map((a) => ({
      content: [{ type: "text" as const, text: JSON.stringify(a) }],
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 20, text: 20, reasoning: 0 },
      },
      warnings: [],
    })),
  });
}

// Two principles, as the knowledge base gives them.
const principles = [
  {
    id: "one-picture-per-thought",
    priority: "must" as const,
    principle: "One picture holds one whole thought.",
    why: "A picture per word flickers.",
    inTikMaker: "Usually one main block per sentence.",
    sources: [],
  },
];

describe("pickBlocks with a fake model", () => {
  it("returns the blocks and sends the catalogue, the ids and the voiceover", async () => {
    const result = await pickBlocks(
      input,
      workspace,
      scenes,
      principles,
      undefined,
      fakeModel(answer),
    );
    expect(result.data).toEqual(answer);
    expect(result.prompt.user).toContain("- terminal:");
    expect(result.prompt.user).toContain("- split:");
    expect(result.prompt.user).toContain(blockLibrary.logos[0]);
    expect(result.prompt.user).toContain(scenes[0].voiceover);
    expect(result.prompt.user).toContain("- screen:");
    // the knowledge, with its weight, and whether a scene asked for a recording
    expect(result.prompt.user).toContain(
      "- [must] One picture holds one whole thought.",
    );
    expect(result.prompt.user).toContain("Recording: no");
  });

  it("offers no screen card for motion graphics only", async () => {
    const result = await pickBlocks(
      { ...input, motionOnly: true },
      workspace,
      scenes,
      principles,
      undefined,
      fakeModel(answer),
    );
    expect(result.prompt.user).not.toContain("- screen:");
  });

  it("shows the previous answer and the problems when writing again", async () => {
    const result = await pickBlocks(
      input,
      workspace,
      scenes,
      principles,
      {
        blocks: answer,
        problems: [{ sceneIndex: 0, message: "Scene 1: block 1 stays 4.0 s" }],
      },
      fakeModel(answer),
    );
    expect(result.prompt.user).toContain("Your previous answer");
    expect(result.prompt.user).toContain("Scene 1: block 1 stays 4.0 s");
  });
});
