import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { ideaFromUser } from "../../../src/agent/run/1-idea.js";
import type { SceneFromAi } from "../../../src/agent/run/3-script.js";
import { checkStory, storyProblems } from "../prompts/checkStory.js";

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

const scene = (role: SceneFromAi["role"], voiceover: string): SceneFromAi => ({
  role,
  voiceover,
  onScreen: voiceover.split(" ").slice(0, 3).join(" "),
  visual: "a card",
  needsRecording: false,
});

// The run that showed the gap (run-mwd8sqqv): a hook about ONE job, then a
// list of three, "People person?" out of nowhere, new numbers as the ending.
const scenes = [
  scene("hook", "This AI job grew 729% in one year. Ever heard of it?"),
  scene("item", "First, forward-deployed engineer. You sit with a customer and make AI work in their real business."),
  scene("item", "People person? This week, automate one real task for a friend."),
  scene("payoff", "AI job titles on Indeed went from 264 in 2022 to 822 by early 2026. Pick yours."),
];
const input = ideaFromUser.parse({
  idea: "3 AI jobs that barely existed 3 years ago – and what each one actually does.",
  workspaceId: "dev",
});
const hook = { text: scenes[0].voiceover };

describe("checkStory with a fake model", () => {
  it("sends every scene, numbered, and returns the reading", async () => {
    const answer = {
      summary: "Some AI jobs and a few tips – it is not clear which.",
      promise: "One AI job that grew 729%",
      kept: false,
      breaks: [
        { scene: 3, problem: "'People person?' was never set up – say that this job suits people who like working with customers." },
        { scene: 4, problem: "New numbers at the end answer nothing the hook asked." },
      ],
    };
    const result = await checkStory(input, hook, scenes, fakeModel(answer));
    expect(result.data).toEqual(answer);
    expect(result.prompt.user).toContain("1. [hook] Voice: This AI job grew 729%");
    expect(result.prompt.user).toContain("3. [item] Voice: People person?");
    expect(result.prompt.user).toContain(input.idea);
    expect(result.prompt.system).toContain("You do not\nrewrite it");
  });
});

describe("storyProblems", () => {
  it("is empty without a reading or when the story holds", () => {
    expect(storyProblems(undefined)).toEqual([]);
    expect(storyProblems({ summary: "x", promise: "y", kept: true, breaks: [] })).toEqual([]);
  });

  it("turns a broken promise and each break into a scene problem", () => {
    const problems = storyProblems({
      summary: "Some AI jobs",
      promise: "One AI job that grew 729%",
      kept: false,
      breaks: [{ scene: 3, problem: "'People person?' was never set up." }],
    });
    expect(problems).toEqual([
      { sceneIndex: 0, message: expect.stringContaining("Scene 1 promises: One AI job that grew 729%") },
      { sceneIndex: 2, message: "Scene 3: 'People person?' was never set up." },
    ]);
  });
});
