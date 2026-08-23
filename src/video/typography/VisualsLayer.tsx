import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedVisual } from "./AnimatedVisual";
import type { PositionedVisualEntry } from "../../schema/scene";

/** A freeform layer of independently positioned, scaled and animated visuals —
 * the image/graphic counterpart to `BlockLayer`'s text/badge blocks. Any number
 * of these can be added to any scene, on top of that scene's own primary
 * `visual`. Coordinates match `BlockLayer`/`PositionedVisual` so the editor's
 * drag overlay works the same way for all three. */
export const VisualsLayer: React.FC<{ visuals?: PositionedVisualEntry[]; durationSeconds: number }> = ({
  visuals,
  durationSeconds,
}) => {
  if (!visuals || visuals.length === 0) return null;

  return (
    <AbsoluteFill>
      {visuals.map((entry) => (
        <div
          key={entry.id}
          style={{
            position: "absolute",
            left: `${entry.x}%`,
            top: `${entry.y}%`,
            transform: `translate(-50%, -50%) scale(${entry.scale ?? 1})`,
          }}
        >
          <AnimatedVisual
            visual={entry.visual}
            entrance={entry.entrance}
            entranceDelay={entry.delay}
            exit={entry.exit}
            exitDuration={entry.exitDuration}
            durationSeconds={durationSeconds}
          />
        </div>
      ))}
    </AbsoluteFill>
  );
};
