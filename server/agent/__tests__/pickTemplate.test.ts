import { MockLanguageModelV4 } from "ai/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ideaFromUser } from "../../../src/agent/run/1-idea.js";
import { loadKnowledge } from "../knowledge.js";
import { StructuredCallError } from "../ai/llm.js";
import { pickTemplate } from "../prompts/pickTemplate.js";

// The real knowledge base: the step must work with the templates we ship.
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../knowledge",
);
const { knowledge } = await loadKnowledge(root);
const templates = knowledge.videoTemplates;
const workspace = knowledge.workspaces.find(
  (entry) => entry.workspace.id === "dev",
)!.workspace;
const input = (idea: string) =>
  ideaFromUser.parse({ idea, workspaceId: "dev" });

// A model that answers with the given JSON texts, one per call.
function fakeModel(...answers: object[]) {
  return new MockLanguageModelV4({
    doGenerate: answers.map((answer) => ({
      content: [{ type: "text" as const, text: JSON.stringify(answer) }],
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 20, text: 20, reasoning: 0 },
      },
      warnings: [],
    })),
  });
}

describe("pickTemplate with a fake model", () => {
  it("returns the model's pick when it names a real template", async () => {
    const pick = { videoTemplateId: "pain-to-fix", score: 4, reason: "Fits.", needsFacts: true };
    const result = await pickTemplate(
      input("How to undo the last git commit in a few seconds"),
      workspace,
      templates,
      fakeModel(pick),
    );
    expect(result.data).toEqual(pick);
    expect(result.attempts).toBe(1);
  });

  it("asks again when the model makes a template up", async () => {
    const result = await pickTemplate(
      input("How to undo the last git commit in a few seconds"),
      workspace,
      templates,
      fakeModel(
        { videoTemplateId: "no-such-template", score: 5, reason: "Made up.", needsFacts: true },
        { videoTemplateId: "how-to-steps", score: 4, reason: "Steps.", needsFacts: true },
      ),
    );
    expect(result.data.videoTemplateId).toBe("how-to-steps");
    expect(result.attempts).toBe(2);
    // Both answers were paid for, the rejected one too.
    expect(result.usage).toMatchObject({ inputTokens: 200, outputTokens: 40 });
  });
});
describe("a call that gives up", () => {
  it("still reports what it sent, how often and what it cost", async () => {
    const madeUp = { videoTemplateId: "no-such", score: 5, reason: "Made up.", needsFacts: true };
    const error = await pickTemplate(
      input("How to undo the last git commit in a few seconds"),
      workspace,
      templates,
      fakeModel(madeUp, madeUp, madeUp),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StructuredCallError);
    const { log } = error as StructuredCallError;
    expect(log.attempts).toBe(3);
    expect(log.usage).toMatchObject({ inputTokens: 300, outputTokens: 60 });
    expect(log.prompt.user).toContain("Templates:");
  });
});
// Real Gemini: runs only when the key is given, e.g.
//   node --env-file=.env.local node_modules/vitest/vitest.mjs run server/agent/__tests__/pickTemplate.test.ts
// Plain `npm test` skips it, so it never spends the free quota by accident.
describe.skipIf(!process.env.GEMINI_API_KEY)("pickTemplate with Gemini", () => {
  const ideas = [
    "TikMaker can now turn one sentence into a whole video storyboard",
    "Three Claude Code shortcuts that save me an hour a day",
    "Why vibe-coded apps break when real users sign up",
  ];
  for (const idea of ideas) {
    it(`picks a real template for "${idea}"`, async () => {
      const result = await pickTemplate(input(idea), workspace, templates);
      console.log(idea, "→", result.data, `${result.ms} ms`);
      expect(templates.map((t) => t.id)).toContain(result.data.videoTemplateId);
    }, 60_000);
  }
});
