import { AbsoluteFill, Audio, Sequence } from "remotion";
import { getSfx } from "../registries/sfxRegistry";
import type { VideoProject } from "../schema/project";
import { projectDurationInFrames } from "../utils/duration";
import { resolveAudioClips } from "../utils/voiceClips";
import { SceneRenderer } from "./SceneRenderer";
import { ensureFontsLoaded } from "./typography/fonts";
type TikTokVideoProps = {
  project: VideoProject;
};
export function TikTokVideo({ project }: TikTokVideoProps) {
  ensureFontsLoaded();
  const duration = projectDurationInFrames(project);
  const resolved = resolveAudioClips(project.audioClips ?? [], duration);
  return (
    <AbsoluteFill className="bg-[#171717]">
      <SceneRenderer project={project} />
      {resolved.map(({ clip, from, durationInFrames, endAt }) => {
        const src = getSfx(clip.sfxId)?.src;
        if (!src) return null;
        const startFrom = Math.max(0, clip.startFrom ?? 0);
        return (
          <Sequence
            key={clip.id}
            from={from}
            durationInFrames={durationInFrames}
            layout="none"
            name={`audio:${clip.id}`}
          >
            <Audio
              src={src}
              volume={clip.volume ?? 1}
              playbackRate={clip.playbackRate ?? 1}
              startFrom={startFrom}
              endAt={endAt}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
