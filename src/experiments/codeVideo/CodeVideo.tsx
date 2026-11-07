import { AbsoluteFill, Audio, Sequence } from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import type { VideoProject } from "../../schema/project";
import { computeSceneTimings, projectDurationInFrames } from "../../utils/duration";
import { resolveAudioClips } from "../../utils/voiceClips";
import { Backdrop } from "../../video/stage/Backdrop";
import { PackProvider } from "../../video/stage/pack";
import { CaptionLayer } from "../../video/typography/CaptionLayer";
import { ensureFontsLoaded } from "../../video/typography/fonts";
import { generatedScenes } from "./generated";
import type { SceneWord } from "./types";

// The same video as TikTokVideo – voice, kinetic captions, the stage
// backdrop – with every scene's picture coming from generated code
// (./generated) instead of the agent's blocks.
export function CodeVideo({ project }: { project: VideoProject }) {
  ensureFontsLoaded();
  const duration = projectDurationInFrames(project);
  const fps = project.fps;
  const timings = computeSceneTimings(project);
  const clips = resolveAudioClips(project.audioClips ?? [], duration);
  // the words of the voice clip that starts in a scene, in that scene's frames
  const wordsOf = (from: number, length: number): SceneWord[] =>
    clips
      .filter(({ from: at }) => at >= from && at < from + length)
      .flatMap(({ clip, from: at }) =>
        (clip.words ?? []).map((w) => ({
          text: w.text,
          frame: Math.round(at - from + w.start * fps),
          endFrame: Math.round(at - from + w.end * fps),
        })),
      );
  return (
    <PackProvider>
      <AbsoluteFill className="bg-[#171717]">
        <Backdrop />
        {timings.map(({ scene, from, durationInFrames }, index) => {
          const Scene = generatedScenes[index];
          if (!Scene) return null;
          return (
            <Sequence
              key={scene.id}
              from={from}
              durationInFrames={durationInFrames}
              name={`scene ${index + 1}`}
            >
              <Scene
                index={index}
                durationInFrames={durationInFrames}
                voiceover={scene.vo ?? ""}
                words={wordsOf(from, durationInFrames)}
              />
            </Sequence>
          );
        })}
        <CaptionLayer project={project} />
        {clips.map(({ clip, from, durationInFrames, endAt }) => {
          const src = getSfx(clip.sfxId)?.src;
          if (!src) return null;
          return (
            <Sequence key={clip.id} from={from} durationInFrames={durationInFrames} layout="none">
              <Audio src={src} volume={clip.volume ?? 1} startFrom={Math.max(0, clip.startFrom ?? 0)} endAt={endAt} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </PackProvider>
  );
}
