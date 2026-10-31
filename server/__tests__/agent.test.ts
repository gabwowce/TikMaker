import { MockLanguageModelV4 } from "ai/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

// Point the server at a throwaway folder BEFORE importing it, so these tests
// never touch the real db/ (the same setup as api.test.ts). The knowledge base
// is the real one: the agent must work with what we ship.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-agent-"));
process.env.TIKMAKER_ROOT = root;
process.env.TIKMAKER_KNOWLEDGE = path.resolve("knowledge");

// No real model in tests: every call gets the same made-up answer, so a run
// moves on in milliseconds and costs nothing. pickTemplate.test.ts has the
// optional test against real Gemini.
const fakeModel = new MockLanguageModelV4({
  doGenerate: async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify({
          videoTemplateId: "how-to-steps",
          score: 4,
          reason: "A clear how-to.",
        }),
      },
    ],
    finishReason: { unified: "stop", raw: undefined },
    usage: {
      inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 20, text: 20, reasoning: 0 },
    },
    warnings: [],
  }),
});
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
  for (let i = 0; i < 100; i++) {
    const run = await api.agent.get(id);
    if (!["created", "picking_template"].includes(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`run ${id} never settled`);
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
    expect(run.status).toBe("writing_hooks");
    expect(run.template).toEqual({
      videoTemplateId: "how-to-steps",
      score: 4,
      reason: "A clear how-to.",
      pickedBy: "agent",
    });
    expect(run.steps).toMatchObject([
      { name: "pickTemplate", inputTokens: 100, outputTokens: 20 },
    ]);
  });

  it("uses the form's template without asking the model", async () => {
    const { id } = await api.agent.start({
      projectId: "p1",
      input: { idea, workspaceId: "dev", videoTemplateId: "pain-to-fix" },
    });
    const run = await settled(id);
    expect(run.status).toBe("writing_hooks");
    expect(run.template).toEqual({
      videoTemplateId: "pain-to-fix",
      pickedBy: "user",
    });
    expect(run.steps).toEqual([]);
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
