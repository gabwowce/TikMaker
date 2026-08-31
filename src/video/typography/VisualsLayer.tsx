import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { AnimatedVisual } from "./AnimatedVisual";
import { resolveExplicitSfx } from "../motion/sfxDefaults";
import { fitPositionedVisual } from "../layout/layoutPresets";
import { naturalVisualSize } from "../layout/visualMetrics";
import { poseAtFrame } from "../layout/visualKeyframes";
import { videoDefaults } from "./tokens";
import { isFullBleedVisual } from "../visuals/isFullBleed";
import type { PositionedVisualEntry } from "../../schema/scene";

/**
 * How far THIS layer has to travel to sit exactly off-frame, given where it
 * actually is and how big it actually is on screen.
 *
 * The generic `offFrameTravel` in `entrances.ts` has to assume the worst case
 * (a full canvas plus a margin) because it only knows the axis. Here we know
 * the layer's centre and its rendered size, so the distance can be the real
 * one — and that is what makes the DURATION slider mean something: over the
 * whole in/out window the element travels from its place to just past the edge,
 * instead of clearing the frame in the first three frames of a long window and
 * then sitting invisible off-screen for the rest of it, which reads as "the
 * duration does nothing".
 *
 * Directions follow the preset names: an `slideLeft` ENTRANCE comes in from the
 * right (see `slideOffset` in `entrances.ts`), while a `slideLeft` EXIT leaves
 * to the left — so each side measures to the opposite edge.
 */
const EDGE_MARGIN = 40;

function offFrameDistance(
  edge: "left" | "right" | "top" | "bottom",
  entry: PositionedVisualEntry,
  pose: { x: number; y: number },
  fit: number
): number {
  const size = naturalVisualSize(entry.visual);
  const halfWidth = (size.width * fit) / 2;
  const halfHeight = (size.height * fit) / 2;
  const centerX = (pose.x / 100) * videoDefaults.width;
  const centerY = (pose.y / 100) * videoDefaults.height;
  switch (edge) {
    case "left":
      return centerX + halfWidth + EDGE_MARGIN;
    case "right":
      return videoDefaults.width - centerX + halfWidth + EDGE_MARGIN;
    case "top":
      return centerY + halfHeight + EDGE_MARGIN;
    case "bottom":
      return videoDefaults.height - centerY + halfHeight + EDGE_MARGIN;
  }
}

/** The edge a slide preset measures against, per side. `undefined` for the
 * presets that don't travel — they ignore distance entirely. */
function entranceEdge(preset: PositionedVisualEntry["entrance"]): "left" | "right" | "top" | "bottom" | undefined {
  switch (preset) {
    case "slideLeft":
      return "right"; // enters FROM the right, moving left
    case "slideRight":
      return "left";
    case "slideUp":
      return "bottom";
    case "slideDown":
    case "dropIn":
      return "top";
    case "rollIn":
      return "left";
    default:
      return undefined;
  }
}

function exitEdge(preset: PositionedVisualEntry["exit"]): "left" | "right" | "top" | "bottom" | undefined {
  switch (preset) {
    case "slideLeft":
      return "left";
    case "slideRight":
    case "rollOut":
      return "right";
    case "slideUp":
      return "top";
    case "slideDown":
    case "dropOut":
      return "bottom";
    default:
      return undefined;
  }
}

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
}> = ({ visuals, durationSeconds, baseDelay = 0 }) => {
  if (!visuals || visuals.length === 0) return null;

  return (
    <AbsoluteFill>
      {visuals.map((entry) => (
        <VisualLayerEntry key={entry.id} entry={entry} durationSeconds={durationSeconds} baseDelay={baseDelay} />
      ))}
    </AbsoluteFill>
  );
};

/** One layer. A component rather than an inline `.map` body because the pose
 * is now time-dependent (`poseAtFrame`), and reading the frame needs a hook. */
const VisualLayerEntry: React.FC<{
  entry: PositionedVisualEntry;
  durationSeconds: number;
  baseDelay: number;
}> = ({ entry, durationSeconds, baseDelay }) => {
  const frame = useCurrentFrame();

  // Orbit rings and corner props are compositions sized to the whole frame —
  // they draw their own geometry against the 1080x1920 canvas, so pinning them
  // to a point and scaling them would fight that. They fill the frame and let
  // the entry's animation settings still apply.
  const backdrop = isFullBleedVisual(entry.visual);

  // Keyframes move the RESTING pose; entrance/exit/Ken Burns are relative
  // transforms layered on top of wherever that pose currently is.
  const pose = poseAtFrame(entry, frame);
  const fit = fitPositionedVisual(entry.visual, pose.scale);
  const inEdge = entranceEdge(entry.entrance);
  const outEdge = exitEdge(entry.exit);

  const animated = (
    <AnimatedVisual
      visual={entry.visual}
      entrance={entry.entrance}
      entranceDelay={baseDelay + (entry.delay ?? 0)}
      exit={entry.exit}
      entranceDuration={entry.entranceDuration}
      exitDuration={entry.exitDuration}
      exitAt={entry.exitAt}
      entranceDistance={
        entry.entranceDistance ?? (inEdge && !backdrop ? offFrameDistance(inEdge, entry, pose, fit) : undefined)
      }
      exitDistance={entry.exitDistance ?? (outEdge && !backdrop ? offFrameDistance(outEdge, entry, pose, fit) : undefined)}
      kenBurns={entry.kenBurns}
      kenBurnsSpeed={entry.kenBurnsSpeed}
      durationSeconds={durationSeconds}
      sfx={resolveExplicitSfx(entry.sfx)}
      exitSfx={resolveExplicitSfx(entry.exitSfx)}
      sfxAt={entry.sfxAt}
      exitSfxAt={entry.exitSfxAt}
      sfxStartFrom={entry.sfxStartFrom}
      sfxDuration={entry.sfxDuration}
      exitSfxStartFrom={entry.exitSfxStartFrom}
      exitSfxDuration={entry.exitSfxDuration}
      // The layer's scale belongs HERE, not on the positioning wrapper. A
      // `transform: scale(2.8)` on the parent scales its children's coordinate
      // system too, so a 1280px exit slide was really moving 3584px on screen —
      // the visual left the frame in three frames and stretching the OUT
      // duration only lengthened the time it spent invisible off-screen.
      // `AnimatedVisual` composes `… scale(ownScale)` LAST, and a translate
      // written to the left of a scale is not multiplied by it, so travel
      // distances stay canvas pixels.
      ownScale={backdrop ? 1 : fit}
      // Derived from the entry id so two layers sharing the "float" preset
      // drift out of phase, and so a given layer's rhythm is stable across
      // reloads rather than depending on list order.
      driftSeed={driftSeedFor(entry.id)}
      // AnimatedVisual always puts a `transform` on its wrapper, and a
      // transformed element becomes the containing block for absolutely
      // positioned descendants. Left auto-sized, that wrapper collapses to a
      // zero-size box at the centre — so a full-bleed composition's own
      // AbsoluteFill measured against IT, not the canvas, and its 0,0 landed
      // dead centre instead of the top-left corner. Stretching the wrapper to
      // the frame restores the canvas as the coordinate space; the flex
      // centering keeps content-sized compositions (an orbit ring) exactly
      // where they were.
      style={
        backdrop
          ? { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }
          : undefined
      }
    />
  );

  if (backdrop) return <AbsoluteFill>{animated}</AbsoluteFill>;

  return (
    <div
      style={{
        position: "absolute",
        left: `${pose.x}%`,
        top: `${pose.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {animated}
    </div>
  );
};
