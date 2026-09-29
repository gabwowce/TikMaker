import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { sfxOverridesSchema } from "../../src/schema/sfxOverrides";
import { voiceSettingsSchema } from "../../src/schema/voiceSettings";

// Point the whole server at a throwaway folder BEFORE importing it, so these
// tests never touch the real db/ or public/.
const root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-api-"));
process.env.TIKMAKER_ROOT = root;
const { createApp } = await import("../app.js");
const { appRouter } = await import("../trpc/router.js");
const { createCallerFactory } = await import("../trpc/init.js");

// A caller runs procedures directly, the way the editor would over HTTP.
const api = createCallerFactory(appRouter)({});
const app = createApp();

const FAKE_BYTES = Buffer.from("fake file bytes").toString("base64");
const exists = (...parts: string[]) => fs.existsSync(path.join(root, ...parts));
const readDb = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(root, "db", file), "utf-8"));
const project = (id: string) => ({
  id,
  title: id,
  fps: 30 as const,
  width: 1080 as const,
  height: 1920 as const,
  scenes: [],
});

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("collections (projects, scenes, backgrounds, voiceVariants)", () => {
  it("lists nothing when the folder does not exist yet", async () => {
    expect(await api.projects.list()).toEqual([]);
  });

  it("save writes db/<folder>/<id>.json and list returns it", async () => {
    await api.projects.save(project("my-video"));
    expect(exists("db", "projects", "my-video.json")).toBe(true);
    expect(await api.projects.list()).toEqual([
      expect.objectContaining({ id: "my-video", title: "my-video" }),
    ]);
  });

  it("refuses a project that doesn't match the schema", async () => {
    await expect(
      api.projects.save({ id: "broken", title: "x" } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(exists("db", "projects", "broken.json")).toBe(false);
  });

  it("skips an unreadable file instead of failing the whole list", async () => {
    fs.writeFileSync(path.join(root, "db", "projects", "junk.json"), '{"nope":1}');
    const ids = (await api.projects.list()).map((p) => p.id);
    expect(ids).toEqual(["my-video"]);
  });

  it("remove deletes the file", async () => {
    await api.projects.save(project("temp"));
    await api.projects.remove("temp");
    expect(exists("db", "projects", "temp.json")).toBe(false);
  });

  it("cannot escape db/ with ../ in the id", async () => {
    fs.writeFileSync(path.join(root, "package.json"), "{}");
    await api.scenes.remove("../../package");
    expect(exists("package.json")).toBe(true);
  });

  it("voiceVariants live in db/voice-variants", async () => {
    await api.voiceVariants.save({ id: "vv-1", name: "Cut", sfxId: "vo-x", savedAt: 1 });
    expect(exists("db", "voice-variants", "vv-1.json")).toBe(true);
  });
});

describe("sfxOverrides", () => {
  it("is empty until something is saved", async () => {
    expect(await api.sfxOverrides.get()).toEqual({});
  });

  it("save replaces the whole file", async () => {
    const overrides = { content: { entrance: { pop: "d-pop" } } };
    await api.sfxOverrides.save(overrides);
    expect(readDb("sfx-overrides.json")).toEqual(overrides);
    expect(await api.sfxOverrides.get()).toEqual(overrides);
  });

  it("rejects an animation name that does not exist", async () => {
    await expect(
      api.sfxOverrides.save({ content: { entrance: { slideFromBottom: "x" } } } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(readDb("sfx-overrides.json")).toEqual({
      content: { entrance: { pop: "d-pop" } },
    });
  });
});

describe("assets", () => {
  it("upload writes the file to public/ and an entry to the manifest", async () => {
    const asset = await api.assets.upload({
      filename: "logo.png",
      label: "Logo",
      dataBase64: FAKE_BYTES,
    });
    expect(asset).toMatchObject({ label: "Logo", kind: "image" });
    expect(asset.src).toMatch(/^\/assets\/custom\/logo-.+\.png$/);
    expect(exists("public", asset.src)).toBe(true);
    expect(await api.assets.list()).toEqual([asset]);
  });

  it("remove deletes both the file and the entry", async () => {
    const asset = await api.assets.upload({ filename: "a.png", label: "A", dataBase64: FAKE_BYTES });
    await api.assets.remove(asset.id);
    expect(exists("public", asset.src)).toBe(false);
    expect((await api.assets.list()).map((a) => a.id)).not.toContain(asset.id);
  });

  it("remove of an unknown id is NOT_FOUND", async () => {
    await expect(api.assets.remove("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("upload without data is BAD_REQUEST", async () => {
    await expect(
      api.assets.upload({ filename: "a.png", label: "", dataBase64: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("sfx", () => {
  it("upload, list and remove", async () => {
    const sfx = await api.sfx.upload({
      filename: "boom.mp3",
      label: "Boom",
      group: "impact",
      dataBase64: FAKE_BYTES,
    });
    expect(sfx).toMatchObject({ label: "Boom", group: "impact" });
    expect(exists("public", sfx.src)).toBe(true);
    expect(await api.sfx.list()).toContainEqual(sfx);

    await api.sfx.remove(sfx.id);
    expect(exists("public", sfx.src)).toBe(false);
  });
});

describe("voice", () => {
  it("status says whether a key is configured", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect(await api.voice.status()).toEqual({ configured: false });
  });

  it("settings come back complete even when nothing is saved", async () => {
    expect(await api.voice.settings.get()).toMatchObject({ speed: 1.15, speakerBoost: true });
  });

  it("settings outside what ElevenLabs accepts are refused", async () => {
    await expect(
      api.voice.settings.save({ speed: 3 } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("generate without a key is SERVICE_UNAVAILABLE", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    await expect(api.voice.generate({ text: "Hi" })).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
  });

  it("generate refuses empty text", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    await expect(api.voice.generate({ text: "  " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("saves the mp3 ElevenLabs returns and lists it as a voice sound", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    await api.voice.settings.save(voiceSettingsSchema.parse({ voiceId: "voice-123" }));
    const chars = [..."Hi you"];
    const fakeFetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            audio_base64: Buffer.from("mp3 bytes").toString("base64"),
            alignment: {
              characters: chars,
              character_start_times_seconds: chars.map((_, i) => i * 0.1),
              character_end_times_seconds: chars.map((_, i) => i * 0.1 + 0.1),
            },
          }),
        ),
    );
    vi.stubGlobal("fetch", fakeFetch);

    const { words, ...clip } = await api.voice.generate({
      text: "Hello world",
      label: "Greeting",
      speed: 0.9,
    });

    expect(clip).toMatchObject({ label: "Greeting", group: "voice" });
    expect(fs.readFileSync(path.join(root, "public", clip.src), "utf-8")).toBe("mp3 bytes");
    expect(await api.sfx.list()).toContainEqual(clip);
    // the alignment comes back as words, for captions
    expect(words.map((w) => w.text)).toEqual(["Hi", "you"]);
    expect(words[1].start).toBeCloseTo(0.3);

    // voiceId comes from the saved settings, speed from this call
    const [url, init] = fakeFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/text-to-speech/voice-123/with-timestamps");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
    expect(JSON.parse(String(init.body)).voice_settings.speed).toBe(0.9);
  });

  it("an ElevenLabs failure is BAD_GATEWAY", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("quota", { status: 401 })));
    await expect(api.voice.generate({ text: "Hi" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: expect.stringContaining("ElevenLabs 401"),
    });
  });
});

describe("renders", () => {
  it("refuses a project with no scenes", async () => {
    await expect(api.renders.start({ project: project("p") })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("an unknown job is NOT_FOUND", async () => {
    await expect(api.renders.get("nope")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("over HTTP (what the browser actually sends)", () => {
  it("a query is GET /trpc/<procedure>", async () => {
    const response = await request(app).get("/trpc/voice.status");
    expect(response.status).toBe(200);
    expect(response.body.result.data).toHaveProperty("configured");
  });

  it("a mutation is POST /trpc/<procedure> with the input as JSON", async () => {
    const response = await request(app)
      .post("/trpc/sfxOverrides.save")
      .send({ visual: { exit: { fade: "none" } } });
    expect(response.status).toBe(200);
    expect(readDb("sfx-overrides.json")).toEqual({ visual: { exit: { fade: "none" } } });
  });

  it("a mutation whose input is a bare string works (remove)", async () => {
    await api.scenes.save({
      id: "http-remove",
      name: "x",
      savedAt: 1,
      scene: { id: "s", type: "hook-centered", background: "solid-dark", content: {} },
    } as never);
    const response = await request(app)
      .post("/trpc/scenes.remove")
      .set("Content-Type", "application/json")
      .send(JSON.stringify("http-remove"));
    expect(response.status).toBe(200);
    expect(exists("db", "scenes", "http-remove.json")).toBe(false);
  });

  it("invalid input is a 400 with the reason", async () => {
    const response = await request(app).post("/trpc/assets.remove").send({});
    expect(response.status).toBe(400);
  });

  it("the finished MP4 comes from a plain route; unknown ids are 404", async () => {
    expect((await request(app).get("/api/renders/nope/file")).status).toBe(404);
  });
});

describe("the real db/ files match their schemas", () => {
  // Guards against renaming an animation in scene.ts and forgetting the saved
  // file: this fails `npm test` instead of a sound silently vanishing.
  const realDb = path.resolve(__dirname, "../../db");
  it.each([
    ["sfx-overrides.json", sfxOverridesSchema],
    ["voice-settings.json", voiceSettingsSchema],
  ] as const)("%s", (file, schema) => {
    const json = JSON.parse(fs.readFileSync(path.join(realDb, file), "utf-8"));
    expect(() => schema.parse(json)).not.toThrow();
  });
});
