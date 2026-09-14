import { getSfx } from "../registries/sfxRegistry";
import type { VideoProject } from "../schema/project";
export type AudioClip = NonNullable<VideoProject["audioClips"]>[number];
export const VOICE_DUCK_FADE_FRAMES = 2;
export function isVoiceClip(clip: AudioClip): boolean {
  return getSfx(clip.sfxId)?.group === "voice";
}
export function voiceCutoffFrame(
  clips: AudioClip[],
  clip: AudioClip,
  isVoice: (clip: AudioClip) => boolean = isVoiceClip,
): number | undefined {
  if (!isVoice(clip)) return undefined;
  let next: number | undefined;
  for (const other of clips) {
    if (other.id === clip.id || other.from <= clip.from || !isVoice(other))
      continue;
    if (next === undefined || other.from < next) next = other.from;
  }
  return next;
}
export type ResolvedAudioClip = {
  clip: AudioClip;
  from: number;
  durationInFrames: number;
  endAt?: number;
  duckedBy?: string;
};
export function resolveAudioClips(
  clips: AudioClip[],
  totalDuration: number,
  isVoice: (clip: AudioClip) => boolean = isVoiceClip,
): ResolvedAudioClip[] {
  void isVoice;
  return clips.flatMap((clip) => {
    if (clip.from >= totalDuration) return [];
    const from = clip.from;
    const startFrom = Math.max(0, clip.startFrom ?? 0);
    const window = totalDuration - from;
    const requested = Math.min(clip.durationInFrames ?? window, window);
    const durationInFrames = Math.max(1, requested);
    return [
      {
        clip,
        from,
        durationInFrames,
        endAt:
          clip.durationInFrames !== undefined
            ? startFrom + durationInFrames
            : undefined,
        duckedBy: undefined,
      },
    ];
  });
}
