import React from "react";
import { AbsoluteFill } from "remotion";
import { AnimatedVisual } from "./AnimatedVisual";
import { resolveExplicitSfx } from "../motion/sfxDefaults";
import { fitPositionedVisual } from "../layout/layoutPresets";
import { isFullBleedVisual } from "../visuals/isFullBleed";
import type { PositionedVisualEntry } from "../../schema/scene";

/** Stable per-layer phase for the cyclic "float" drift, hashed from the entry
 * id: two layers never move in lockstep, and a layer keeps its own rhythm when
 * the stack is reordered. */
function driftSeedFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 6283;
  return hash / 1000;
}

/** The scene's visual stack — every graphic in the scene, drawn in array order
 * so index 0 is the bottom layer and the last entry is on top. Each entry
 * carries its own position, scale, in/out animation, Ken Burns, SFX and
 * carry-across-the-cut link, so no visual is a special case with a different
 * set of controls. Coordinates match `BlockLayer`/`PositionedVisual` so the
 * editor's drag overlay works the same way for all of them. */
export const VisualsLayer: React.FC<{
  visuals?: PositionedVisualEntry[];
  durationSeconds: number;
  baseDelay?: number;
}> = ({
  visuals,
  durationSeconds,
  baseDelay = 0,
}) => {
  if (!visuals || visuals.length === 0) return null;

  return (
    <AbsoluteFill>
      {visuals.map((entry) => {
        // Orbit rings and corner props are compositions sized to the whole
        // frame — they draw their own geometry against the 1080x1920 canvas, so
        // pinning them to a point and scaling them would fight that. They fill
        // the frame and let the entry's animation settings still apply.
        const backdrop = isFullBleedVisual(entry.visual);

        const animated = (
          <AnimatedVisual
            visual={entry.visual}
            entrance={entry.entrance}
            entranceDelay={baseDelay + (entry.delay ?? 0)}
            exit={entry.exit}
            exitDuration={entry.exitDuration}
            entranceDistance={entry.entranceDistance}
            exitDistance={entry.exitDistance}
            kenBurns={entry.kenBurns}
            kenBurnsSpeed={entry.kenBurnsSpeed}
            durationSeconds={durationSeconds}
            sfx={resolveExplicitSfx(entry.sfx)}
            exitSfx={resolveExplicitSfx(entry.exitSfx)}
            // Derived from the entry id so two layers sharing the "float"
            // preset drift out of phase, and so a given layer's rhythm is
            // stable across reloads rather than depending on list order.
            driftSeed={driftSeedFor(entry.id)}
            // AnimatedVisual always puts a `transform` on its wrapper, and a
            // transformed element becomes the containing block for absolutely
            // positioned descendants. Left auto-sized, that wrapper collapses to
            // a zero-size box at the centre — so a full-bleed composition's own
            // AbsoluteFill measured against IT, not the canvas, and its 0,0
            // landed dead centre instead of the top-left corner. Stretching the
            // wrapper to the frame restores the canvas as the coordinate space;
            // the flex centering keeps content-sized compositions (an orbit
            // ring) exactly where they were.
            style={
              backdrop
                ? {
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }
                : undefined
            }
          />
        );

        if (backdrop) return <AbsoluteFill key={entry.id}>{animated}</AbsoluteFill>;

        return (
          <div
            key={entry.id}
            style={{
              position: "absolute",
              left: `${entry.x}%`,
              top: `${entry.y}%`,
              transform: `translate(-50%, -50%) scale(${fitPositionedVisual(entry.visual, entry.scale)})`,
            }}
          >
            {animated}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
