import { MockLanguageModelV4 } from "ai/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ideaFromUser } from "../../../src/agent/run/1-idea.js";
import { loadKnowledge } from "../knowledge.js";
import { StructuredCallError } from "../ai/llm.js";
import { writeHooks } from "../prompts/writeHooks.js";

// The real knowledge base: the step must work with the formulas we ship.
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../knowledge",
);
const { knowledge } = await loadKnowledge(root);
const formulas = knowledge.hookFormulas;
const workspace = knowledge.workspaces.find(
  (entry) => entry.workspace.id === "dev",
)!.workspace;
const template = knowledge.videoTemplates.find(
  (t) => t.id === "tool-tips-keyword",
)!;
const input = ideaFromUser.parse({
  idea: "Three Claude Code shortcuts that save me an hour a day",
  workspaceId: "dev",
});
// Two formulas this template allows, and one it does not.
const [fits1, fits2] = formulas.filter((f) =>
  template.hookTypes.includes(f.type),
);
const doesNotFit = formulas.find((f) => !template.hookTypes.includes(f.type))!;

// The three hooks of an answer take three different angles: each new hook
// gets the next one in turn.
const ANGLES = ["curiosity", "outcome", "surprise"] as const;
let made = 0;
const hook = (text: string, formulaId: string | null) => ({
  text,
  firstFrame: "The finished video playing full screen",
  angle: ANGLES[made++ % 3],
  formulaId,
  score: 4,
});

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

describe("writeHooks with a fake model", () => {
  it("asks again when the three hooks take the same angle", async () => {
    const same = [
      hook("One", null),
      hook("Two", null),
      hook("Three", null),
    ].map((h) => ({ ...h, angle: "curiosity" }));
    const different = [
      hook("One", null),
      hook("Two", null),
      hook("Three", null),
    ];
    const result = await writeHooks(
      input,
      workspace,
      template,
      formulas,
      fakeModel({ hooks: same }, { hooks: different }),
    );
    expect(result.attempts).toBe(2);
    expect(result.data).toEqual(different);
    // the model is told what this video can really show
    expect(result.prompt.user).toContain("This video can show:");
  });

  it("returns three hooks when two follow a formula", async () => {
    const hooks = [
      hook("3 shortcuts I wish I knew sooner", fits1.id),
      hook("Stop typing this every day", fits2.id),
      hook("Claude Code, but faster", null),
    ];
    const result = await writeHooks(
      input,
      workspace,
      template,
      formulas,
      fakeModel({ hooks }),
    );
    expect(result.data).toEqual(hooks);
    expect(result.attempts).toBe(1);
    // Only formulas this template allows are sent.
    expect(result.prompt.user).toContain(fits1.id);
    expect(result.prompt.user).not.toContain(doesNotFit.id);
  });

  it("accepts hooks of the model's own, the formulas being examples", async () => {
    const result = await writeHooks(
      input,
      workspace,
      template,
      formulas,
      fakeModel({
        hooks: [hook("One", null), hook("Two", null), hook("Three", null)],
      }),
    );
    expect(result.attempts).toBe(1);
  });

  it("does not accept a formula the template does not allow", async () => {
    const wrong = {
      hooks: [
        hook("One", doesNotFit.id),
        hook("Two", fits1.id),
        hook("Three", fits2.id),
      ],
    };
    await expect(
      writeHooks(
        input,
        workspace,
        template,
        formulas,
        fakeModel(wrong, wrong, wrong),
      ),
    ).rejects.toBeInstanceOf(StructuredCallError);
  });
});
