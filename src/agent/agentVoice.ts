import type { VideoProject } from "../schema/project";
import type { SceneVoice } from "./run/4-voice";
import { computeSceneTimings } from "../utils/duration";
import type { AgentRun } from "./run/run";

// 4 Voice in the editor: the agent's voiceover (run.voice, one clip per
// scene) goes into the project. Each scene is as long as its voice says it
// is, and each clip sits under its scene with its word timings – which is
// what the captions are drawn from (CaptionLayer).

// Silence after a scene's last word before the cut.
const TAIL_SECONDS = 0.35;

// How long a voiced scene is: up to the end of its last word, plus the tail.
export function voicedSceneSeconds(voice: SceneVoice): number {
  return (voice.words[voice.words.length - 1]?.end ?? 0) + TAIL_SECONDS;
}

// The agent's scenes, timed to their voiceover, with the clips laid under
// them. Safe to call again: the agent's own clips are replaced, not added
// twice, and everything else in the project is left as it is.
export function withAgentVoice(
  project: VideoProject,
  run: AgentRun,
): VideoProject {
  const voices = run.voice?.scenes;
  if (!voices?.length) return project;
  const sceneId = (n: number) => `scene-${run.id}-${n + 1}`;
  const voiceOf = (id: string) => voices.find((_, n) => sceneId(n) === id);

  const scenes = project.scenes.map((scene) => {
    const voice = voiceOf(scene.id);
    if (!voice || !voice.words.length) return scene;
    return {
      ...scene,
      durationSeconds: voicedSceneSeconds(voice),
    };
  });
  const timed = { ...project, scenes };

  const clipPrefix = `audio-${run.id}-`;
  const clips = computeSceneTimings(timed).flatMap(
    ({ scene, from, durationInFrames }) => {
      const voice = voiceOf(scene.id);
      if (!voice) return [];
      return [
        {
          id: `${clipPrefix}${scene.id}`,
          sfxId: voice.sfxId,
          from,
          durationInFrames,
          volume: 1,
          voiceText: scene.vo,
          words: voice.words,
        },
      ];
    },
  );
  return {
    ...timed,
    audioClips: [
      ...(project.audioClips ?? []).filter(
        (clip) => !clip.id.startsWith(clipPrefix),
      ),
      ...clips,
    ],
  };
}
