import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "tikmaker-voice-"));
process.env.TIKMAKER_ROOT = root;
process.env.ELEVENLABS_API_KEY = "test-key";
const { generateVoice } = await import("../voice.js");
const { voiceAround } = await import("../agent/steps/voice.js");
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe("the voice runs on from scene to scene", () => {
  it("knows the lines around each scene", () => {
    const scenes = [{ voiceover: "Hook!" }, { voiceover: "Middle." }, { voiceover: "End." }];
    expect(voiceAround(scenes, 0)).toEqual({ next: "Middle." });
    expect(voiceAround(scenes, 1)).toEqual({ previous: "Hook!", next: "End." });
    expect(voiceAround(scenes, 2)).toEqual({ previous: "Middle." });
  });

  it("sends them to ElevenLabs as previous_text / next_text", async () => {
    const fetch = vi.fn(async () =>
      new Response(JSON.stringify({ audio_base64: "", alignment: null }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetch);
    await generateVoice("Middle.", "scene 2", {}, { previous: "Hook!", next: "End." });
    const body = JSON.parse((fetch.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body).toMatchObject({ text: "Middle.", previous_text: "Hook!", next_text: "End." });
    await generateVoice("Alone.");
    const plain = JSON.parse((fetch.mock.calls[1] as unknown as [string, { body: string }])[1].body);
    expect(plain.previous_text).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
