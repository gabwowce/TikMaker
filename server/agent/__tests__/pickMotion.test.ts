import { MockLanguageModelV4 } from "ai/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import type { BlocksFromAi } from "../../../src/agent/run/4-blocks.js";
import type { MotionFromAi } from "../../../src/agent/run/4-motion.js";
import { loadKnowledge } from "../knowledge.js";
import { pickMotion } from "../prompts/pickMotion.js";

// The real knowledge base, for the real motion principles.
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../knowledge",
);
const { knowledge } = await loadKnowledge(root);
const scenes: SceneFromAi[] = [
  {
    role: "hook",
    voiceover: "Made a bad commit? You can undo it in one command.",
    onScreen: "",
    visual: "",
    needsRecording: false,
  },
];
const blocks: BlocksFromAi = {
  wishes: [],
  scenes: [
    {
      stage: "top",
      keywords: [],
      blocks: [
        {
          onWord: "undo",
          kind: "terminal",
          lines: ["git reset --soft HEAD~1"],
        },
      ],
    },
  ],
};
const answer: MotionFromAi = {
  idea: "Everything arrives from the right and leaves to the left.",
  scenes: [
    {
      transition: "cut",
      blocks: [
        { entrance: "slideLeft", enterFrames: 10, exit: "fade", exitFrames: 6 },
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

describe("pickMotion with a fake model", () => {
  it("returns the motion and sends the timeline, the moves and the principles", async () => {
    const result = await pickMotion(
      scenes,
      blocks,
      knowledge.motionPrinciples,
      undefined,
      fakeModel(answer),
    );
    expect(result.data).toEqual(answer);
    const user = result.prompt.user;
    expect(user).toContain(scenes[0].voiceover);
    expect(user).toContain('on "undo"');
    expect(user).toContain("git reset --soft HEAD~1");
    expect(user).toContain("- zoomSettleRight:");
    expect(user).toContain("- burstOut:");
    expect(user).toContain(knowledge.motionPrinciples[0].principle);
    expect(user).not.toContain("Your previous answer");
  });

  it("asks for a fix with the previous answer and the problems", async () => {
    const result = await pickMotion(
      scenes,
      blocks,
      knowledge.motionPrinciples,
      {
        motion: answer,
        problems: [{ sceneIndex: 0, message: "Scene 1: something is wrong" }],
      },
      fakeModel(answer),
    );
    expect(result.prompt.user).toContain("Your previous answer");
    expect(result.prompt.user).toContain("- Scene 1: something is wrong");
  });
});
