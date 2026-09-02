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
