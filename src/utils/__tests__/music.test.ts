import { describe, expect, it } from "vitest";
import { MUSIC_DEFAULTS, musicVolumeAt, voiceRanges } from "../music";
import type { AudioClip } from "../voiceClips";

const isVoice = (clip: AudioClip) => clip.sfxId.startsWith("vo-");
const music = {
  sfxId: "song",
  volume: 0.3,
  duckVolume: 0.1,
  fadeInFrames: 0,
  fadeOutFrames: 0,
};

describe("voiceRanges", () => {
  it("trims a clip with words to when it actually speaks", () => {
    const clips: AudioClip[] = [
      {
        id: "a",
        sfxId: "vo-a",
        from: 30,
        durationInFrames: 120,
        words: [
          { text: "Labas", start: 0.5, end: 1 },
          { text: "rytas", start: 1, end: 2 },
        ],
      },
    ];
    expect(voiceRanges(clips, 300, 30, isVoice)).toEqual([
      { start: 45, end: 90 },
    ]);
  });

  it("merges a short pause but keeps a long one", () => {
    const clips: AudioClip[] = [
      { id: "a", sfxId: "vo-a", from: 0, durationInFrames: 30 },
      { id: "b", sfxId: "vo-b", from: 40, durationInFrames: 30 },
      { id: "c", sfxId: "vo-c", from: 200, durationInFrames: 30 },
    ];
    expect(voiceRanges(clips, 300, 30, isVoice)).toEqual([
      { start: 0, end: 70 },
      { start: 200, end: 230 },
    ]);
  });

  it("ignores sound effects", () => {
    const clips: AudioClip[] = [
      { id: "w", sfxId: "soft-whoosh", from: 0, durationInFrames: 20 },
    ];
    expect(voiceRanges(clips, 300, 30, isVoice)).toEqual([]);
  });
});

describe("musicVolumeAt", () => {
  const speech = [{ start: 100, end: 200 }];

  it("plays at its own level away from the voice", () => {
    expect(musicVolumeAt(10, 300, speech, music)).toBeCloseTo(0.3);
  });

  it("ducks while the voice speaks", () => {
    expect(musicVolumeAt(150, 300, speech, music)).toBeCloseTo(0.1);
  });

  it("fades out at the end of the video", () => {
    const withFade = { ...music, fadeOutFrames: 30 };
    expect(musicVolumeAt(285, 300, [], withFade)).toBeCloseTo(0.15);
    expect(musicVolumeAt(300, 300, [], withFade)).toBe(0);
  });

  it("uses the defaults when nothing is set", () => {
    expect(musicVolumeAt(150, 300, [], { sfxId: "song" })).toBeCloseTo(
      MUSIC_DEFAULTS.volume,
    );
  });
});
