import type { VideoProject } from "../schema/project";
import type { SceneWord } from "../video/code/types";
import { resolveAudioClips } from "./voiceClips";
import { wordFrame } from "./voWords";
import { VO_WORDS_PER_SECOND } from "./pacing";

// Every spoken word of one scene, in frames from the scene's start – what a
// code scene times its picture by. From the voice clips that start inside the
// scene (the same timings the captions use); a scene with no voice yet gets
// its voiceover's words at the usual pace, so the picture still moves on them.
export function sceneWords(
  project: VideoProject,
  scene: { from: number; durationInFrames: number; vo?: string },
  totalFrames: number,
): SceneWord[] {
  const fps = project.fps;
  const end = scene.from + scene.durationInFrames;
  const words: SceneWord[] = [];
  for (const { clip, from } of resolveAudioClips(
    project.audioClips ?? [],
    totalFrames,
  )) {
    if (!clip.words?.length || from < scene.from || from >= end) continue;
    const startFrom = clip.startFrom ?? 0;
    const rate = clip.playbackRate ?? 1;
    const toFrame = (seconds: number) =>
      Math.round(from + (seconds * fps - startFrom) / rate) - scene.from;
    for (const word of clip.words)
      words.push({
        text: word.text,
        frame: toFrame(word.start),
        endFrame: toFrame(word.end),
      });
  }
  if (words.length) return words.sort((a, b) => a.frame - b.frame);
  const said = (scene.vo ?? "").split(/\s+/).filter(Boolean);
  const step = Math.round(fps / VO_WORDS_PER_SECOND);
  return said.map((text, i) => ({
    text,
    frame: wordFrame(i, fps),
    endFrame: wordFrame(i, fps) + step,
  }));
}
