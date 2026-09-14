import { interpolate } from "remotion";
import type { PositionedVisualEntry } from "../../schema/scene";
import { pathEasing } from "../motion/easing";
export type VisualKeyframe = NonNullable<
  PositionedVisualEntry["keyframes"]
>[number];
export type LayerPose = {
  x: number;
  y: number;
  scale?: number;
};
export function basePose(entry: PositionedVisualEntry): LayerPose {
  return { x: entry.x, y: entry.y, scale: entry.scale };
}
export function sortedKeyframes(
  entry: PositionedVisualEntry,
): VisualKeyframe[] {
  return [...(entry.keyframes ?? [])].sort((a, b) => a.frame - b.frame);
}
export function hasKeyframePath(entry: PositionedVisualEntry): boolean {
  return (
    keyframesFor(entry, "position").length >= 2 ||
    keyframesFor(entry, "scale").length >= 2
  );
}
export type KeyframeProperty = "position" | "scale";
export function keyframePins(
  keyframe: VisualKeyframe,
  property: KeyframeProperty,
): boolean {
  return property === "scale"
    ? keyframe.scale !== undefined
    : keyframe.x !== undefined || keyframe.y !== undefined;
}
export function keyframesFor(
  entry: PositionedVisualEntry,
  property: KeyframeProperty,
): VisualKeyframe[] {
  return sortedKeyframes(entry).filter((keyframe) =>
    keyframePins(keyframe, property),
  );
}
function valueAt(
  keyframes: VisualKeyframe[],
  frame: number,
  read: (keyframe: VisualKeyframe) => number | undefined,
  fallback: number,
): number {
  if (keyframes.length === 0) return fallback;
  function valueOf(keyframe: VisualKeyframe) {
    return read(keyframe) ?? fallback;
  }
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (frame <= first.frame) return valueOf(first);
  if (frame >= last.frame) return valueOf(last);
  let index = 0;
  while (index < keyframes.length - 2 && keyframes[index + 1].frame <= frame)
    index++;
  const from = keyframes[index];
  const to = keyframes[index + 1];
  if (to.frame <= from.frame) return valueOf(to);
  return interpolate(
    frame,
    [from.frame, to.frame],
    [valueOf(from), valueOf(to)],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: pathEasing,
    },
  );
}
export function poseAtFrame(
  entry: PositionedVisualEntry,
  frame: number,
): LayerPose {
  const base = basePose(entry);
  const position = keyframesFor(entry, "position");
  const scale = keyframesFor(entry, "scale");
  if (position.length === 0 && scale.length === 0) return base;
  return {
    x: valueAt(position, frame, (keyframe) => keyframe.x, base.x),
    y: valueAt(position, frame, (keyframe) => keyframe.y, base.y),
    scale:
      scale.length === 0
        ? base.scale
        : valueAt(scale, frame, (keyframe) => keyframe.scale, base.scale ?? 1),
  };
}
export function keyframeAtFrame(
  entry: PositionedVisualEntry,
  frame: number,
): VisualKeyframe | undefined {
  return entry.keyframes?.find((keyframe) => keyframe.frame === frame);
}
