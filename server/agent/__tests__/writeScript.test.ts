import { MockLanguageModelV4 } from "ai/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ideaFromUser } from "../../../src/agent/run/1-idea.js";
import type { ScriptFromAi } from "../../../src/agent/run/3-script.js";
import { loadKnowledge } from "../knowledge.js";
import { StructuredCallError } from "../llm.js";
import { writeScript } from "../prompts/writeScript.js";

// The real knowledge base: the step must work with the templates we ship.
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../knowledge",
);
const { knowledge } = await loadKnowledge(root);
const workspace = knowledge.workspaces.find(
  (entry) => entry.workspace.id === "dev",
)!.workspace;
const template = knowledge.videoTemplates.find((t) => t.id === "how-to-steps")!;
const input = (motionOnly = false) =>
  ideaFromUser.parse({
    idea: "How to undo the last git commit in a few seconds",
    workspaceId: "dev",
    motionOnly,
  });
const hook = "Stop panicking when you make a bad git commit.";

const scene = (role: string, needsRecording = false) => ({
  role,
  voiceover: "A line that is said.",
  onScreen: "Key words",
  visual: "a terminal",
  needsRecording,
});
const script: ScriptFromAi = {
  scenes: [scene("hook"), scene("item"), scene("demo", true), scene("cta")],
  skipped: [{ role: "benefit", reason: "The steps already show the gain." }],
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

describe("writeScript with a fake model", () => {
  it("returns the script and sends the template's scenes and the hook", async () => {
    const result = await writeScript(
      input(),
      workspace,
      template,
      hook,
      knowledge,
      undefined,
      fakeModel(script),
    );
    expect(result.data).toEqual(script);
    expect(result.prompt.user).toContain(`Hook: ${hook}`);
    expect(result.prompt.user).toMatch(/hook .*\[required\]/);
    expect(result.prompt.user).toMatch(/\[repeatable\]/);
    // What the analysis found, from the knowledge base.
    expect(result.prompt.user).toContain("→ next: sequence");
    expect(result.prompt.user).toMatch(/- sequence: First,/);
    expect(result.prompt.user).toContain("speak at most 3.4 words per second");
    expect(result.prompt.user).toContain("facts: task, tool-name");
  });

  it("offers no link CTA unless the idea gives a link", async () => {
    // how-to-steps allows none, link and comment-keyword.
    const prompt = async (idea: string) =>
      (
        await writeScript(
          ideaFromUser.parse({ idea, workspaceId: "dev" }),
          workspace,
          template,
          hook,
          knowledge,
          undefined,
          fakeModel(script),
        )
      ).prompt.user;
    const without = await prompt(
      "How to undo the last git commit in a few seconds",
    );
    expect(without).toContain("types allowed: none, comment-keyword");
    const withLink = await prompt(
      "How to undo the last git commit, full guide at tikmaker.dev",
    );
    expect(withLink).toContain("types allowed: none, link, comment-keyword");
  });

  it("asks again when the script does not open with the hook", async () => {
    const result = await writeScript(
      input(),
      workspace,
      template,
      hook,
      knowledge,
      undefined,
      fakeModel({ ...script, scenes: [scene("item"), scene("hook")] }, script),
    );
    expect(result.attempts).toBe(2);
  });

  it("does not accept a role the template does not have", async () => {
    const wrong = { ...script, scenes: [scene("hook"), scene("escalation")] };
    await expect(
      writeScript(
        input(),
        workspace,
        template,
        hook,
        knowledge,
        undefined,
        fakeModel(wrong, wrong, wrong),
      ),
    ).rejects.toBeInstanceOf(StructuredCallError);
  });

  it("asks for no recording when the video is motion graphics only", async () => {
    const result = await writeScript(
      input(true),
      workspace,
      template,
      hook,
      knowledge,
      undefined,
      fakeModel(script),
    );
    expect(result.data.scenes.every((s) => !s.needsRecording)).toBe(true);
  });

  it("writing again sends the previous script and what to change", async () => {
    const result = await writeScript(
      input(),
      workspace,
      template,
      hook,
      knowledge,
      {
        previous: script,
        change: ["Scene 2: 18 words on screen, the limit is 15"],
      },
      fakeModel(script),
    );
    expect(result.prompt.user).toContain("Your previous script:");
    expect(result.prompt.user).toContain("- Scene 2: 18 words on screen");
  });
});
