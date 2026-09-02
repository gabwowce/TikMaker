import type { VideoProject } from "../schema/project";
import { getSfx } from "../registries/sfxRegistry";

export type AudioClip = NonNullable<VideoProject["audioClips"]>[number];

/**
 * Frames a ducked line fades over. Deliberately tiny: this exists to stop a cut
 * landing on a non-zero sample as a click, not to be an audible fade.
 *
 * It has to stay short because the renderer cannot tell a line that is being
 * cut mid-word from one whose file happened to end right before the next line
 * starts — only the editor knows the real file length, from the waveform. So
 * the fade is applied to every handed-off line, and 2 frames (~66ms) is past
 * the ~20ms a de-click needs while still being too brief to soften a final
 * consonant.
 */
export const VOICE_DUCK_FADE_FRAMES = 2;

export function isVoiceClip(clip: AudioClip): boolean {
  return getSfx(clip.sfxId)?.group === "voice";
}

/**
 * Voice is MONOPHONIC: exactly one line is audible at a time.
 *
 * Everything else on the audio track — whooshes, pops, the per-word typewriter
 * cues — may overlap freely and may run well past the scene it started in, and
 * that freedom is the point: a cue landing across a cut is what ties two scenes
 * together. Two VOICE lines overlapping is never that. It is two people talking
 * over each other, and it happens for a structural reason rather than an
 * artistic one — a line placed on a scene that is shorter than the recording is
 * still speaking when the next scene's line starts on time.
 *
 * Returns the absolute frame at which `clip` must be silent, or undefined when
 * no other voice line follows it.
 *
 * The rule is resolved at RENDER time instead of being written into the clips
 * because the overlap is a consequence of where the clips currently sit, and
 * that keeps moving while the video is edited. Trimming `durationInFrames` on
 * every move would bake one arrangement's answer into the project and lose the
 * tail for good; capping the audible window leaves the data untouched, so
 * dragging the later line further right hands the earlier one its tail back.
 */
export function voiceCutoffFrame(clips: AudioClip[], clip: AudioClip, isVoice: (clip: AudioClip) => boolean = isVoiceClip): number | undefined {
  if (!isVoice(clip)) return undefined;
  let next: number | undefined;
  for (const other of clips) {
    // `from` alone decides the order. Two voice lines starting on the SAME
    // frame is an authoring mistake rather than a hand-off, and silencing one
    // of them by array position would hide it; they are left to both play so
    // the editor's warning is the thing that surfaces it.
    if (other.id === clip.id || other.from <= clip.from || !isVoice(other)) continue;
    if (next === undefined || other.from < next) next = other.from;
  }
  return next;
}

export type ResolvedAudioClip = {
  clip: AudioClip;
  from: number;
  /** Frames the clip is mounted, and therefore audible. */
  durationInFrames: number;
  /** Source-time frame to stop at, or undefined to play to the file's own end. */
  endAt?: number;
  /** Set when a following voice line cut this one short. */
  duckedBy?: string;
};

/**
 * Every audio clip's real playback window, in one place, so the composition and
 * the editor cannot disagree about when a line goes quiet.
 *
 * `totalDuration` is the composition length; a clip with no explicit
 * `durationInFrames` stays mounted to the end of the video and plays until its
 * own file runs out, which is why `endAt` is left unset for it — forcing the
 * transport past the file's end is the difference between "play this clip" and
 * "hold this clip's transport open for the rest of the video".
 */
export function resolveAudioClips(clips: AudioClip[], totalDuration: number, isVoice: (clip: AudioClip) => boolean = isVoiceClip): ResolvedAudioClip[] {
  return clips.flatMap((clip) => {
    if (clip.from >= totalDuration) return [];
    const startFrom = Math.max(0, clip.startFrom ?? 0);
    const window = totalDuration - clip.from;
    const requested = Math.min(clip.durationInFrames ?? window, window);

    const cutoff = voiceCutoffFrame(clips, clip, isVoice);
    const allowed = cutoff === undefined ? requested : Math.min(requested, Math.max(1, cutoff - clip.from));
    const durationInFrames = Math.max(1, allowed);
    const duckedBy = cutoff !== undefined && allowed < requested
      ? clips.find((other) => other.from === cutoff && isVoice(other))?.id
      : undefined;

    return [{
      clip,
      from: clip.from,
      durationInFrames,
      // An explicit length, or a duck, both mean a known end. Only the
      // "unset and uninterrupted" case has to let the file decide.
      // ONLY an explicit length sets `endAt`. A duck is enforced by the
      // `<Sequence>` unmounting, so it does not need one — and must not get
      // one: with no explicit length the duck window is "until the next voice
      // line", which can be twenty seconds away, and `endAt` that far out is
      // the difference between "play this clip" and "hold this clip's
      // transport open for the rest of the video".
      endAt: clip.durationInFrames !== undefined ? startFrom + durationInFrames : undefined,
      duckedBy,
    }];
  });
}
