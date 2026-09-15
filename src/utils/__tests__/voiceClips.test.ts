import { describe, expect, it } from "vitest";
import { resolveAudioClips, type AudioClip } from "../voiceClips";
function clip(
  id: string,
  from: number,
  patch: Partial<AudioClip> = {},
): AudioClip {
  return {
    id,
    sfxId: id.startsWith("vo") ? `vo-${id}` : "soft-whoosh",
    from,
    ...patch,
  };
}
describe("audio clips across scene boundaries", () => {
  it("lets voice clips overlap at their authored timeline positions", () => {
    const clips = [
      clip("vo-a", 0, { durationInFrames: 60 }),
      clip("vo-b", 49, { durationInFrames: 30 }),
    ];
    const [a, b] = resolveAudioClips(clips, 1000);
    expect(a.durationInFrames).toBe(60);
    expect(b.from).toBe(49);
    expect(b.endAt).toBe(30);
  });
  it("runs an untrimmed line to the end of the video", () => {
    const [only] = resolveAudioClips([clip("vo-a", 10)], 1000);
    expect(only.durationInFrames).toBe(990);
  });
  it("lets sound effects overlap voice and each other", () => {
    const clips = [
      clip("vo-a", 0),
      clip("whoosh", 10, { durationInFrames: 400 }),
      clip("pop", 12, { durationInFrames: 300 }),
    ];
    const resolved = resolveAudioClips(clips, 1000);
    expect(resolved.find((r) => r.clip.id === "whoosh")!.durationInFrames).toBe(
      400,
    );
    expect(resolved.find((r) => r.clip.id === "pop")!.durationInFrames).toBe(
      300,
    );
  });
  it("keeps an explicit length without moving the next line", () => {
    const clips = [
      clip("vo-a", 0, { durationInFrames: 200 }),
      clip("vo-b", 60),
    ];
    const resolved = resolveAudioClips(clips, 1000);
    expect(resolved[0].durationInFrames).toBe(200);
    expect(resolved[1].from).toBe(60);
  });
  it("keeps the source offset and authored length", () => {
    const clips = [
      clip("vo-a", 0, { startFrom: 30, durationInFrames: 200 }),
      clip("vo-b", 45),
    ];
    const [a] = resolveAudioClips(clips, 1000);
    expect(a.durationInFrames).toBe(200);
    expect(a.endAt).toBe(230);
  });
  it("leaves endAt unset for an untrimmed clip", () => {
    const clips = [clip("vo-a", 0), clip("vo-b", 600)];
    const [a] = resolveAudioClips(clips, 2000);
    expect(a.durationInFrames).toBe(2000);
    expect(a.endAt).toBeUndefined();
  });
  it("drops clips that start past the end of the video", () => {
    expect(resolveAudioClips([clip("vo-a", 5000)], 1000)).toEqual([]);
  });
});
describe("a line that outlives the composition", () => {
  function compositionEnd(scenesEnd: number, clips: AudioClip[]) {
    return clips.reduce(
      (end, c) => Math.max(end, c.from + (c.durationInFrames ?? 1)),
      scenesEnd,
    );
  }
  it("an untrimmed clip does not extend the video, so it is cut at the end", () => {
    const clips = [
      clip("vo-intro", 0, { durationInFrames: 60 }),
      clip("vo-outro", 300),
    ];
    const end = compositionEnd(330, clips);
    expect(end).toBe(330);
    const [, outro] = resolveAudioClips(clips, end);
    expect(outro.durationInFrames).toBe(30);
  });
  it("recording the real length grows the video to hold the line", () => {
    const clips = [
      clip("vo-intro", 0, { durationInFrames: 60 }),
      clip("vo-outro", 300, { durationInFrames: 90 }),
    ];
    const end = compositionEnd(330, clips);
    expect(end).toBe(390);
    const [, outro] = resolveAudioClips(clips, end);
    expect(outro.durationInFrames).toBe(90);
    expect(outro.endAt).toBe(90);
    expect(outro.from + outro.durationInFrames).toBe(end);
  });
});
