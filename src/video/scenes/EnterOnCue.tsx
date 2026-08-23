import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle } from "../motion/exits";
import type { EntrancePreset, Scene } from "../../schema/scene";

type EnterOnCueProps = {
  preset?: EntrancePreset;
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const EnterOnCue: React.FC<EnterOnCueProps> = ({ preset = "fade", delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motionStyle = enter(preset, { frame, fps, delay });

  return <div style={{ ...style, ...motionStyle }}>{children}</div>;
};

const DEFAULT_STAGGER = 6;

/** Frame delay for the Nth element in a scene, driven by motion.stagger so
 * internal timing is config-driven instead of hardcoded per scene. */
export function staggerDelay(index: number, stagger?: number): number {
  return index * (stagger ?? DEFAULT_STAGGER);
}

/** Style for a scene's whole content group leaving together in the final frames
 * before the scene ends — no-op (empty style) if `motion.exit` isn't set. */
export function useSceneExitStyle(durationSeconds: number, motion: Scene["motion"]): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return exitStyle(motion?.exit, {
    frame,
    durationInFrames: durationSeconds * fps,
    exitDuration: motion?.exitDuration,
  });
}
