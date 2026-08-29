import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle } from "../motion/exits";
import { PUSH_FRAMES, isOverlappingTransition } from "../motion/transitions";
import type { EntrancePreset, Scene } from "../../schema/scene";

type EnterOnCueProps = {
  preset?: EntrancePreset;
  delay?: number;
  /** Travel distance (px) for a slide preset — pass `motion.entranceDistance`
   * so a scene can slide its content in from genuinely off-frame. */
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export const EnterOnCue: React.FC<EnterOnCueProps> = ({ preset = "fade", delay = 0, distance, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motionStyle = enter(preset, { frame, fps, delay, distance });

  return <div style={{ ...style, ...motionStyle }}>{children}</div>;
};

const DEFAULT_STAGGER = 6;

/**
 * Frames to wait before a scene starts animating its own content in.
 *
 * When the scene arrives on a slide transition, the whole frame is still
 * travelling for `PUSH_FRAMES`. Running the content's entrance during that
 * travel makes text fade/slide up while the frame itself is moving — two
 * unrelated motions at once, which reads as the content materialising
 * mid-flight. Holding until the frame lands means the slide and the content
 * animation are separate, legible beats.
 */
export function sceneStartDelay(motion: Scene["motion"]): number {
  return isOverlappingTransition(motion?.transition) ? PUSH_FRAMES : 0;
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
    durationInFrames: durationSeconds * fps,
    exitDuration: motion?.exitDuration,
    distance: motion?.exitDistance,
  });
}
