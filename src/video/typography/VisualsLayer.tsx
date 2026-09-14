import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { PositionedVisualEntry } from "../../schema/scene";
import { timelineLayerZIndex } from "../layout/layerOrder";
import { fitPositionedVisual } from "../layout/layoutPresets";
import { poseAtFrame } from "../layout/visualKeyframes";
import { naturalVisualSize } from "../layout/visualMetrics";
import { resolveExplicitSfx } from "../motion/sfxDefaults";
import { isFullBleedVisual } from "../visuals/isFullBleed";
import { AnimatedVisual } from "./AnimatedVisual";
import { videoDefaults } from "./tokens";
const EDGE_MARGIN = 40;
function offFrameDistance(
  edge: "left" | "right" | "top" | "bottom",
  entry: PositionedVisualEntry,
  pose: {
    x: number;
    y: number;
  },
  fit: number,
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
function entranceEdge(
  preset: PositionedVisualEntry["entrance"],
): "left" | "right" | "top" | "bottom" | undefined {
  switch (preset) {
    case "slideLeft":
      return "right";
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
function exitEdge(
  preset: PositionedVisualEntry["exit"],
): "left" | "right" | "top" | "bottom" | undefined {
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
function driftSeedFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) % 6283;
  return hash / 1000;
}
type VisualsLayerProps = {
  visuals?: PositionedVisualEntry[];
  durationSeconds: number;
  baseDelay?: number;
};
export function VisualsLayer({
  visuals,
  durationSeconds,
  baseDelay = 0,
}: VisualsLayerProps) {
  if (!visuals || visuals.length === 0) return null;
  return (
    <AbsoluteFill>
      {visuals.map((entry) => (
        <VisualLayerEntry
          key={entry.id}
          entry={entry}
          durationSeconds={durationSeconds}
          baseDelay={baseDelay}
        />
      ))}
    </AbsoluteFill>
  );
}
type VisualLayerEntryProps = {
  entry: PositionedVisualEntry;
  durationSeconds: number;
  baseDelay: number;
};
function VisualLayerEntry({
  entry,
  durationSeconds,
  baseDelay,
}: VisualLayerEntryProps) {
  const frame = useCurrentFrame();
  const backdrop = isFullBleedVisual(entry.visual);
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
        entry.entranceDistance ??
        (inEdge && !backdrop
          ? offFrameDistance(inEdge, entry, pose, fit)
          : undefined)
      }
      exitDistance={
        entry.exitDistance ??
        (outEdge && !backdrop
          ? offFrameDistance(outEdge, entry, pose, fit)
          : undefined)
      }
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
      ownScale={backdrop ? 1 : fit}
      driftSeed={driftSeedFor(entry.id)}
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
  if (backdrop)
    return (
      <AbsoluteFill style={{ zIndex: timelineLayerZIndex(entry.lane) }}>
        {animated}
      </AbsoluteFill>
    );
  return (
    <div
      className="absolute [transform:translate(-50%,_-50%)]"
      style={{
        left: `${pose.x}%`,
        top: `${pose.y}%`,
        zIndex: timelineLayerZIndex(entry.lane),
      }}
    >
      {animated}
    </div>
  );
}
