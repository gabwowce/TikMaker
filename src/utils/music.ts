import type { VideoProject } from "../schema/project";
import { isVoiceClip, resolveAudioClips, type AudioClip } from "./voiceClips";

export type ProjectMusic = NonNullable<VideoProject["music"]>;
export type FrameRange = { start: number; end: number };

export const MUSIC_DEFAULTS = {
  volume: 0.25,
  duckVolume: 0.08,
  fadeInFrames: 15,
  fadeOutFrames: 45,
};
// How long the music takes to dip under the voice and come back up.
export const DUCK_RAMP_FRAMES = 8;
// Pauses shorter than this stay ducked — the music pumping up between two
// sentences reads as a mistake, not as a breath.
export const DUCK_MERGE_GAP_FRAMES = 15;

// When the voiceover is actually speaking, in video frames. A clip with
// `words` is trimmed to its first and last word (generated audio has silence
// at both ends); one without falls back to its whole window.
export function voiceRanges(
  clips: AudioClip[],
  totalDuration: number,
  fps: number,
  isVoice: (clip: AudioClip) => boolean = isVoiceClip,
): FrameRange[] {
  const ranges = resolveAudioClips(clips, totalDuration)
    .filter(({ clip }) => isVoice(clip))
    .map(({ clip, from, durationInFrames }) => {
      const end = from + durationInFrames;
      const words = clip.words;
      if (!words?.length) return { start: from, end };
      const startFrom = clip.startFrom ?? 0;
      const rate = clip.playbackRate ?? 1;
      // Same conversion as captionTimeline, so ducking and captions agree.
      const toFrame = (seconds: number) =>
        from + (seconds * fps - startFrom) / rate;
      return {
        start: Math.max(from, toFrame(words[0].start)),
        end: Math.min(end, toFrame(words[words.length - 1].end)),
      };
    })
    .filter((range) => range.end > range.start)
    .sort((a, b) => a.start - b.start);

  const merged: FrameRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start - last.end <= DUCK_MERGE_GAP_FRAMES) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

// 0 = full music, 1 = fully ducked. Ramps over DUCK_RAMP_FRAMES on both sides
// of each speech range, so the dip starts just before the first word.
function duckAmount(frame: number, speech: FrameRange[]): number {
  let amount = 0;
  for (const range of speech) {
    const distance =
      frame < range.start
        ? range.start - frame
        : frame > range.end
          ? frame - range.end
          : 0;
    amount = Math.max(amount, 1 - distance / DUCK_RAMP_FRAMES);
  }
  return Math.min(1, Math.max(0, amount));
}

export function musicVolumeAt(
  frame: number,
  totalDuration: number,
  speech: FrameRange[],
  music: ProjectMusic,
): number {
  const volume = music.volume ?? MUSIC_DEFAULTS.volume;
  // Ducking never makes the music LOUDER than its own level.
  const ducked = Math.min(
    volume,
    music.duckVolume ?? MUSIC_DEFAULTS.duckVolume,
  );
  const level = volume + (ducked - volume) * duckAmount(frame, speech);

  const fadeIn = music.fadeInFrames ?? MUSIC_DEFAULTS.fadeInFrames;
  const fadeOut = music.fadeOutFrames ?? MUSIC_DEFAULTS.fadeOutFrames;
  const inGain = fadeIn > 0 ? Math.min(1, frame / fadeIn) : 1;
  const outGain =
    fadeOut > 0 ? Math.min(1, (totalDuration - frame) / fadeOut) : 1;
  return Math.max(0, level * Math.min(inGain, outGain));
}
