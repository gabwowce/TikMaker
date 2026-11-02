import { MockLanguageModelV4 } from "ai/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { AgentRun } from "../../src/agent/run/run.js";

// Point the server at a throwaway folder BEFORE importing it, so these tests
// never touch the real db/ (the same setup as api.test.ts). The knowledge base
// is the real one: the agent must work with what we ship.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-agent-"));
process.env.TIKMAKER_ROOT = root;
process.env.TIKMAKER_KNOWLEDGE = path.resolve("knowledge");

// No real model in tests: a made-up answer per kind of question, so a run
// moves on in milliseconds and costs nothing. pickTemplate.test.ts and
// writeHooks.test.ts have the optional tests against real Gemini.
const fakeModel = new MockLanguageModelV4({
  doGenerate: async (options) => {
    const prompt = JSON.stringify(options.prompt);
    // Hooks: the first two formulas the prompt offers, and one of its own.
    const [first, second] = [...prompt.matchAll(/- id: ([\w-]+)/g)].map(
      (match) => match[1],
    );
    const answer = prompt.includes("Logos:")
      ? fakeLayout(prompt)
      : prompt.includes("Transition phrases:")
        ? fakeScript(prompt)
        : prompt.includes("Formulas:")
          ? {
              hooks: [
                { text: "Hook one", formulaId: first, score: 4 },
                { text: "Hook two", formulaId: second, score: 4 },
                { text: "Hook three", formulaId: null, score: 3 },
              ],
            }
          : {
              videoTemplateId: "how-to-steps",
              score: 4,
              reason: "A clear how-to.",
            };
    return {
      content: [{ type: "text", text: JSON.stringify(answer) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
        outputTokens: { total: 20, text: 20, reasoning: 0 },
      },
      warnings: [],
    };
  },
});
// Script: the hook, then every other role the template lists (so the
// required ones are there). An idea containing "TOO MANY WORDS" gets a first
// draft the check will catch, and a clean one when written again.
function fakeScript(prompt: string) {
  const roles = [...prompt.matchAll(/ \/ ([\w-]+) \(/g)]
    .map((match) => match[1])
    .filter((role) => role !== "hook");
  const wordy =
    prompt.includes("TOO MANY WORDS") &&
    !prompt.includes("Your previous script");
  const scene = (role: string) => ({
    role,
    voiceover: "A short line.",
    onScreen: wordy ? Array(20).fill("word").join(" ") : "Key words",
    visual: "a terminal",
    needsRecording: false,
  });
  return { scenes: [scene("hook"), ...roles.map(scene)], skipped: [] };
}
// Layout: for every scene the first example offered, each picture filled the
// way the prompt says it takes (a logo id, a prop id or a sentence).
function fakeLayout(prompt: string) {
  const scenes = prompt
    .split(/Scene \d+ \(/)
    .slice(1)
    .map((block) => {
      const [, id, pictures] =
        /- ([\w-]+): pictures: (.*?); (?:with|no) text/.exec(block)!;
      const fills =
        pictures === "none"
          ? []
          : pictures
              .split("; ")
              .map((picture) =>
                picture.includes("a logo id")
                  ? "vs-code"
                  : picture.includes("a prop id")
                    ? "bug"
                    : "Record the step",
              );
      return { layoutExampleId: id, fills };
    });
  return { scenes };
}
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => () => fakeModel,
}));

const { appRouter } = await import("../trpc/router.js");
const { createCallerFactory } = await import("../trpc/init.js");

// A caller runs procedures directly, the way the editor would over HTTP.
const api = createCallerFactory(appRouter)({});
const idea = "How to undo the last git commit in a few seconds";
const startFor = (projectId: string, workspaceId = "dev") =>
  api.agent.start({ projectId, input: { idea, workspaceId } });

// The agent works in the background after start; this waits, the way the
// panel does, until the run stops moving.
async function settled(id: string) {
  for (let i = 0; i < 250; i++) {
    const run = await api.agent.get(id);
    if (
      ![
        "created",
        "picking_template",
        "writing_hooks",
        "writing_script",
      ].includes(run.status)
    )
      return run;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`run ${id} never settled`);
}

// After an answer the agent goes on in the background too; this waits until
// the run shows what the test expects.
async function until(id: string, check: (run: AgentRun) => boolean) {
  for (let i = 0; i < 250; i++) {
    const run = await api.agent.get(id);
    if (check(run)) return run;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`run ${id} never got there`);
}
// A run that has a script and waits for the user's answer on screen 3. The
// hook comes from the form, so nothing else needs answering first.
async function waitingForApproval() {
  const { id } = await api.agent.start({
    projectId: "p1",
    input: { idea, workspaceId: "dev", hook: "My own opening line" },
  });
  return until(id, (run) => run.status === "awaiting_approval");
}
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("agent runs", () => {
  it("start saves db/agent-runs/<id>.json with the defaults filled in", async () => {
    const { id } = await startFor("p1");
    expect(
      fs.existsSync(path.join(root, "db", "agent-runs", `${id}.json`)),
    ).toBe(true);
    expect(await settled(id)).toMatchObject({
      id,
      projectId: "p1",
      input: {
        idea,
        workspaceId: "dev",
        targetSeconds: 40,
        motionOnly: false,
        withFace: false,
        generateVoice: false,
      },
    });
  });

  it("picks a template in the background and logs the call", async () => {
    const { id } = await startFor("p1");
    const run = await settled(id);
    expect(run.status).toBe("awaiting_hook");
    expect(run.template).toEqual({
      videoTemplateId: "how-to-steps",
      score: 4,
      reason: "A clear how-to.",
      pickedBy: "agent",
    });
    expect(run.steps).toMatchObject([
      {
        name: "pickTemplate",
        inputTokens: 100,
        outputTokens: 20,
        attempts: 1,
        model: expect.any(String),
        // The step's input: exactly what the model was sent.
        prompt: { user: expect.stringContaining(idea) },
      },
      { name: "writeHooks" },
    ]);
    // Three hooks for the template, and the agent waits for the user.
    expect(run.hooks).toHaveLength(3);
    expect(run.hooksFor).toBe("how-to-steps");
  });

  it("uses the form's template without asking the model", async () => {
    const { id } = await api.agent.start({
      projectId: "p1",
      input: { idea, workspaceId: "dev", videoTemplateId: "pain-to-fix" },
    });
    const run = await settled(id);
    expect(run.status).toBe("awaiting_hook");
    expect(run.template).toEqual({
      videoTemplateId: "pain-to-fix",
      pickedBy: "user",
    });
    // No call for the template: the only one is for the hooks.
    expect(run.steps.map((step) => step.name)).toEqual(["writeHooks"]);
  });

  it("uses the form's hook without asking the model for hooks", async () => {
    const { id } = await api.agent.start({
      projectId: "p1",
      input: { idea, workspaceId: "dev", hook: "Undo it in 3 seconds" },
    });
    const run = await settled(id);
    expect(run.hook).toEqual({
      text: "Undo it in 3 seconds",
      pickedBy: "user",
    });
    expect(run.hooks).toBeUndefined();
    // Nothing to wait for: straight on to the script.
    expect(run.status).toBe("awaiting_approval");
    expect(run.steps.map((step) => step.name)).toEqual([
      "pickTemplate",
      "writeScript",
    ]);
  });

  it("stops in error when the channel does not exist", async () => {
    const { id } = await startFor("p1", "no-such-channel");
    const run = await settled(id);
    expect(run.status).toBe("error");
    expect(run.error).toMatch(/no-such-channel/);
  });
  it("lists the templates to choose from", async () => {
    const templates = await api.agent.templates();
    expect(templates).toContainEqual(
      expect.objectContaining({ id: "pain-to-fix", name: expect.any(String) }),
    );
  });

  it("changes the template to the user's choice", async () => {
    const { id } = await startFor("p1");
    await settled(id);
    await api.agent.changeTemplate({
      runId: id,
      videoTemplateId: "pain-to-fix",
    });
    expect((await api.agent.get(id)).template).toEqual({
      videoTemplateId: "pain-to-fix",
      pickedBy: "user",
    });
  });

  it("refuses a template that does not exist", async () => {
    const { id } = await startFor("p1");
    await settled(id);
    await expect(
      api.agent.changeTemplate({ runId: id, videoTemplateId: "no-such" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses a change once the run has stopped", async () => {
    const { id } = await startFor("p1", "no-such-channel");
    await settled(id); // stops in "error"
    await expect(
      api.agent.changeTemplate({ runId: id, videoTemplateId: "pain-to-fix" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("writes new hooks after the template changes", async () => {
    const { id } = await startFor("p1");
    await settled(id);
    await api.agent.changeTemplate({
      runId: id,
      videoTemplateId: "pain-to-fix",
    });
    // The hooks are saved a moment before the status says "waiting again".
    const run = await until(
      id,
      (run) => run.hooksFor === "pain-to-fix" && run.status === "awaiting_hook",
    );
    expect(run.steps.map((step) => step.name)).toEqual([
      "pickTemplate",
      "writeHooks",
      "writeHooks",
    ]);
  });

  it("goes on to the script with the hook the user picked", async () => {
    const { id } = await startFor("p1");
    const waiting = await settled(id);
    await api.agent.chooseHook({ runId: id, hookIndex: 1 });
    const run = await until(id, (run) => run.status === "awaiting_approval");
    expect(run.hook).toEqual({
      text: waiting.hooks![1].text,
      formulaId: waiting.hooks![1].formulaId,
      pickedBy: "agent",
    });
  });

  it("takes the user's own hook text instead (FR-07)", async () => {
    const { id } = await startFor("p1");
    await settled(id);
    await api.agent.chooseHook({ runId: id, text: "My own opening line" });
    const run = await until(id, (run) => run.status === "awaiting_approval");
    expect(run.hook).toEqual({ text: "My own opening line", pickedBy: "user" });
  });

  it("refuses a hook once one is picked", async () => {
    const { id } = await startFor("p1");
    await settled(id);
    await api.agent.chooseHook({ runId: id, hookIndex: 0 });
    await until(id, (run) => run.status === "awaiting_approval");
    await expect(
      api.agent.chooseHook({ runId: id, hookIndex: 2 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("writes the script after the hook and waits for approval", async () => {
    const { id } = await startFor("p1");
    await settled(id);
    await api.agent.chooseHook({ runId: id, hookIndex: 0 });
    const run = await until(id, (run) => run.status === "awaiting_approval");
    expect(run.script?.scenes[0].role).toBe("hook");
    expect(run.script?.problems).toEqual([]);
    expect(run.steps[run.steps.length - 1].name).toBe("writeScript");
  });

  it("has the model fix the script once when the check finds problems", async () => {
    const { id } = await api.agent.start({
      projectId: "p1",
      input: {
        idea: "TOO MANY WORDS on screen in the first draft",
        workspaceId: "dev",
        hook: "Too many words",
      },
    });
    const run = await until(id, (run) => run.status === "awaiting_approval");
    // First draft caught by the check (FR-09), the second one clean.
    expect(run.steps.map((step) => step.name)).toEqual([
      "pickTemplate",
      "writeScript",
      "writeScript",
    ]);
    expect(run.script?.problems).toEqual([]);
  });
  it("lays the video out once the script is approved", async () => {
    const { id } = await waitingForApproval();
    await api.agent.approveScript({ runId: id });
    const run = await until(id, (run) => run.status === "done");
    expect(run.script?.approved).toBe(true);
    // One checked layout choice per scene of the script.
    expect(run.layout?.scenes).toHaveLength(run.script!.scenes.length);
    expect(run.steps[run.steps.length - 1].name).toBe("pickLayouts");
  });

  it("writes the script again with the user's comment (FR-10)", async () => {
    const waiting = await waitingForApproval();
    await api.agent.reviseScript({
      runId: waiting.id,
      comment: "Make it shorter",
    });
    // Waiting again, with one more call in the log: the script was rewritten.
    const run = await until(
      waiting.id,
      (run) =>
        run.status === "awaiting_approval" &&
        run.steps.length > waiting.steps.length,
    );
    expect(run.steps[run.steps.length - 1].name).toBe("writeScript");
    expect(run.script?.comment).toBeUndefined();
  });

  it("refuses an approval before there is a script", async () => {
    const { id } = await startFor("p1");
    await settled(id); // waits for a hook, no script yet
    await expect(api.agent.approveScript({ runId: id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
  it("gives the editor the layout examples and the channel's style", async () => {
    const { examples, style } = await api.agent.layoutKnowledge("dev");
    expect(examples.length).toBeGreaterThan(0);
    expect(style.backgrounds.length).toBeGreaterThan(0);
    await expect(api.agent.layoutKnowledge("nope")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("refuses an idea that is too short", async () => {
    await expect(
      api.agent.start({
        projectId: "p1",
        input: { idea: "short", workspaceId: "dev" },
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("answers NOT_FOUND for a run that does not exist", async () => {
    await expect(api.agent.get("no-such-run")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists only the project's runs, newest first", async () => {
    const first = await startFor("p2");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await startFor("p2");
    const other = await startFor("p3");
    await Promise.all([first, second, other].map(({ id }) => settled(id)));
    const ids = (await api.agent.list("p2")).map((run) => run.id);
    expect(ids).not.toContain(other.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });
});
