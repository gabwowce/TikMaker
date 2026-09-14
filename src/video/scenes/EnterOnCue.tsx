import { type CSSProperties, type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { EntrancePreset, Scene } from "../../schema/scene";
import { enter } from "../motion/entrances";
import { exitStyle } from "../motion/exits";
type EnterOnCueProps = {
  preset?: EntrancePreset;
  delay?: number;
  distance?: number;
  duration?: number;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
};
export function EnterOnCue({
  preset = "fade",
  delay = 0,
  distance,
  duration,
  children,
  style,
  className,
}: EnterOnCueProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motionStyle = enter(preset, {
    frame,
    fps,
    delay,
    distance,
    durationInFrames: duration,
  });
  return (
    <div className={className} style={{ ...style, ...motionStyle }}>
      {children}
    </div>
  );
}
const DEFAULT_STAGGER = 6;
export function sceneStartDelay(motion: Scene["motion"]): number {
  return motion?.startDelay ?? 0;
}
export function staggerDelay(
  index: number,
  stagger?: number,
  base = 0,
): number {
  return base + index * (stagger ?? DEFAULT_STAGGER);
}
export function useSceneExitStyle(
  durationSeconds: number,
  motion: Scene["motion"],
): CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return exitStyle(motion?.exit, {
    frame,
    durationInFrames: motion?.exitAt ?? durationSeconds * fps,
    exitDuration: motion?.exitDuration,
    distance: motion?.exitDistance,
  });
}
