import type { VideoProject } from "../../schema/project";
import { isVoiceClip } from "../../utils/voiceClips";
import { projectDurationInFrames } from "../../utils/duration";
import { resolveEntranceSfx, resolveExitSfx } from "../../video/motion/sfxDefaults";
import type { RuleCheck } from "./types";

// Sound effects in the whole video, counted the way the analysis did: every
// cue once, divided by the length, times 10. Counted: each scene's entrance
// and exit cue (including the automatic ones), each layer's in/out sound and
// every non-voice clip on the timeline. Per-word typing sounds are one
// continuous effect (see CLAUDE.md, Sound), so they are not counted per word.
export function countSfx(project: VideoProject): number {
  let count = 0;
  for (const scene of project.scenes) {
    const motion = scene.motion;
    if (resolveEntranceSfx({ override: motion?.sfx, entrance: motion?.entrance })) count++;
    if (motion?.exit && resolveExitSfx({ override: motion.exitSfx, exit: motion.exit })) count++;
    for (const layer of scene.content.visuals ?? []) {
      if (layer.sfx && layer.sfx !== "none") count++;
      if (layer.exit && layer.exitSfx && layer.exitSfx !== "none") count++;
    }
  }
  count += (project.audioClips ?? []).filter((clip) => !isVoiceClip(clip)).length;
  return count;
}

export const sfxPer10s: RuleCheck = (project, rule) => {
  const seconds = projectDurationInFrames(project) / project.fps;
  const perTen = (countSfx(project) / seconds) * 10;
  if (rule.max === undefined || perTen <= rule.max) return [];
  return [
    {
      ruleId: rule.id,
      level: rule.level,
      message: `${perTen.toFixed(1)} sound effects per 10 s, the limit is ${rule.max}. Keep sounds for the key moments.`,
    },
  ];
};
