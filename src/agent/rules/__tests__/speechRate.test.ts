import { describe, expect, it } from "vitest";
import { registerSfx } from "../../../registries/sfxRegistry";
import type { DesignRule } from "../../knowledge";
import type { VideoProject } from "../../../schema/project";
import type { Scene } from "../../../schema/scene";
import { voiceWordsPerSecond } from "../speechRate";

// isVoiceClip reads the sound's group from the registry, so the test
// registers a voice sound of its own.
registerSfx({ id: "test-voice", label: "test", src: "/x.mp3", group: "voice" });

const rule: DesignRule = { id: "speech-rate", check: "voiceWordsPerSecond", max: 3.4, level: "warning" };
const scene = { id: "s1", durationSeconds: 10, content: {} } as unknown as Scene;
const project = (words: { text: string; start: number; end: number }[], playbackRate = 1) =>
  ({
    fps: 30,
    scenes: [scene],
    audioClips: [{ id: "v", sfxId: "test-voice", from: 0, words, playbackRate }],
  }) as unknown as VideoProject;

// n words, one every `gap` seconds.
const words = (n: number, gap: number) =>
  Array.from({ length: n }, (_, i) => ({ text: "w", start: i * gap, end: i * gap + gap / 2 }));

describe("voiceWordsPerSecond", () => {
  it("warns when the voice speaks too fast", () => {
    // 10 words in 2.375 s ≈ 4.2 words per second.
    const result = voiceWordsPerSecond(project(words(10, 0.25)), rule);
    expect(result).toHaveLength(1);
    expect(result[0].sceneId).toBe("s1");
  });

  it("counts the playback rate", () => {
    // The same words played at half speed: ≈ 2.1 per second, under the limit.
    expect(voiceWordsPerSecond(project(words(10, 0.25), 0.5), rule)).toEqual([]);
  });
});
