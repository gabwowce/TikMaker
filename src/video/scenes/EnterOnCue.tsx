import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle } from "../motion/exits";
import type { EntrancePreset, Scene } from "../../schema/scene";

type EnterOnCueProps = {
  preset?: EntrancePreset;
  delay?: number;
  /** Travel distance (px) for a slide preset — pass `motion.entranceDistance`
   * so a scene can slide its content in from genuinely off-frame. */
  distance?: number;
  /** How long the entrance takes, in frames — pass `motion.entranceDuration`.
   * Unset = the preset's natural pace. */
  duration?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const EnterOnCue: React.FC<EnterOnCueProps> = ({ preset = "fade", delay = 0, distance, duration, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motionStyle = enter(preset, { frame, fps, delay, distance, durationInFrames: duration });

  return <div style={{ ...style, ...motionStyle }}>{children}</div>;
};

const DEFAULT_STAGGER = 6;

/**
 * Frames to wait before a scene starts animating its own content in.
 *
 * Scene transitions are presentation only. They must not inject hidden frames
 * into object timing; only the explicit author-controlled delay belongs here.
 */
export function sceneStartDelay(motion: Scene["motion"]): number {
  return motion?.startDelay ?? 0;
}

/** Frame delay for the Nth element in a scene, driven by motion.stagger so
 * internal timing is config-driven instead of hardcoded per scene. `base`
 * offsets the whole sequence — pass `sceneStartDelay(motion)` so content waits
 * for a slide transition to finish. */
export function staggerDelay(index: number, stagger?: number, base = 0): number {
  return base + index * (stagger ?? DEFAULT_STAGGER);
}

/** Style for a scene's whole content group leaving together in the final frames
 * before the scene ends — no-op (empty style) if `motion.exit` isn't set. */
export function useSceneExitStyle(durationSeconds: number, motion: Scene["motion"]): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return exitStyle(motion?.exit, {
    frame,
    durationInFrames: motion?.exitAt ?? durationSeconds * fps,
    exitDuration: motion?.exitDuration,
    distance: motion?.exitDistance,
  });
}
