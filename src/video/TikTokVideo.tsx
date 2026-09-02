import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate } from "remotion";
import type { VideoProject } from "../schema/project";
import { SceneRenderer } from "./SceneRenderer";
import { colors } from "./typography/tokens";
import { ensureFontsLoaded } from "./typography/fonts";
import { getSfx } from "../registries/sfxRegistry";
import { projectDurationInFrames } from "../utils/duration";
import { resolveAudioClips, VOICE_DUCK_FADE_FRAMES } from "../utils/voiceClips";

export const TikTokVideo: React.FC<{ project: VideoProject }> = ({ project }) => {
  ensureFontsLoaded();
  const duration = projectDurationInFrames(project);

  // Playback windows come from `resolveAudioClips`, which also applies the
  // monophonic-voice rule — see `utils/voiceClips.ts` for why that is decided
  // here rather than trimmed into the project data. Everything that is not a
  // voice line keeps overlapping and overrunning its scene exactly as before.
  const resolved = resolveAudioClips(project.audioClips ?? [], duration);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <SceneRenderer project={project} />
      {resolved.map(({ clip, from, durationInFrames, endAt, duckedBy }) => {
        const src = getSfx(clip.sfxId)?.src;
        if (!src) return null;
        const startFrom = Math.max(0, clip.startFrom ?? 0);
        const level = clip.volume ?? 1;
        // A ducked line is being stopped mid-sentence, so it has to fade rather
        // than end — a hard cut on speech is a click, which is more noticeable
        // than the overlap this is removing.
        const fade = Math.min(VOICE_DUCK_FADE_FRAMES, durationInFrames);
        const volume = duckedBy
          ? (frame: number) => level * interpolate(frame, [durationInFrames - fade, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          : level;
        return (
          <Sequence key={clip.id} from={from} durationInFrames={durationInFrames} layout="none" name={`audio:${clip.id}`}>
            <Audio
              src={src}
              volume={volume}
              playbackRate={clip.playbackRate ?? 1}
              startFrom={startFrom}
              endAt={endAt}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
