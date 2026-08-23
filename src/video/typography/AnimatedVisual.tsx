import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import { VisualRenderer } from "../visuals/VisualRenderer";
import type { VisualConfig } from "../../schema/visual";
import type { EntrancePreset, ExitPreset } from "../../schema/scene";

type AnimatedVisualProps = {
  visual: VisualConfig;
  entrance?: EntrancePreset;
  entranceDelay?: number;
  exit?: ExitPreset;
  exitDuration?: number;
  durationSeconds: number;
  style?: React.CSSProperties;
};

/** Wraps a scene's visual with its OWN in/out animation, independent of the
 * rest of the scene's `motion.entrance`/`motion.exit` — every visual gets an
 * explicit, individually configurable entrance and exit. */
export const AnimatedVisual: React.FC<AnimatedVisualProps> = ({
  visual,
  entrance,
  entranceDelay = 0,
  exit,
  exitDuration,
  durationSeconds,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterStyle = enter(entrance ?? "scaleIn", { frame, fps, delay: entranceDelay });
  const exitResult = computeExitStyle(exit, {
    frame,
    durationInFrames: durationSeconds * fps,
    exitDuration,
  });

  const enterOpacity = typeof enterStyle.opacity === "number" ? enterStyle.opacity : 1;
  const exitOpacity = typeof exitResult.opacity === "number" ? exitResult.opacity : 1;
  const transform = `${enterStyle.transform ?? ""} ${exitResult.transform ?? ""}`.trim();

  return (
    <div style={{ ...style, opacity: enterOpacity * exitOpacity, transform: transform || undefined }}>
      <VisualRenderer visual={visual} />
    </div>
  );
};
