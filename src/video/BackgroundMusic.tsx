import { useMemo } from "react";
import { Audio, useCurrentFrame, useVideoConfig } from "remotion";
import { getSfx } from "../registries/sfxRegistry";
import type { VideoProject } from "../schema/project";
import { musicVolumeAt, voiceRanges } from "../utils/music";

type BackgroundMusicProps = {
  project: VideoProject;
  duration: number;
};
// The track runs for the whole video: `loop` covers a song shorter than the
// video, the composition's own end cuts a longer one, and musicVolumeAt fades
// both ends and ducks under the voiceover.
export function BackgroundMusic({ project, duration }: BackgroundMusicProps) {
  // The video's own frame, not the track's: with `loop` Remotion restarts the
  // media's clock every lap, and ducking/fades must follow the video.
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const music = project.music;
  const speech = useMemo(
    () => voiceRanges(project.audioClips ?? [], duration, fps),
    [project.audioClips, duration, fps],
  );
  const src = music ? getSfx(music.sfxId)?.src : undefined;
  if (!music || !src) return null;
  return (
    <Audio
      src={src}
      loop
      startFrom={music.startFrom ?? 0}
      volume={musicVolumeAt(frame, duration, speech, music)}
      name="music"
    />
  );
}
