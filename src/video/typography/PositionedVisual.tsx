import React from "react";
import { AnimatedVisual } from "./AnimatedVisual";
import type { VisualConfig } from "../../schema/visual";
import type { EntrancePreset, ExitPreset, VisualPosition } from "../../schema/scene";

type PositionedVisualProps = {
  visual: VisualConfig;
  position: VisualPosition;
  entrance?: EntrancePreset;
  entranceDelay?: number;
  exit?: ExitPreset;
  exitDuration?: number;
  durationSeconds: number;
};

/** Renders a scene's main visual pinned to an explicit x/y point on the full
 * 1080x1920 canvas (percentages), instead of the default centered flex flow —
 * used when `scene.visualPosition` is set. Coordinates match `BlockLayer`'s
 * system so the editor's drag overlay works the same way for both. */
export const PositionedVisual: React.FC<PositionedVisualProps> = ({
  visual,
  position,
  entrance,
  entranceDelay = 0,
  exit,
  exitDuration,
  durationSeconds,
}) => (
  <div
    style={{
      position: "absolute",
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: "translate(-50%, -50%)",
    }}
  >
    <AnimatedVisual
      visual={visual}
      entrance={entrance}
      entranceDelay={entranceDelay}
      exit={exit}
      exitDuration={exitDuration}
      durationSeconds={durationSeconds}
    />
  </div>
);
