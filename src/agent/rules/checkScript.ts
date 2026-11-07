import type { DesignRule } from "../knowledge";
import type { ScriptFromAi, ScriptProblem, SceneFromAi } from "../run/3-script";
import {
  MIN_SCENE_SECONDS,
  READ_WORDS_PER_SECOND,
  voDurationSeconds,
} from "../../utils/pacing";

// FR-09: the script checked by code, no AI — every scene the template needs
// is there, the video is not much longer than asked for, and no scene puts
// too many words on screen. A problem found here is sent back to the model
// once; what is still wrong after that is shown to the user.

// How far past the wanted length the script may run.
export const MAX_OVER_TARGET = 0.15;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// How long a scene will take: the longer of speaking its voiceover and
// reading its on-screen text, never under the floor — the same reasoning as
// resolveSceneDuration (src/utils/pacing.ts) uses for a real scene.
export function sceneSeconds(scene: SceneFromAi): number {
  return Math.max(
    MIN_SCENE_SECONDS,
    voDurationSeconds(scene.voiceover),
    wordCount(scene.onScreen) / READ_WORDS_PER_SECOND,
  );
}

export function checkScript(
  script: ScriptFromAi,
  targetSeconds: number,
  rules: DesignRule[],
): ScriptProblem[] {
  const problems: ScriptProblem[] = [];

  // The whole video, at most 15 % over the wanted length.
  const total = script.scenes.reduce((sum, s) => sum + sceneSeconds(s), 0);
  const limit = targetSeconds * (1 + MAX_OVER_TARGET);
  if (total > limit)
    problems.push({
      message: `About ${Math.round(total)} s long, more than ${Math.round(limit)} s (${targetSeconds} s + 15 %)`,
    });

  // One scene, one thought: a scene longer than the knowledge base's limit
  // carries more than one picture can show, so it is split in two – the
  // blocks step otherwise crams two diagrams into one frame to keep up.
  const maxScene = rules.find((rule) => rule.check === "sceneSeconds")?.max;
  const maxHook = rules.find((rule) => rule.check === "hookSeconds")?.max;
  script.scenes.forEach((scene, sceneIndex) => {
    const max = sceneIndex === 0 ? maxHook : maxScene;
    if (max === undefined) return;
    const seconds = voDurationSeconds(scene.voiceover);
    if (seconds > max)
      problems.push({
        sceneIndex,
        message: `Scene ${sceneIndex + 1}: its voiceover takes about ${seconds.toFixed(1)} s, the limit is ${max} s – it says more than one thought; split it into two scenes, one thought each (or say it shorter)`,
      });
  });

  // Words on screen, by the knowledge base's own limit.
  const maxWords = rules.find(
    (rule) => rule.check === "onScreenWordsPerScene",
  )?.max;
  if (maxWords !== undefined)
    script.scenes.forEach((scene, sceneIndex) => {
      const words = wordCount(scene.onScreen);
      if (words > maxWords)
        problems.push({
          sceneIndex,
          message: `Scene ${sceneIndex + 1}: ${words} words on screen, the limit is ${maxWords}`,
        });
    });

  return problems;
}
