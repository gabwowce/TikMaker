import { MockLanguageModelV4 } from "ai/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ideaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import { loadKnowledge } from "../knowledge.js";
import { StructuredCallError } from "../llm.js";
import { layoutChoices, pickLayouts } from "../prompts/pickLayouts.js";

// The real knowledge base: the step must work with the examples we ship.
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../knowledge",
);
const { knowledge } = await loadKnowledge(root);
const examples = knowledge.layoutExamples;
const workspace = knowledge.workspaces.find(
  (entry) => entry.workspace.id === "dev",
)!.workspace;
const input = ideaFromUser.parse({
  idea: "How to turn on auto save in VS Code settings",
  workspaceId: "dev",
});
const scene = (role: string, needsRecording = false): SceneFromAi => ({
  role,
  voiceover: "A line.",
  onScreen: "Two words",
  visual: "VS Code settings",
  needsRecording,
});
const scenes = [scene("hook"), scene("item", true)];
const [hookChoice] = layoutChoices(scenes[0], examples, input);
const MEDIA = ["image", "recording", "screen", "phone", "browser"];
// An item example with a recording or screen in it.
const itemChoice = layoutChoices(scenes[1], examples, input).find((e) =>
  e.elements.some((el) => MEDIA.includes(el.kind)),
)!;
// A right fill for every picture: library ids for logos and props, a sentence
// for real material.
const fillsFor = (example: typeof hookChoice) =>
  example.elements.map((element) =>
    element.kind === "logo"
      ? "vs-code"
      : element.kind === "prop"
        ? "bug"
        : "Record the settings page",
  );
const right = {
  scenes: [
    { layoutExampleId: hookChoice.id, fills: fillsFor(hookChoice) },
    { layoutExampleId: itemChoice.id, fills: fillsFor(itemChoice) },
  ],
};

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

describe("layoutChoices", () => {
  it("offers only examples of the scene's role", () => {
    const choices = layoutChoices(scenes[0], examples, input);
    expect(choices.length).toBeGreaterThan(0);
    expect(choices.every((e) => e.role === "hook")).toBe(true);
  });

  it("leaves out examples TikMaker cannot fill yet", () => {
    const all = examples.flatMap((e) =>
      layoutChoices(scene(e.role), examples, input),
    );
    const kinds = all.flatMap((e) => e.elements.map((el) => el.kind));
    expect(kinds).not.toContain("checklist");
    expect(kinds).not.toContain("talking-head"); // the form said faceless
  });

  it("offers no real material for motion graphics only", () => {
    const motionOnly = { ...input, motionOnly: true };
    const choices = layoutChoices(scene("hook"), examples, motionOnly);
    expect(choices.length).toBeGreaterThan(0);
    const kinds = choices.flatMap((e) => e.elements.map((el) => el.kind));
    expect(kinds.some((kind) => MEDIA.includes(kind))).toBe(false);
  });

  it("borrows a real example of another role when its own has none", () => {
    // Every benefit example has real material in it.
    const motionOnly = { ...input, motionOnly: true };
    const choices = layoutChoices(scene("benefit"), examples, motionOnly);
    expect(choices.length).toBeGreaterThan(0);
    expect(choices.every((e) => e.role !== "benefit")).toBe(true);
  });
});

describe("pickLayouts with a fake model", () => {
  it("returns one checked choice per scene", async () => {
    const result = await pickLayouts(
      input,
      workspace,
      scenes,
      examples,
      fakeModel(right),
    );
    expect(result.data).toEqual(right);
    expect(result.attempts).toBe(1);
    expect(result.prompt.user).toContain(hookChoice.id);
  });

  it("asks again for an example that is not in the scene's list", async () => {
    const wrong = {
      scenes: [
        { ...right.scenes[0], layoutExampleId: "cta-01" },
        right.scenes[1],
      ],
    };
    const result = await pickLayouts(
      input,
      workspace,
      scenes,
      examples,
      fakeModel(wrong, right),
    );
    expect(result.attempts).toBe(2);
  });

  it("asks again when a library file stands in for real material", async () => {
    const wrong = {
      scenes: [
        right.scenes[0],
        { ...right.scenes[1], fills: itemChoice.elements.map(() => "vs-code") },
      ],
    };
    const result = await pickLayouts(
      input,
      workspace,
      scenes,
      examples,
      fakeModel(wrong, right),
    );
    expect(result.attempts).toBe(2);
  });

  it("does not accept a logo that is not in the library (FR-24)", async () => {
    const withLogo = examples.find(
      (e) =>
        e.role === "hook" &&
        layoutChoices(scenes[0], examples, input).includes(e) &&
        e.elements.some((el) => el.kind === "logo"),
    )!;
    const wrong = {
      scenes: [
        {
          layoutExampleId: withLogo.id,
          fills: withLogo.elements.map(() => "vscode"),
        },
        right.scenes[1],
      ],
    };
    await expect(
      pickLayouts(
        input,
        workspace,
        scenes,
        examples,
        fakeModel(wrong, wrong, wrong),
      ),
    ).rejects.toBeInstanceOf(StructuredCallError);
  });
});

// Real Gemini: runs only when the key is given, e.g.
//   node --env-file=.env.local node_modules/vitest/vitest.mjs run server/agent/__tests__/pickLayouts.test.ts
// The script is the one a real run wrote (db/agent-runs is not in git, so the
// scenes are copied here).
describe.skipIf(!process.env.GEMINI_API_KEY)("pickLayouts with Gemini", () => {
  it("lays out a real script", async () => {
    const real: SceneFromAi[] = [
      scene("hook"),
      {
        ...scene("item", true),
        onScreen: "Open settings",
        visual: "VS Code settings page opening with Ctrl+,",
      },
      {
        ...scene("item", true),
        onScreen: "Search auto save",
        visual: "Typing auto save into the settings search",
      },
      {
        ...scene("benefit"),
        onScreen: "No more Ctrl+S",
        visual: "A file saving by itself",
      },
      { ...scene("cta"), onScreen: "Follow for more", visual: "Follow prompt" },
    ];
    const result = await pickLayouts(input, workspace, real, examples);
    console.log(
      JSON.stringify(result.data, null, 1),
      result.ms,
      "ms",
      result.usage,
    );
    expect(result.data.scenes).toHaveLength(real.length);
  }, 60_000);
});
