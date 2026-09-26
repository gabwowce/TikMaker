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
const app = createApp();

const PNG_BASE64 = Buffer.from("fake png bytes").toString("base64");
const exists = (...parts: string[]) => fs.existsSync(path.join(root, ...parts));
const readDb = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(root, "db", file), "utf-8"));

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("collections (/api/projects and friends)", () => {
  it("lists nothing when the folder does not exist yet", async () => {
    const response = await request(app).get("/api/projects");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("PUT writes db/<folder>/<id>.json and GET returns it", async () => {
    const project = { id: "my-video", title: "My video" };
    const put = await request(app).put("/api/projects/my-video").send(project);
    expect(put.status).toBe(200);
    expect(exists("db", "projects", "my-video.json")).toBe(true);

    const list = await request(app).get("/api/projects");
    expect(list.body).toEqual([project]);
  });

  it("rejects a body whose id does not match the URL", async () => {
    const response = await request(app)
      .put("/api/projects/one")
      .send({ id: "two" });
    expect(response.status).toBe(400);
    expect(exists("db", "projects", "one.json")).toBe(false);
  });

  it("DELETE removes the file", async () => {
    await request(app).put("/api/templates/tpl").send({ id: "tpl" });
    const response = await request(app).delete("/api/templates/tpl");
    expect(response.status).toBe(204);
    expect(exists("db", "templates", "tpl.json")).toBe(false);
  });

  it("cannot escape db/ with ../ in the id", async () => {
    fs.writeFileSync(path.join(root, "package.json"), "{}");
    await request(app).delete("/api/templates/..%2F..%2Fpackage");
    expect(exists("package.json")).toBe(true);
  });

  it("answers broken JSON with 400, not 500", async () => {
    const response = await request(app)
      .put("/api/projects/x")
      .set("Content-Type", "application/json")
      .send("{broken");
    expect(response.status).toBe(400);
  });
});

describe("sfx overrides (/api/sfx-overrides)", () => {
  it("is empty until something is saved", async () => {
    const response = await request(app).get("/api/sfx-overrides");
    expect(response.body).toEqual({});
  });

  it("PUT replaces the whole file", async () => {
    const overrides = { content: { entrance: { pop: "d-pop" } } };
    const put = await request(app).put("/api/sfx-overrides").send(overrides);
    expect(put.status).toBe(200);
    expect(readDb("sfx-overrides.json")).toEqual(overrides);
    const response = await request(app).get("/api/sfx-overrides");
    expect(response.body).toEqual(overrides);
  });

  it("rejects an animation name that does not exist", async () => {
    const response = await request(app)
      .put("/api/sfx-overrides")
      .send({ content: { entrance: { slideFromBottom: "d-pop" } } });
    expect(response.status).toBe(400);
    expect(readDb("sfx-overrides.json")).toEqual({
      content: { entrance: { pop: "d-pop" } },
    });
  });

  it("rejects an unknown section", async () => {
    const response = await request(app)
      .put("/api/sfx-overrides")
      .send({ texts: {} });
    expect(response.status).toBe(400);
  });
});

describe("voice settings (/api/voice/settings)", () => {
  it("returns every default when nothing is saved", async () => {
    const response = await request(app).get("/api/voice/settings");
    expect(response.body).toMatchObject({
      voiceId: expect.any(String),
      speed: 1.15,
      speakerBoost: true,
    });
  });

  it("PUT saves, filling in defaults for missing fields", async () => {
    const response = await request(app)
      .put("/api/voice/settings")
      .send({ voiceId: "my-voice", speed: 1 });
    expect(response.status).toBe(200);
    expect(readDb("voice-settings.json")).toMatchObject({
      voiceId: "my-voice",
      speed: 1,
      stability: 1,
    });
  });

  it("rejects values outside what ElevenLabs accepts", async () => {
    const response = await request(app)
      .put("/api/voice/settings")
      .send({ speed: 3 });
    expect(response.status).toBe(400);
  });
});

describe("assets (/api/assets)", () => {
  it("requires a filename and data", async () => {
    const response = await request(app).post("/api/assets").send({});
    expect(response.status).toBe(400);
  });

  it("upload writes the file to public/ and an entry to the manifest", async () => {
    const response = await request(app)
      .post("/api/assets")
      .send({ filename: "logo.png", label: "Logo", dataBase64: PNG_BASE64 });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ label: "Logo", kind: "image" });
    expect(response.body.src).toMatch(/^\/assets\/custom\/logo-.+\.png$/);
    expect(exists("public", response.body.src)).toBe(true);
    expect(readDb("custom-assets.json")).toEqual([response.body]);
  });

  it("delete removes both the file and the entry", async () => {
    const upload = await request(app)
      .post("/api/assets")
      .send({ filename: "a.png", label: "A", dataBase64: PNG_BASE64 });
    const response = await request(app).delete(`/api/assets/${upload.body.id}`);
    expect(response.status).toBe(204);
    expect(exists("public", upload.body.src)).toBe(false);
    const ids = readDb("custom-assets.json").map((a: { id: string }) => a.id);
    expect(ids).not.toContain(upload.body.id);
  });

  it("delete of an unknown id is 404", async () => {
    const response = await request(app).delete("/api/assets/nope");
    expect(response.status).toBe(404);
  });
});

describe("sound effects (/api/sfx)", () => {
  it("upload, list and delete", async () => {
    const upload = await request(app)
      .post("/api/sfx")
      .send({ filename: "boom.mp3", label: "Boom", group: "impact", dataBase64: PNG_BASE64 });
    expect(upload.status).toBe(201);
    expect(upload.body).toMatchObject({ label: "Boom", group: "impact" });
    expect(exists("public", upload.body.src)).toBe(true);

    const list = await request(app).get("/api/sfx");
    expect(list.body).toContainEqual(upload.body);

    const remove = await request(app).delete(`/api/sfx/${upload.body.id}`);
    expect(remove.status).toBe(204);
    expect(exists("public", upload.body.src)).toBe(false);
  });
});

describe("voice (/api/voice)", () => {
  it("status says whether a key is configured", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const response = await request(app).get("/api/voice/status");
    expect(response.body).toEqual({ configured: false });
  });

  it("refuses to generate without a key", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const response = await request(app).post("/api/voice").send({ text: "Hi" });
    expect(response.status).toBe(503);
  });

  it("refuses empty text", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    const response = await request(app).post("/api/voice").send({ text: "  " });
    expect(response.status).toBe(400);
  });

  it("saves the mp3 ElevenLabs returns and lists it as a voice sound", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    await request(app).put("/api/voice/settings").send({ voiceId: "voice-123" });
    const fakeFetch = vi.fn(async () => new Response(Buffer.from("mp3 bytes")));
    vi.stubGlobal("fetch", fakeFetch);

    const response = await request(app)
      .post("/api/voice")
      .send({ text: "Hello world", label: "Greeting", speed: 0.9 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ label: "Greeting", group: "voice" });
    expect(fs.readFileSync(path.join(root, "public", response.body.src), "utf-8")).toBe(
      "mp3 bytes",
    );
    expect(readDb("custom-sfx.json")).toContainEqual(response.body);

    // voiceId comes from the saved settings, speed from this request
    const [url, init] = fakeFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/text-to-speech/voice-123");
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("test-key");
    expect(JSON.parse(String(init.body)).voice_settings.speed).toBe(0.9);
  });

  it("passes an ElevenLabs failure on as 502", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("quota", { status: 401 })));
    const response = await request(app).post("/api/voice").send({ text: "Hi" });
    expect(response.status).toBe(502);
    expect(response.body.error).toContain("ElevenLabs 401");
  });
});

describe("the real db/ files match their schemas", () => {
  // The guard against renaming an animation in scene.ts and forgetting the
  // saved file: this fails `npm test` instead of a sound silently vanishing.
  const realDb = path.resolve(__dirname, "../../db");
  it.each([
    ["sfx-overrides.json", sfxOverridesSchema],
    ["voice-settings.json", voiceSettingsSchema],
  ] as const)("%s", (file, schema) => {
    const json = JSON.parse(fs.readFileSync(path.join(realDb, file), "utf-8"));
    expect(() => schema.parse(json)).not.toThrow();
  });
});

describe("renders (/api/renders)", () => {
  it("refuses a project with no scenes", async () => {
    const response = await request(app)
      .post("/api/renders")
      .send({ project: { id: "p", scenes: [] } });
    expect(response.status).toBe(400);
  });

  it("unknown jobs are 404", async () => {
    expect((await request(app).get("/api/renders/nope")).status).toBe(404);
    expect((await request(app).get("/api/renders/nope/file")).status).toBe(404);
  });
});
