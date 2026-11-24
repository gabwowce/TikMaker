import { MockLanguageModelV4 } from "ai/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ideaFromUser } from "../../../src/agent/run/1-idea.js";
import { loadKnowledge } from "../knowledge.js";
import { checkValue } from "../prompts/checkValue.js";
import { videoIdea } from "../../../src/agent/run/2-angle.js";

// The real knowledge base: the check must judge by the channel we ship.
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../knowledge",
);
const { knowledge } = await loadKnowledge(root);
const workspace = knowledge.workspaces.find(
  (entry) => entry.workspace.id === "dev",
)!.workspace;
const input = (idea: string) =>
  ideaFromUser.parse({ idea, workspaceId: "dev" });

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

describe("checkValue with a fake model", () => {
  it("judges by the channel's direction and what it does not make", async () => {
    const answer = {
      verdict: "off_channel",
      reason: "A security incident – the channel does not make these.",
      idea: "Claude Code leaked passwords in 1,122 GitHub files",
      questions: [
        {
          question: "Take the stronger angle instead?",
          why: "The channel makes inspiring build videos, not incidents.",
          options: ["A real project", "Keep my idea"],
        },
      ],
    };
    const result = await checkValue(
      input("Claude Code leaked passwords in 1,122 GitHub files"),
      workspace,
      fakeModel(answer),
    );
    expect(result.data).toEqual(answer);
    expect(result.prompt.user).toContain(workspace.direction!);
    expect(result.prompt.user).toContain("Security incidents");
    expect(result.prompt.user).toContain("whether to take a stronger");
    // the one time the creator is asked about the idea
    expect(result.prompt.user).toContain("the one time the creator is asked about the idea");
  });

  it("does not ask again once the creator answered", async () => {
    const result = await checkValue(
      input("A singing coach someone built with Claude Code"),
      workspace,
      fakeModel({ verdict: "strong", reason: "Real project.", idea: "A bad singer built his own singing coach with Claude Code" }),
      true,
    );
    expect(result.prompt.user).toContain("do not ask again");
  });
});

describe("videoIdea", () => {
  it("is the checked idea, or the creator's own when there is none", () => {
    const input = { idea: "The creator's words" };
    expect(videoIdea({ input })).toBe("The creator's words");
    // an older run: a check without the idea written again
    expect(videoIdea({ input, value: {} })).toBe("The creator's words");
    expect(videoIdea({ input, value: { idea: "The checked idea" } })).toBe(
      "The checked idea",
    );
  });
});
