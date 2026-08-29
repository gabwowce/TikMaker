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
  const exitFrame = motion?.exit ? Math.max(0, durationInFrames - (motion.exitDuration ?? 18)) : 0;

  const entranceSrc = entranceId ? getSfx(entranceId)?.src : undefined;
  const exitSrc = exitId ? getSfx(exitId)?.src : undefined;

  return (
    <>
      {entranceSrc ? (
        <Sequence from={0} durationInFrames={Math.min(CUE_WINDOW_FRAMES, durationInFrames)} layout="none">
          <Audio src={entranceSrc} volume={SFX_VOLUME} />
        </Sequence>
      ) : null}
      {exitSrc ? (
        <Sequence
          from={exitFrame}
          durationInFrames={Math.min(CUE_WINDOW_FRAMES, Math.max(1, durationInFrames - exitFrame))}
          layout="none"
        >
          <Audio src={exitSrc} volume={SFX_VOLUME} />
        </Sequence>
      ) : null}
    </>
  );
};
