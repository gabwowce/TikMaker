import React from "react";
import { Audio, Sequence, useVideoConfig } from "remotion";
import { getSfx } from "../../registries/sfxRegistry";
import { resolveEntranceSfx, resolveExitSfx, SFX_VOLUME } from "./sfxDefaults";
import type { Scene } from "../../schema/scene";

type SceneSfxProps = {
  motion: Scene["motion"];
  durationSeconds: number;
};

const CUE_WINDOW_FRAMES = 30;

/** Plays the whole-scene entrance/exit sound cue once per scene — one line
 * dropped into every scene component alongside `BlockLayer`/`VisualsLayer`.
 * Derived automatically from `motion.entrance`/`motion.exit` unless
 * `motion.sfx`/`motion.exitSfx` override or silence it (`"none"`). The
 * scene-to-scene cut itself (`motion.transition`) is deliberately silent —
 * only the entrance preset drives the cue. Fires once per scene rather than
 * per-element (badge/eyebrow/headline share one cue) so it can't stack into
 * overlapping noise — see the Sound section in CLAUDE.md. */
export const SceneSfx: React.FC<SceneSfxProps> = ({ motion, durationSeconds }) => {
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(durationSeconds * fps);

  const entranceId = resolveEntranceSfx({ override: motion?.sfx, entrance: motion?.entrance });
  const exitId = motion?.exit ? resolveExitSfx({ override: motion?.exitSfx, exit: motion.exit }) : undefined;
  const effectiveEnd = Math.min(durationInFrames, motion?.exitAt ?? durationInFrames);
  const entranceFrame = Math.max(0, motion?.sfxAt ?? motion?.startDelay ?? 0);
  const exitFrame = motion?.exit ? Math.max(0, motion?.exitSfxAt ?? (effectiveEnd - (motion.exitDuration ?? 18))) : 0;

  const entranceSrc = entranceId ? getSfx(entranceId)?.src : undefined;
  const exitSrc = exitId ? getSfx(exitId)?.src : undefined;
  const entranceStartFrom = Math.max(0, motion?.sfxStartFrom ?? 0);
  const entranceDuration = Math.min(motion?.sfxDuration ?? CUE_WINDOW_FRAMES, Math.max(1, durationInFrames - entranceFrame));
  const exitStartFrom = Math.max(0, motion?.exitSfxStartFrom ?? 0);
  const exitDuration = Math.min(motion?.exitSfxDuration ?? CUE_WINDOW_FRAMES, Math.max(1, durationInFrames - exitFrame));

  return (
    <>
      {entranceSrc ? (
        <Sequence from={entranceFrame} durationInFrames={entranceDuration} layout="none">
          <Audio src={entranceSrc} volume={SFX_VOLUME} startFrom={entranceStartFrom} endAt={entranceStartFrom + entranceDuration} />
        </Sequence>
      ) : null}
      {exitSrc ? (
        <Sequence
          from={exitFrame}
          durationInFrames={exitDuration}
          layout="none"
        >
          <Audio src={exitSrc} volume={SFX_VOLUME} startFrom={exitStartFrom} endAt={exitStartFrom + exitDuration} />
        </Sequence>
      ) : null}
    </>
  );
};
