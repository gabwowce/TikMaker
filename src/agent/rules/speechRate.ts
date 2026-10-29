import { computeSceneTimings } from "../../utils/duration";
import { isVoiceClip } from "../../utils/voiceClips";
import type { RuleCheck } from "./types";

// Words per second while the voiceover actually speaks: from the first word to
// the last, using the word times ElevenLabs returned (the same ones captions
// use). A clip without word times is skipped: there is nothing to measure.
export const voiceWordsPerSecond: RuleCheck = (project, rule) => {
  const timings = computeSceneTimings(project);
  return (project.audioClips ?? []).flatMap((clip) => {
    const words = clip.words;
    if (!isVoiceClip(clip) || !words || words.length < 2) return [];
    const sourceSeconds = words[words.length - 1].end - words[0].start;
    const seconds = sourceSeconds / (clip.playbackRate ?? 1);
    if (seconds <= 0) return [];
    const rate = words.length / seconds;
    if (rule.max === undefined || rate <= rule.max) return [];
    const scene = timings.find(
      ({ from, durationInFrames }) => clip.from >= from && clip.from < from + durationInFrames,
    )?.scene;
    return [
      {
        ruleId: rule.id,
        sceneId: scene?.id,
        level: rule.level,
        message: `Voiceover speaks ${rate.toFixed(1)} words per second, the limit is ${rule.max}. Shorten the line or slow the voice.`,
      },
    ];
  });
};
