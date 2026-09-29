import { describe, expect, it } from "vitest";
import { createEmptyProject, type VideoProject } from "../../schema/project";
import { captionTimeline, chunkWords } from "../captions";
import { alignmentToWords } from "../captionWords";

function words(text: string, gap = 0) {
  let t = 0;
  return text.split(" ").map((w) => {
    const word = { text: w, start: t, end: t + 0.3 };
    t += 0.3 + gap;
    return word;
  });
}

function projectWith(clip: Partial<NonNullable<VideoProject["audioClips"]>[number]>): VideoProject {
  return {
    ...createEmptyProject("p", "p"),
    scenes: [
      { id: "s", type: "hook-centered", durationSeconds: 10, background: "solid-dark", content: {} },
    ],
    audioClips: [{ id: "a", sfxId: "vo-x", from: 30, ...clip }],
  };
}

describe("alignmentToWords", () => {
  it("joins characters into words at whitespace", () => {
    const chars = [..."Hi, you there"];
    const result = alignmentToWords({
      characters: chars,
      character_start_times_seconds: chars.map((_, i) => i),
      character_end_times_seconds: chars.map((_, i) => i + 1),
    });
    expect(result).toEqual([
      { text: "Hi,", start: 0, end: 3 },
      { text: "you", start: 4, end: 7 },
      { text: "there", start: 8, end: 13 },
    ]);
  });
});

describe("chunkWords", () => {
  it("keeps chunks to three short words", () => {
    const chunks = chunkWords(words("one two three four five"));
    expect(chunks.map((c) => c.map((w) => w.text).join(" "))).toEqual([
      "one two three",
      "four five",
    ]);
  });

  it("breaks after punctuation and at a pause", () => {
    expect(chunkWords(words("stop. now")).length).toBe(2);
    expect(chunkWords(words("a b", 0.5)).length).toBe(2);
  });
});

describe("captionTimeline", () => {
  it("places words by the clip's position, trim and speed", () => {
    // word at 2s of source audio, clip trimmed by 30 frames (1s), played 2x
    const project = projectWith({
      startFrom: 30,
      playbackRate: 2,
      words: [{ text: "hi", start: 2, end: 2.5 }],
    });
    const [chunk] = captionTimeline(project, 30);
    // 30 (clip start) + (60 - 30) / 2 = 45
    expect(chunk.words[0].from).toBe(45);
  });

  it("drops words the clip's trim cuts off", () => {
    const project = projectWith({
      durationInFrames: 30,
      words: [
        { text: "kept", start: 0.2, end: 0.5 },
        { text: "cut", start: 2, end: 2.4 },
      ],
    });
    const texts = captionTimeline(project, 30).flatMap((c) => c.words.map((w) => w.text));
    expect(texts).toEqual(["kept"]);
  });

  it("never shows two chunks at once", () => {
    const project = projectWith({ words: words("one two three four five six") });
    const chunks = captionTimeline(project, 30);
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(chunks[i].to).toBeLessThanOrEqual(chunks[i + 1].from);
    }
  });
});
