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

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("agent runs", () => {
  it("start saves db/agent-runs/<id>.json as a new run with the defaults filled in", async () => {
    const { id } = await api.agent.start({ idea, workspaceId: "dev" });
    expect(
      fs.existsSync(path.join(root, "db", "agent-runs", `${id}.json`)),
    ).toBe(true);
    expect(await api.agent.get(id)).toMatchObject({
      id,
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
      api.agent.start({ idea: "short", workspaceId: "dev" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("answers NOT_FOUND for a run that does not exist", async () => {
    await expect(api.agent.get("no-such-run")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists runs newest first", async () => {
    const first = await api.agent.start({ idea, workspaceId: "dev" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await api.agent.start({ idea, workspaceId: "dev" });
    const ids = (await api.agent.list()).map((run) => run.id);
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id));
  });
});
