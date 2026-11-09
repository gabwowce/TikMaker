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
// The self-review at the end of the build is tried in its own test below;
// everywhere else the build ends where it did before it existed.
process.env.AGENT_SELF_REVIEW = "off";
// No TypeScript compile of the written scenes in tests (the fake writes none
// that could fail).
process.env.TIKMAKER_TSC = "off";
// The fake model below stands in for every call, whatever the machine's
// .env says (an AGENT_PROVIDER of claude-code would go to the real one).
delete process.env.AGENT_PROVIDER;

let limitOn = true;
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
    const answer = prompt.includes("Example frames:")
      ? FAKE_REVIEW
      : prompt.includes("Direction:")
      ? fakeValue(prompt)
      : prompt.includes("Allowed now:")
      ? fakeRoute(prompt)
      : prompt.includes("Rewrite scene")
        ? { voiceover: "A simpler short line.", onScreen: "Simpler" }
        : prompt.includes("Transition phrases:")
                ? fakeScript(prompt)
                : prompt.includes("Formulas:")
                  ? {
                      hooks: [
                        {
                          text: "Hook one",
                          firstFrame: "A screen recording mid-action",
                          angle: "curiosity",
                          formulaId: first,
                          score: 4,
                        },
                        {
                          text: "Hook two",
                          firstFrame: "A screen recording mid-action",
                          angle: "outcome",
                          formulaId: second,
                          score: 4,
                        },
                        {
                          text: "Hook three",
                          firstFrame: "A screen recording mid-action",
                          angle: "surprise",
                          formulaId: null,
                          score: 3,
                        },
                      ],
                    }
                  : {
                      videoTemplateId: "how-to-steps",
                      score: 4,
                      reason: "A clear how-to.",
                      // an idea that says so needs no search
                      needsFacts: !prompt.includes("NO OUTSIDE FACTS"),
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
  // An idea saying "ASK ME" makes the script ask the creator first – until
  // the prompt says it asked already.
  const asks =
    prompt.includes("ASK ME") && !prompt.includes("do not ask again");
  return {
    scenes: [scene("hook"), ...roles.map(scene)],
    skipped: [],
    ...(asks
      ? {
          questions: [
            {
              question: "How long does generating a video take?",
              why: "The script says how fast it is",
              options: ["~2 min", "~5 min"],
            },
          ],
        }
      : {}),
  };
}
// The value check: every idea is worth a video, except one saying "WEAK
// IDEA" – that one asks the creator first, until the prompt says it asked.
function fakeValue(prompt: string) {
  const weak = prompt.includes("WEAK IDEA");
  const asks = weak && !prompt.includes("do not ask again");
  return {
    verdict: weak ? "weak" : "strong",
    wow: weak ? "" : "A real result on screen",
    takeaway: weak ? "" : "Something one prompt would not give",
    reason: weak ? "Nothing real to show yet." : "A real result.",
    ...(weak ? { betterAngle: "Show a real project" } : {}),
    ...(asks
      ? {
          questions: [
            {
              question: "Do you have a real project to show for this?",
              why: "It is what the viewer cannot get from one prompt",
            },
          ],
        }
      : {}),
  };
}
// The message router: what the message asks for, by its words.
function fakeRoute(prompt: string) {
  const says = (words: string) => prompt.includes(`Message: ${words}`);
  if (says("Make it shorter"))
    return {
      reply: "I'll make the script shorter.",
      targets: [{ kind: "script", instruction: "Make it shorter" }],
      confirm: false,
    };
  if (says("Show it as one thing turning into another"))
    // no sceneIndex: the code takes the one scene that was attached
    return {
      reply: "I'll change that scene's pictures.",
      targets: [
        { kind: "pictures", instruction: "one thing turning into another" },
      ],
      confirm: false,
    };
  if (says("Say scene 1 simpler"))
    return {
      reply: "I'll rewrite scene 1's words.",
      targets: [{ kind: "words", sceneIndex: 0, instruction: "simpler" }],
      confirm: false,
    };
  if (says("Slower motion everywhere"))
    return {
      reply: "I can slow down the motion of the whole video.",
      targets: [{ kind: "motion", instruction: "slower" }],
      confirm: false, // the code still asks: the whole video
    };
  if (says("Review the frames"))
    return {
      reply: "I'll look at the frames.",
      targets: [{ kind: "review" }],
      confirm: false,
    };
  if (says("Different hooks please"))
    return {
      reply: "I'll write three new hooks.",
      targets: [{ kind: "hook", instruction: "different" }],
      confirm: false,
    };
  return { reply: "Which scene do you mean?", targets: [], confirm: false };
}
// The review of the frames: scene 1 is fine, scene 2's pictures need a fix.
const FAKE_REVIEW = {
  scenes: [
    { sceneIndex: 0, sees: "A terminal", verdict: "good", problems: [] },
    {
      sceneIndex: 1,
      sees: "Two diagrams",
      verdict: "fix",
      problems: ["two diagrams of the same weight"],
      change: { kind: "pictures", instruction: "one thing turning into another" },
    },
  ],
};
// The pictures as code: no Claude Code in tests. The fake writes a tiny
// component for every scene it is asked to, and says what it made; an idea
// saying "HIT THE LIMIT" stops on the usage limit while it is on.
vi.mock("../agent/prompts/writeCode.js", async (original) => ({
  ...(await original<typeof import("../agent/prompts/writeCode.js")>()),
  writeCode: async (job: import("../agent/prompts/writeCode.js").CodeJob, cwd: string) => {
    if (limitOn && job.input.idea.includes("HIT THE LIMIT"))
      throw new Error("You've hit your 5-hour limit · resets 5pm");
    for (const n of job.write) {
      const file = path.join(cwd, "src", "generated", job.scenes[n].file);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        `// ${job.instruction ?? "first"}\nexport default function Scene() { return null; }\n`,
      );
    }
    return {
      model: "fake",
      prompt: { system: "", user: job.instruction ?? "" },
      attempts: 1,
      ms: 1,
      usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1, thinkingTokens: 0 },
      data: {
        scenes: job.write.map((n) => ({
          sceneIndex: n,
          description: job.instruction ? `Rewritten: ${job.instruction}` : "A badge with the step number",
        })),
        keywords: ["short"],
        wishes: [],
      },
    };
  },
}));
// The search tool is only handed to the model; the fake model ignores it.
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () =>
    Object.assign(() => fakeModel, {
      tools: {
        googleSearch: () => ({
          type: "provider",
          id: "google.google_search",
          args: {},
        }),
      },
    }),
}));

// No Remotion in tests: the review gets two tiny "frames" written to disk.
vi.mock("../agent/stills.js", () => ({
  renderStills: async (_project: unknown, folder: string) => {
    fs.mkdirSync(folder, { recursive: true });
    return [0, 1].map((sceneIndex) => {
      const file = path.join(folder, `scene-${sceneIndex + 1}.png`);
      fs.writeFileSync(file, "png");
      return { sceneIndex, seconds: 1, file };
    });
  },
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
      needsFacts: true,
      pickedBy: "agent",
    });
    expect(run.steps).toMatchObject([
      { name: "checkValue" },
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
    expect(run.steps.map((step) => step.name)).toEqual([
      "checkValue",
      "writeHooks",
    ]);
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
      "checkValue",
      "pickTemplate",
      "research",
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
      "checkValue",
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
      firstFrame: waiting.hooks![1].firstFrame,
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
      "checkValue",
      "pickTemplate",
      "research",
      "writeScript",
      "writeScript",
    ]);
    expect(run.script?.problems).toEqual([]);
  });
  it("writes every scene's picture as code once the script is approved", async () => {
    const { id } = await waitingForApproval();
    await api.agent.approveScript({ runId: id });
    const run = await until(id, (run) => run.status === "done");
    expect(run.script?.approved).toBe(true);
    // one code scene per scene of the script, in the project's folder
    expect(run.code?.scenes).toHaveLength(run.script!.scenes.length);
    expect(run.code?.problems).toEqual([]);
    expect(run.code?.scenes[0]).toMatchObject({
      file: "p1/scene-1.tsx",
      description: "A badge with the step number",
      version: 1,
    });
    expect(run.code?.keywords).toEqual(["short"]);
    for (const scene of run.code!.scenes)
      expect(fs.existsSync(path.join(root, "src", "generated", scene.file))).toBe(true);
    // the props file the agent renders its frames from
    expect(fs.existsSync(path.join(root, "out", "agent", "p1", "props.json"))).toBe(true);
    expect(run.steps[run.steps.length - 1].name).toBe("writeCode");
  });

  // A built video, for the conversation tests.
  async function builtVideo() {
    const { id } = await waitingForApproval();
    await api.agent.approveScript({ runId: id });
    return until(id, (run) => run.status === "done");
  }
  const lastMessage = (run: AgentRun) =>
    run.messages![run.messages!.length - 1];

  it("changes the pictures of the scene a message is attached to", async () => {
    const built = await builtVideo();
    await api.agent.message({
      runId: built.id,
      text: "Show it as one thing turning into another",
      attachments: [{ sceneIndex: 1, label: "Scene 2" }],
    });
    const run = await until(
      built.id,
      (run) => run.status === "done" && run.messages?.length === 2,
    );
    // that scene's code is written again; the others are as they were
    expect(run.code?.scenes[1]).toMatchObject({
      description: "Rewritten: one thing turning into another",
      version: 2,
    });
    expect(run.code?.scenes[0]).toEqual(built.code?.scenes[0]);
    // the code before is kept as version 1
    expect(
      fs.existsSync(path.join(root, "db", "code-versions", "p1", "scene-2.v1.tsx")),
    ).toBe(true);
    expect(run.steps.map((step) => step.name)).toContain("routeMessage");
    const [mine, reply] = run.messages!;
    expect(mine).toMatchObject({ from: "user", status: "done" });
    // the router left the scene out; the code took the attached one
    expect(mine.targets).toEqual([
      {
        kind: "pictures",
        sceneIndex: 1,
        instruction: "one thing turning into another",
      },
    ]);
    expect(reply).toMatchObject({ from: "agent" });
    expect(reply.text).toContain("✓");
  });

  it("undoes the agent's change to a scene's code", async () => {
    const built = await builtVideo();
    const file = path.join(root, "src", "generated", built.code!.scenes[1].file);
    const first = fs.readFileSync(file, "utf-8");
    await api.agent.message({
      runId: built.id,
      text: "Show it as one thing turning into another",
      attachments: [{ sceneIndex: 1, label: "Scene 2" }],
    });
    const changed = await until(
      built.id,
      (run) => run.status === "done" && run.messages?.length === 2,
    );
    expect(changed.code?.scenes[1].history).toEqual([
      {
        version: 1,
        description: "A badge with the step number",
        changedBy: "one thing turning into another",
      },
    ]);
    expect(changed.messages![1].text).toContain("Undo");
    const rewritten = fs.readFileSync(file, "utf-8");
    expect(rewritten).not.toBe(first);
    const run = await api.agent.undoScene({ runId: built.id, sceneIndex: 1 });
    expect(run.code?.scenes[1]).toMatchObject({
      version: 1,
      description: "A badge with the step number",
      history: [],
    });
    expect(fs.readFileSync(file, "utf-8")).toBe(first);
    // the rewritten code is kept too
    expect(
      fs.readFileSync(path.join(root, "db", "code-versions", "p1", "scene-2.v2.tsx"), "utf-8"),
    ).toBe(rewritten);
    // nothing earlier than version 1
    await expect(
      api.agent.undoScene({ runId: built.id, sceneIndex: 1 }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("asks back when the message is not clear", async () => {
    const built = await builtVideo();
    await api.agent.message({ runId: built.id, text: "Make it more fun" });
    const run = await until(built.id, (run) => run.messages?.length === 2);
    expect(lastMessage(run).text).toBe("Which scene do you mean?");
    expect(run.messages![0].status).toBe("done");
  });

  it("rewrites one scene's words and its pictures on them", async () => {
    const built = await builtVideo();
    await api.agent.message({ runId: built.id, text: "Say scene 1 simpler" });
    const run = await until(
      built.id,
      (run) => run.status === "done" && run.messages?.length === 2,
    );
    expect(run.script?.scenes[0].voiceover).toBe("A simpler short line.");
    expect(run.script?.scenes[1]).toEqual(built.script?.scenes[1]);
    const names = run.steps.map((step) => step.name);
    expect(names).toContain("rewriteScene");
    expect(names.filter((name) => name === "writeCode")).toHaveLength(
      built.steps.filter((step) => step.name === "writeCode").length + 1,
    );
    expect(run.code?.scenes[0].version).toBe(2);
  });

  it("proposes a change to the whole video and waits for the button", async () => {
    const built = await builtVideo();
    await api.agent.message({
      runId: built.id,
      text: "Slower motion everywhere",
    });
    const proposed = await until(
      built.id,
      (run) => lastMessage(run)?.proposal !== undefined,
    );
    // nothing changed yet – only the proposal
    expect(proposed.code).toEqual(built.code);
    const proposal = lastMessage(proposed);
    await api.agent.decide({
      runId: built.id,
      messageId: proposal.id,
      accept: true,
    });
    const run = await until(
      built.id,
      (run) =>
        run.status === "done" &&
        run.messages?.find((m) => m.id === proposal.id)?.status === "done",
    );
    // every scene written again, in one Claude Code run
    expect(run.steps.filter((step) => step.name === "writeCode")).toHaveLength(
      built.steps.filter((step) => step.name === "writeCode").length + 1,
    );
    expect(run.code?.scenes.every((scene) => scene.version === 2)).toBe(true);
    expect(lastMessage(run).text).toContain("✓");
  });

  it("reviews its own frames at the end of the build and fixes what it found", async () => {
    process.env.AGENT_SELF_REVIEW = "on";
    try {
      const { id } = await waitingForApproval();
      await api.agent.approveScript({ runId: id });
      const run = await until(id, (run) => run.status === "done");
      const names = run.steps.map((step) => step.name);
      // round 1 found scene 2 and fixed it (its pictures picked again);
      // round 2 found it again – no better – so the agent stopped there
      expect(names.filter((name) => name === "reviewFrames")).toHaveLength(2);
      expect(names.slice(names.indexOf("reviewFrames"))).toContain(
        "writeCode",
      );
      const said = run.messages!.map((message) => message.text);
      expect(said[0]).toMatch(/^Self-review, round 1: .*Fixing scene\(s\) 2/s);
      expect(said[said.length - 1]).toMatch(/round 2: .*did not make it better/s);
      // nothing waits for a button: the creator's decisions stay three
      expect(run.messages!.some((message) => message.proposal)).toBe(false);
      // every round carries its list for the panel
      expect(run.messages![0].review).toMatchObject({ round: 1, next: "fixing" });
      expect(run.messages![run.messages!.length - 1].review?.next).toBe("stopped");
    } finally {
      process.env.AGENT_SELF_REVIEW = "off";
    }
  });

  it("reviews the frames and proposes a fix for the scene that needs one", async () => {
    const built = await builtVideo();
    // the review looks at the project as the editor saved it
    const { createEmptyProject } = await import("../../src/schema/project.js");
    fs.mkdirSync(path.join(root, "db", "projects"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "db", "projects", `${built.projectId}.json`),
      JSON.stringify(createEmptyProject(built.projectId, "Built")),
    );
    await api.agent.message({
      runId: built.id,
      text: "Review the frames of the video and tell me what to fix",
    });
    const run = await until(
      built.id,
      (run) => lastMessage(run)?.proposal !== undefined,
    );
    expect(run.steps.map((step) => step.name)).toContain("reviewFrames");
    // nothing changed by the review itself
    expect(run.code).toEqual(built.code);
    const proposal = lastMessage(run);
    expect(proposal.text).toContain("Scene 2: two diagrams of the same weight");
    expect(proposal.proposal?.targets).toEqual([
      {
        kind: "pictures",
        sceneIndex: 1,
        instruction: "one thing turning into another",
      },
    ]);
    expect(run.status).toBe("done");
  });

  it("asks when it does not know, waits, and writes the script with the answer", async () => {
    const { id } = await api.agent.start({
      projectId: "p1",
      input: {
        idea: "ASK ME how fast TikMaker is",
        workspaceId: "dev",
        hook: "My own opening line",
      },
    });
    const waiting = await until(id, (run) => run.status === "awaiting_answers");
    expect(waiting.pausedFrom).toBe("writing_script");
    // the script it wrote while asking is not kept
    expect(waiting.script).toBeUndefined();
    const asked = waiting.messages!.find((m) => m.questions)!;
    expect(asked.askedBy).toBe("writeScript");
    expect(asked.questions![0].options).toEqual(["~2 min", "~5 min"]);
    await api.agent.answer({
      runId: id,
      messageId: asked.id,
      answers: [{ id: asked.questions![0].id, answer: "~2 min" }],
    });
    const run = await until(id, (run) => run.status === "awaiting_approval");
    expect(run.script?.scenes.length).toBeGreaterThan(0);
    expect(run.messages!.find((m) => m.id === asked.id)!.questions![0]).toMatchObject({
      answer: "~2 min",
    });
    // the second script got the answer as a fact
    const last = [...run.steps].reverse().find((s) => s.name === "writeScript")!;
    expect(JSON.stringify(last.prompt)).toContain(
      "How long does generating a video take? – ~2 min",
    );
  });

  it("checks the idea's value first and asks the creator about a weak one", async () => {
    const { id } = await api.agent.start({
      projectId: "p1",
      input: { idea: "WEAK IDEA: 5 tips for prompts", workspaceId: "dev" },
    });
    const waiting = await until(id, (run) => run.status === "awaiting_answers");
    // nothing is picked or written before the creator answers
    expect(waiting.pausedFrom).toBe("picking_template");
    expect(waiting.value).toBeUndefined();
    expect(waiting.template).toBeUndefined();
    const asked = waiting.messages!.find((m) => m.questions)!;
    expect(asked.askedBy).toBe("checkValue");
    await api.agent.answer({
      runId: id,
      messageId: asked.id,
      answers: [{ id: asked.questions![0].id, answer: "Keep my idea" }],
    });
    const run = await until(id, (run) => run.status === "awaiting_hook");
    // the creator decides: the run goes on, and the gap is said
    expect(run.value?.verdict).toBe("weak");
    expect(
      run.messages!.some((m) => m.text.startsWith("Value check – a weak idea")),
    ).toBe(true);
    // the second check got the answer as a fact
    const last = [...run.steps].reverse().find((s) => s.name === "checkValue")!;
    expect(JSON.stringify(last.prompt)).toContain(
      "Do you have a real project to show for this? – Keep my idea",
    );
  });

  it("gives the hooks and the script what makes the video worth watching", async () => {
    const { id } = await startFor("p1");
    const run = await until(id, (run) => run.status === "awaiting_hook");
    expect(run.value?.verdict).toBe("strong");
    const hooks = run.steps.find((s) => s.name === "writeHooks")!;
    expect(JSON.stringify(hooks.prompt)).toContain("A real result on screen");
  });

  it("pauses at the usage limit and goes on from there on Continue", async () => {
    const { id } = await api.agent.start({
      projectId: "p1",
      input: {
        idea: "HIT THE LIMIT while building",
        workspaceId: "dev",
        hook: "My own opening line",
      },
    });
    await until(id, (run) => run.status === "awaiting_approval");
    await api.agent.approveScript({ runId: id });
    const paused = await until(id, (run) => run.status === "paused");
    expect(paused.pausedFrom).toBe("laying_out");
    expect(paused.error).toMatch(/5-hour limit/);
    // what was made before the limit is kept: the script is not written again
    const scripts = paused.steps.filter((s) => s.name === "writeScript").length;
    limitOn = false; // the limit has reset
    await api.agent.resume({ runId: id });
    const run = await until(id, (run) => run.status === "done");
    expect(run.error).toBeUndefined();
    expect(run.pausedFrom).toBeUndefined();
    expect(run.steps.filter((s) => s.name === "writeScript")).toHaveLength(
      scripts,
    );
    expect(run.code?.scenes.length).toBeGreaterThan(0);
  });

  it("puts a change cut off by a restart back in line, and Continue does it", async () => {
    const { pauseInterruptedRuns } = await import("../agent/agent.js");
    const { getRun, saveRun } = await import("../agent/runs.js");
    const built = await builtVideo();
    // the server stopped while the agent was on an accepted proposal: the run
    // still says done, the message says working, and no worker is left
    const latest = (await getRun(built.id))!;
    await saveRun({
      ...latest,
      messages: [
        ...(latest.messages ?? []),
        {
          id: "msg-cut-off",
          at: Date.now(),
          from: "agent",
          text: "Say scene 1 simpler?",
          proposal: {
            targets: [{ kind: "words", sceneIndex: 0, instruction: "Simpler" }],
            decision: "yes",
          },
          status: "working",
        },
      ],
    });
    await pauseInterruptedRuns();
    const paused = await api.agent.get(built.id);
    expect(paused.status).toBe("paused");
    expect(paused.pausedFrom).toBe("answering");
    expect(lastMessage(paused).status).toBe("waiting");
    await api.agent.resume({ runId: built.id });
    const run = await until(
      built.id,
      (run) =>
        run.status === "done" &&
        run.messages!.find((m) => m.id === "msg-cut-off")?.status === "done",
    );
    expect(run.error).toBeUndefined();
  });

  it("leaves the video as it is when the proposal is declined", async () => {
    const built = await builtVideo();
    await api.agent.message({
      runId: built.id,
      text: "Slower motion everywhere",
    });
    const proposed = await until(
      built.id,
      (run) => lastMessage(run)?.proposal !== undefined,
    );
    await api.agent.decide({
      runId: built.id,
      messageId: lastMessage(proposed).id,
      accept: false,
    });
    const run = await until(built.id, (run) =>
      lastMessage(run).text.startsWith("OK"),
    );
    expect(run.code).toEqual(built.code);
  });

  it("writes new hooks while a hook is being picked", async () => {
    const { id } = await startFor("p-hooks");
    const waiting = await until(id, (run) => run.status === "awaiting_hook");
    await api.agent.message({ runId: id, text: "Different hooks please" });
    const run = await until(
      id,
      (run) => run.status === "awaiting_hook" && run.messages?.length === 2,
    );
    expect(run.steps.filter((step) => step.name === "writeHooks")).toHaveLength(
      waiting.steps.filter((step) => step.name === "writeHooks").length + 1,
    );
  });

  it("takes up a message sent while the agent works, once it stops", async () => {
    const { id } = await api.agent.start({
      projectId: "p-busy",
      input: { idea, workspaceId: "dev", hook: "My own opening line" },
    });
    // sent at once – the agent is still picking the template
    await api.agent.message({ runId: id, text: "Make it shorter" });
    const run = await until(
      id,
      (run) =>
        run.status === "awaiting_approval" &&
        run.messages?.[0]?.status === "done",
    );
    // the script was written, then written again with the message
    expect(
      run.steps.filter((step) => step.name === "writeScript").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("queues several messages sent while the agent works, oldest first", async () => {
    const { id } = await api.agent.start({
      projectId: "p-queue",
      input: { idea, workspaceId: "dev", hook: "My own opening line" },
    });
    // both sent at once – the second one is not refused, it waits in line
    await api.agent.message({ runId: id, text: "Make it shorter" });
    await api.agent.message({ runId: id, text: "Make it funnier" });
    const run = await until(
      id,
      (run) =>
        run.status === "awaiting_approval" &&
        (run.messages ?? []).filter(
          (message) => message.from === "user" && message.status === "done",
        ).length === 2,
    );
    const asked = run.messages!.filter((message) => message.from === "user");
    expect(asked.map((message) => message.text)).toEqual([
      "Make it shorter",
      "Make it funnier",
    ]);
  });

  it("skips the web search when the video needs no outside facts", async () => {
    const { id } = await api.agent.start({
      projectId: "p-facts",
      input: {
        idea: "Our own editor, shown step by step. NO OUTSIDE FACTS",
        workspaceId: "dev",
        hook: "My own opening line",
      },
    });
    const run = await until(id, (run) => run.status === "awaiting_approval");
    expect(run.template?.needsFacts).toBe(false);
    expect(run.steps.map((step) => step.name)).not.toContain("research");
  });

  it("writes the script again with the user's message (FR-10)", async () => {
    const waiting = await waitingForApproval();
    await api.agent.message({ runId: waiting.id, text: "Make it shorter" });
    // Waiting again, with one more call in the log: the script was rewritten,
    // and the agent said so.
    const run = await until(
      waiting.id,
      (run) =>
        run.status === "awaiting_approval" &&
        run.messages?.[0]?.status === "done",
    );
    expect(run.steps[run.steps.length - 1].name).toBe("writeScript");
    expect(run.steps.length).toBeGreaterThan(waiting.steps.length);
    expect(run.script?.comment).toBeUndefined();
    expect(run.messages![0].targets).toEqual([
      { kind: "script", instruction: "Make it shorter" },
    ]);
    expect(run.messages![1]).toMatchObject({ from: "agent" });
  });

  it("refuses an approval before there is a script", async () => {
    const { id } = await startFor("p1");
    await settled(id); // waits for a hook, no script yet
    await expect(api.agent.approveScript({ runId: id })).rejects.toMatchObject({
      code: "BAD_REQUEST",
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
