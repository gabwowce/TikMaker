import { AbsoluteFill, Audio, Sequence } from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import type { VideoProject } from "../../schema/project";
import {
  computeSceneTimings,
  projectDurationInFrames,
} from "../../utils/duration";
import { resolveAudioClips } from "../../utils/voiceClips";
import { Backdrop } from "../../video/stage/Backdrop";
import { PackProvider } from "../../video/stage/pack";
import { CaptionLayer } from "../../video/typography/CaptionLayer";
import { ensureFontsLoaded } from "../../video/typography/fonts";
import type { FreeScene } from "./FreeVideo";
import { BrandVideoBody } from "./generated-brand/Video";

// Test 4 of the experiment: the official Remotion skill + the explainer motion
// skill + the channel's brand kit. Ours: the backdrop, the kinetic captions,
// the voice, the colours and the font (brand/kit.tsx). The generated component
// draws the whole picture as one piece, above the caption band.
export function BrandVideo({ project }: { project: VideoProject }) {
  ensureFontsLoaded();
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
  return (
    <PackProvider>
      <AbsoluteFill className="bg-[#171717]">
        <Backdrop />
        <BrandVideoBody scenes={scenes} durationInFrames={duration} />
        <CaptionLayer project={project} />
        {clips.map(({ clip, from, durationInFrames, endAt }) => {
          const src = getSfx(clip.sfxId)?.src;
          if (!src) return null;
          return (
            <Sequence
              key={clip.id}
              from={from}
              durationInFrames={durationInFrames}
              layout="none"
            >
              <Audio
                src={src}
                startFrom={Math.max(0, clip.startFrom ?? 0)}
                endAt={endAt}
              />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </PackProvider>
  );
}
