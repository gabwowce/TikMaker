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
        // Unset `durationInFrames` is a real, common state — every freshly
        // generated voiceover starts this way on purpose (see
        // `VoiceoverGenerator`): the waveform decoder measures the file for the
        // TIMELINE, and nothing here needs to guess a number ahead of it. But
        // this renderer used the SAME "unset" as license to stretch the clip to
        // `duration - clip.from` — the rest of the entire video — and then told
        // `<Audio>` to keep requesting playback up to that point via `endAt`.
        // The container `<Sequence>` staying that long is harmless (Remotion
        // sequences don't have to match their content's real length), but
        // forcing `endAt` past the file's own end is not: it is the difference
        // between "play this clip" and "keep this clip's transport open for the
        // rest of the video," and a clip authored to run into the next cut had
        // no way to say "no further than my own audio."
        const hasExplicitEnd = clip.durationInFrames !== undefined;
        const clipDuration = Math.max(1, Math.min(clip.durationInFrames ?? (duration - clip.from), duration - clip.from));
        const startFrom = Math.max(0, clip.startFrom ?? 0);
        return src && clip.from < duration ? (
          <Sequence key={clip.id} from={clip.from} durationInFrames={clipDuration} layout="none" name={`audio:${clip.id}`}>
            <Audio
              src={src}
              volume={clip.volume ?? 1}
              playbackRate={clip.playbackRate ?? 1}
              startFrom={startFrom}
              endAt={hasExplicitEnd ? startFrom + clipDuration : undefined}
            />
          </Sequence>
        ) : null;
      })}
    </AbsoluteFill>
  );
};
