import soundKit from "../../knowledge/shared/sound-kit.json";
import type { VideoProject } from "../schema/project";
import { computeSceneTimings, projectDurationInFrames } from "../utils/duration";
import { sceneWords } from "../utils/sceneWords";
import { spokenWords } from "../utils/voWords";
import type { SoundKind } from "./run/5-pictures";
import type { AgentRun } from "./run/run";

// Sound effects of the agent's code scenes (docs/tikmaker-kryptis.md): the
// agent marks the moments in its answer ("on 'undo' – whoosh"); this turns
// them into ordinary sound clips on the timeline, from the library (sfx/), so
// the creator sees, moves, mutes or deletes them like any other clip. The
// agent never plays sound inside its code – it could not be edited, and it
// cannot hear how loud a file is.

// Which library sound each kind is, and how loud – the channel's sound kit
// (knowledge/shared/sound-kit.json), changed without code.
type KitLine = { sfx: string; volume: number };
const kit = (soundKit as { kinds: Record<string, KitLine> }).kinds;
export const SOUND_FILES = Object.fromEntries(
  Object.entries(kit).map(([kind, line]) => [kind, line.sfx]),
) as Record<SoundKind, string>;
const volumeOf = (kind: SoundKind) => kit[kind]?.volume ?? 0.5;

// What the agent is told each kind is for.
export const SOUND_USES: Record<SoundKind, string> = {
  whoosh: "a big move: the main object flies in, swaps or morphs",
  slide: "a card or window slides in or aside",
  pop: "something small appears (an icon, a badge, a sticker)",
  enter: "a solid thing lands (a card, a big number)",
  ping: "attention on one thing (the focus lights up)",
  tick: "a small step (one of several items marks)",
  count: "a counter runs up",
  success: "it works: the payoff, a green check",
  fix: "a fix clicks in",
  break: "something breaks, fails, gets locked",
  type: "a command is typed (one short burst)",
  message: "a chat bubble arrives",
  reveal: "a build-up to a reveal (use once a video at most)",
  check: "a check mark",
};

// A sound starts a hair before its word, as the picture does.
const LEAD_FRAMES = 2;

const clipPrefix = (runId: string, n: number) => `sfx-${runId}-${n + 1}-`;

// The project with the agent's sound clips for its scenes – all of them, or
// only scene `only` (a scene written again). Clips of other scenes, and every
// clip the creator added, stay as they are.
export function withSoundCues(
  project: VideoProject,
  run: AgentRun,
  only?: number,
): VideoProject {
  const code = run.code;
  if (!code) return project;
  const total = projectDurationInFrames(project);
  const timings = computeSceneTimings(project);
  const rebuilt = (n: number) => only === undefined || only === n;
  const clips = code.scenes.flatMap((scene, n) => {
    if (!rebuilt(n) || !scene.sounds?.length) return [];
    const timing = timings.find((t) => t.scene.id === `scene-${run.id}-${n + 1}`);
    if (!timing) return [];
    const words = sceneWords(
      project,
      { from: timing.from, durationInFrames: timing.durationInFrames, vo: timing.scene.vo },
      total,
    );
    return scene.sounds.flatMap((cue, i) => {
      const target = spokenWords(cue.onWord)[0];
      const word = words.find((w) => target && spokenWords(w.text).includes(target));
      if (!word) return [];
      return [
        {
          id: `${clipPrefix(run.id, n)}${i + 1}`,
          sfxId: SOUND_FILES[cue.sound],
          from: Math.max(timing.from, timing.from + word.frame - LEAD_FRAMES),
          volume: volumeOf(cue.sound),
          lane: 1,
        },
      ];
    });
  });
  const kept = (project.audioClips ?? []).filter(
    (clip) =>
      !code.scenes.some(
        (_, n) => rebuilt(n) && clip.id.startsWith(clipPrefix(run.id, n)),
      ),
  );
  return { ...project, audioClips: [...kept, ...clips] };
}
