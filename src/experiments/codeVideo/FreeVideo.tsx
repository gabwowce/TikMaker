import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence } from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import type { VideoProject } from "../../schema/project";
import { computeSceneTimings, projectDurationInFrames } from "../../utils/duration";
import { resolveAudioClips } from "../../utils/voiceClips";
import { OfficialVideo } from "./generated-official/Video";
import { OnetakeVideo } from "./generated-onetake/Video";

// The free variant of the experiment: none of our design – no backdrop, no
// captions, no tokens. The generated component draws the WHOLE video as one
// piece (so its pictures can flow from one scene into the next); this shell
// only plays the voice and hands over when every scene and word is.

export type FreeScene = {
  index: number;
  from: number; // global frame the scene starts on
  durationInFrames: number;
  voiceover: string;
  // every spoken word, in GLOBAL frames
  words: { text: string; frame: number; endFrame: number }[];
};
export type FreeVideoProps = { scenes: FreeScene[]; durationInFrames: number };

const variants: Record<string, ComponentType<FreeVideoProps>> = {
  official: OfficialVideo,
  onetake: OnetakeVideo,
};

export function FreeVideo({
  project,
  variant,
}: {
  project: VideoProject;
  variant: string;
}) {
  const duration = projectDurationInFrames(project);
  const fps = project.fps;
  const clips = resolveAudioClips(project.audioClips ?? [], duration);
  const scenes: FreeScene[] = computeSceneTimings(project).map(
    ({ scene, from, durationInFrames }, index) => ({
      index,
      from,
      durationInFrames,
      voiceover: scene.vo ?? "",
      words: clips
        .filter((c) => c.from >= from && c.from < from + durationInFrames)
        .flatMap((c) =>
          (c.clip.words ?? []).map((w) => ({
            text: w.text,
            frame: Math.round(c.from + w.start * fps),
            endFrame: Math.round(c.from + w.end * fps),
          })),
        ),
    }),
  );
  const Video = variants[variant];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {Video ? <Video scenes={scenes} durationInFrames={duration} /> : null}
      {clips.map(({ clip, from, durationInFrames, endAt }) => {
        const src = getSfx(clip.sfxId)?.src;
        if (!src) return null;
        return (
          <Sequence key={clip.id} from={from} durationInFrames={durationInFrames} layout="none">
            <Audio src={src} startFrom={Math.max(0, clip.startFrom ?? 0)} endAt={endAt} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
