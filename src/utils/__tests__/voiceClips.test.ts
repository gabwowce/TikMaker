import { describe, expect, it } from "vitest";
import { resolveAudioClips, voiceCutoffFrame, type AudioClip } from "../voiceClips";

const clip = (id: string, from: number, patch: Partial<AudioClip> = {}): AudioClip =>
  ({ id, sfxId: id.startsWith("vo") ? `vo-${id}` : "soft-whoosh", from, ...patch });

/** Hermetic stand-in for the registry lookup, so the rule is tested without
 * depending on which voiceovers happen to be in `customSfx.json`. */
const isVoice = (value: AudioClip) => value.sfxId.startsWith("vo-");

describe("monophonic voice", () => {
  it("stops a voice line where the next one starts", () => {
    const clips = [clip("vo-a", 0), clip("vo-b", 49)];
    const [a, b] = resolveAudioClips(clips, 1000, isVoice);
    expect(a.durationInFrames).toBe(49);
    expect(a.duckedBy).toBe("vo-b");
    // The last line has nothing after it, so it plays to its own end.
    expect(b.duckedBy).toBeUndefined();
    expect(b.endAt).toBeUndefined();
  });

  it("leaves a voice line alone when nothing follows it", () => {
    const [only] = resolveAudioClips([clip("vo-a", 10)], 1000, isVoice);
    expect(only.durationInFrames).toBe(990);
    expect(only.duckedBy).toBeUndefined();
  });

  it("lets sound effects overlap voice and each other, and overrun their scene", () => {
    const clips = [clip("vo-a", 0), clip("whoosh", 10, { durationInFrames: 400 }), clip("pop", 12, { durationInFrames: 300 })];
    const resolved = resolveAudioClips(clips, 1000, isVoice);
    expect(resolved.find((r) => r.clip.id === "whoosh")!.durationInFrames).toBe(400);
    expect(resolved.find((r) => r.clip.id === "pop")!.durationInFrames).toBe(300);
    expect(resolved.every((r) => r.clip.id === "vo-a" || r.duckedBy === undefined)).toBe(true);
  });

  it("does not stretch a voice line that already ends before the next one", () => {
    const clips = [clip("vo-a", 0, { durationInFrames: 20 }), clip("vo-b", 100)];
    const [a] = resolveAudioClips(clips, 1000, isVoice);
    expect(a.durationInFrames).toBe(20);
    expect(a.duckedBy).toBeUndefined();
  });

  it("caps an explicit length that would still overlap the next line", () => {
    const clips = [clip("vo-a", 0, { durationInFrames: 200 }), clip("vo-b", 60)];
    const [a] = resolveAudioClips(clips, 1000, isVoice);
    expect(a.durationInFrames).toBe(60);
    expect(a.duckedBy).toBe("vo-b");
  });

  it("keeps the source offset when an explicitly cut line is ducked", () => {
    const clips = [clip("vo-a", 0, { startFrom: 30, durationInFrames: 200 }), clip("vo-b", 45)];
    const [a] = resolveAudioClips(clips, 1000, isVoice);
    expect(a.durationInFrames).toBe(45);
    expect(a.endAt).toBe(75);
  });

  it("never sets endAt from a duck alone, so the transport is not held open", () => {
    // `vo-a` has no explicit length and the next line is 20s away. Ducking must
    // shorten the mounted window without asking the file to play that far.
    const clips = [clip("vo-a", 0), clip("vo-b", 600)];
    const [a] = resolveAudioClips(clips, 2000, isVoice);
    expect(a.durationInFrames).toBe(600);
    expect(a.endAt).toBeUndefined();
  });

  it("only looks forward, so the earlier line is the one cut", () => {
    const clips = [clip("vo-a", 0), clip("vo-b", 49)];
    expect(voiceCutoffFrame(clips, clips[0], isVoice)).toBe(49);
    expect(voiceCutoffFrame(clips, clips[1], isVoice)).toBeUndefined();
  });

  it("drops clips that start past the end of the video", () => {
    expect(resolveAudioClips([clip("vo-a", 5000)], 1000, isVoice)).toEqual([]);
  });
});

describe("a line that outlives the composition", () => {
  /** `projectDurationInFrames` — an unset length counts as a single frame, so
   * an untrimmed clip never grows the video to contain itself. Mirrored here
   * rather than imported, to keep the test hermetic. */
  const compositionEnd = (scenesEnd: number, clips: AudioClip[]) =>
    clips.reduce((end, c) => Math.max(end, c.from + (c.durationInFrames ?? 1)), scenesEnd);

  it("an untrimmed clip does not extend the video, so it is cut at the end", () => {
    // The outro line's file is 90 frames, but nothing records that.
    const clips = [clip("vo-intro", 0, { durationInFrames: 60 }), clip("vo-outro", 300)];
    const end = compositionEnd(330, clips);
    expect(end).toBe(330);

    const [, outro] = resolveAudioClips(clips, end, isVoice);
    // Mounted only to the end of the video — 60 frames short of the real file.
    expect(outro.durationInFrames).toBe(30);
    // With the Player looping, frame 330 restarts the composition and vo-intro
    // begins while this line still has 2s of speech left. That is the doubling.
  });

  it("recording the real length grows the video to hold the line", () => {
    // What `addAudioClip` now stamps at placement, and what the Voice tab's
    // "Sutalpinti" button writes for clips placed before that existed.
    const clips = [clip("vo-intro", 0, { durationInFrames: 60 }), clip("vo-outro", 300, { durationInFrames: 90 })];
    const end = compositionEnd(330, clips);
    expect(end).toBe(390);

    const [, outro] = resolveAudioClips(clips, end, isVoice);
    expect(outro.durationInFrames).toBe(90);
    expect(outro.endAt).toBe(90);
    // The line now finishes exactly as the video does, so the loop point no
    // longer lands in the middle of it.
    expect(outro.from + outro.durationInFrames).toBe(end);
  });
});
