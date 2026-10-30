import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Point the server at a throwaway folder BEFORE importing it, so these tests
// never touch the real db/ (the same setup as api.test.ts).
const root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-agent-"));
process.env.TIKMAKER_ROOT = root;
const { appRouter } = await import("../trpc/router.js");
const { createCallerFactory } = await import("../trpc/init.js");

// A caller runs procedures directly, the way the editor would over HTTP.
const api = createCallerFactory(appRouter)({});
const idea = "How to undo the last git commit in a few seconds";
const startFor = (projectId: string) =>
  api.agent.start({ projectId, input: { idea, workspaceId: "dev" } });

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("agent runs", () => {
  it("start saves db/agent-runs/<id>.json as a new run with the defaults filled in", async () => {
    const { id } = await startFor("p1");
    expect(
      fs.existsSync(path.join(root, "db", "agent-runs", `${id}.json`)),
    ).toBe(true);
    expect(await api.agent.get(id)).toMatchObject({
      id,
      projectId: "p1",
      status: "created",
      steps: [],
      input: {
        idea,
        workspaceId: "dev",
        targetSeconds: 40,
        motionOnly: false,
        generateVoice: false,
      },
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
    const first = await startFor("p1");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await startFor("p1");
    const other = await startFor("p2");
    const ids = (await api.agent.list("p1")).map((run) => run.id);
    expect(ids).not.toContain(other.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });
});
