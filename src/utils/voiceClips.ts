import { getSfx } from "../registries/sfxRegistry";
import type { VideoProject } from "../schema/project";
export type AudioClip = NonNullable<VideoProject["audioClips"]>[number];
export function isVoiceClip(clip: AudioClip): boolean {
  return getSfx(clip.sfxId)?.group === "voice";
}
export type ResolvedAudioClip = {
  clip: AudioClip;
  from: number;
  durationInFrames: number;
  endAt?: number;
};
export function resolveAudioClips(
  clips: AudioClip[],
  totalDuration: number,
): ResolvedAudioClip[] {
  return clips.flatMap((clip) => {
    if (clip.from >= totalDuration) return [];
    const startFrom = Math.max(0, clip.startFrom ?? 0);
    const window = totalDuration - clip.from;
    const durationInFrames = Math.max(
      1,
      Math.min(clip.durationInFrames ?? window, window),
    );
    return [
      {
        clip,
        from: clip.from,
        durationInFrames,
        endAt:
          clip.durationInFrames !== undefined
            ? startFrom + durationInFrames
            : undefined,
      },
    ];
  });
}
