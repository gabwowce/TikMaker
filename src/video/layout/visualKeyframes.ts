import { interpolate } from "remotion";
import { pathEasing } from "../motion/easing";
import type { PositionedVisualEntry } from "../../schema/scene";

/**
 * Where a layer sits at a given frame, once its keyframes are taken into
 * account.
 *
 * Keyframes describe the RESTING pose over time. Everything else that moves a
 * layer — `entrance`, `exit`, `kenBurns`, a `link` glide — is a relative
 * transform layered on top of whatever this returns, which is why a layer can
 * slide in, travel a keyframed path, and fade out without any of the three
 * fighting over the same property.
 *
 * A React-free leaf on purpose, same reason as `visualMetrics`: the editor
 * reads it to draw the timeline and to decide which keyframe a slider edits,
 * and the renderer reads it per frame. Neither should have to reach through a
 * component to get an answer.
 */

export type VisualKeyframe = NonNullable<PositionedVisualEntry["keyframes"]>[number];

export type LayerPose = { x: number; y: number; scale?: number };

/** The layer's own single pose — what it had before keyframes existed, and the
 * fallback for any field a keyframe leaves out. */
export function basePose(entry: PositionedVisualEntry): LayerPose {
  return { x: entry.x, y: entry.y, scale: entry.scale };
}

/** Keyframes in play order. Authors add them at the playhead, so the array is
 * only sorted by accident; every reader wants them in time order. */
export function sortedKeyframes(entry: PositionedVisualEntry): VisualKeyframe[] {
  return [...(entry.keyframes ?? [])].sort((a, b) => a.frame - b.frame);
}

/** True when the layer actually follows a path rather than sitting still. One
 * keyframe is a pinned pose, not a move — it reads as "no keyframes" until a
 * second one gives it somewhere to go. */
export function hasKeyframePath(entry: PositionedVisualEntry): boolean {
  // Per TRACK: two position keyframes make a path even if scale never moves,
  // and the other way round. Counting the whole array would call "one position
  // keyframe plus one scale keyframe" a path, which it is in neither.
  return keyframesFor(entry, "position").length >= 2 || keyframesFor(entry, "scale").length >= 2;
}

/**
 * The properties a keyframe can pin, and which fields belong to each.
 *
 * Position is ONE property, not two: X and Y are a place, you move a layer TO
 * somewhere, and splitting them would mean two keyframes and two timings for a
 * single gesture. Scale is genuinely separate — growing a layer while it
 * travels is a different beat from the travel itself.
 */
export type KeyframeProperty = "position" | "scale";

export function keyframePins(keyframe: VisualKeyframe, property: KeyframeProperty): boolean {
  return property === "scale" ? keyframe.scale !== undefined : keyframe.x !== undefined || keyframe.y !== undefined;
}

/**
 * The keyframes that actually say something about ONE property, in time order.
 *
 * This is what makes the two tracks independent. Before it, every keyframe was
 * resolved against the layer's base pose for the fields it left out — so a
 * keyframe that only moved the layer also asserted "and the scale is the base
 * scale", and a scale keyframe dragged the position back to base. Two
 * properties could not be animated on different rhythms, which is the whole
 * point of having keyframes per property.
 */
export function keyframesFor(entry: PositionedVisualEntry, property: KeyframeProperty): VisualKeyframe[] {
  return sortedKeyframes(entry).filter((keyframe) => keyframePins(keyframe, property));
}

/**
 * Interpolates ONE track.
 *
 * Held flat before the first keyframe and after the last, and eased with
 * `pathEasing` inside each segment — symmetric, so the travel occupies the
 * WHOLE gap. Widen the gap and the same movement genuinely takes longer; that
 * is the entire contract of a keyframe pair, and an arrival curve breaks it by
 * finishing the move in the first tenth and standing still for the rest.
 */
function valueAt(
  keyframes: VisualKeyframe[],
  frame: number,
  read: (keyframe: VisualKeyframe) => number | undefined,
  fallback: number
): number {
  if (keyframes.length === 0) return fallback;
  const valueOf = (keyframe: VisualKeyframe) => read(keyframe) ?? fallback;
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (frame <= first.frame) return valueOf(first);
  if (frame >= last.frame) return valueOf(last);

  let index = 0;
  while (index < keyframes.length - 2 && keyframes[index + 1].frame <= frame) index++;
  const from = keyframes[index];
  const to = keyframes[index + 1];
  // Two keyframes on the same frame would make `interpolate` divide by zero.
  if (to.frame <= from.frame) return valueOf(to);

  return interpolate(frame, [from.frame, to.frame], [valueOf(from), valueOf(to)], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: pathEasing,
  });
}

/**
 * The pose at `frame` (scene-relative), resolved per property.
 *
 * Each track holds at its own ends, so a layer whose position is keyframed and
 * whose scale is not keeps the scale it was given, and a scale animation that
 * starts after the travel has finished does not drag the layer back.
 *
 * Every segment is eased rather than linear: a keyframe is a place the author
 * said to BE at, so arriving and departing softly reads as deliberate — the
 * same curve a linked visual's glide uses between two scenes.
 */
export function poseAtFrame(entry: PositionedVisualEntry, frame: number): LayerPose {
  const base = basePose(entry);
  const position = keyframesFor(entry, "position");
  const scale = keyframesFor(entry, "scale");
  if (position.length === 0 && scale.length === 0) return base;

  return {
    x: valueAt(position, frame, (keyframe) => keyframe.x, base.x),
    y: valueAt(position, frame, (keyframe) => keyframe.y, base.y),
    // Left undefined when nothing keyframes it, so a layer with no scale
    // keyframes keeps whatever its own `scale` (or auto-fit) decided.
    scale: scale.length === 0 ? base.scale : valueAt(scale, frame, (keyframe) => keyframe.scale, base.scale ?? 1),
  };
}

/**
 * The keyframe a position/scale edit at `frame` should land on: an existing one
 * on that exact frame, or nothing.
 *
 * The editor uses this to decide between editing a keyframe and editing the
 * layer's base pose. Dragging a keyframed layer at a moment with no keyframe
 * has to CREATE one — silently rewriting the base pose would move the whole
 * path, which is never what dragging one point means.
 */
export function keyframeAtFrame(entry: PositionedVisualEntry, frame: number): VisualKeyframe | undefined {
  return entry.keyframes?.find((keyframe) => keyframe.frame === frame);
}
