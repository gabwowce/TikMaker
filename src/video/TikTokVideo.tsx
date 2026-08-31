import React from "react";
import { AbsoluteFill, Audio, Sequence } from "remotion";
import type { VideoProject } from "../schema/project";
import { SceneRenderer } from "./SceneRenderer";
import { colors } from "./typography/tokens";
import { ensureFontsLoaded } from "./typography/fonts";
import { getSfx } from "../registries/sfxRegistry";
import { projectDurationInFrames } from "../utils/duration";

export const TikTokVideo: React.FC<{ project: VideoProject }> = ({ project }) => {
  ensureFontsLoaded();
  const duration = projectDurationInFrames(project);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <SceneRenderer project={project} />
      {(project.audioClips ?? []).map((clip) => {
        const src = getSfx(clip.sfxId)?.src;
        const clipDuration = Math.max(1, Math.min(clip.durationInFrames ?? (duration - clip.from), duration - clip.from));
        const startFrom = Math.max(0, clip.startFrom ?? 0);
        return src && clip.from < duration ? (
          <Sequence key={clip.id} from={clip.from} durationInFrames={clipDuration} layout="none" name={`audio:${clip.id}`}>
            <Audio src={src} volume={clip.volume ?? 1} startFrom={startFrom} endAt={startFrom + clipDuration} />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};
