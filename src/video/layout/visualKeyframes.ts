import { interpolate } from "remotion";
import { standardEasing } from "../motion/easing";
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
  return (entry.keyframes?.length ?? 0) >= 2;
}

function resolve(keyframe: VisualKeyframe, base: LayerPose): LayerPose {
  return {
    x: keyframe.x ?? base.x,
    y: keyframe.y ?? base.y,
    scale: keyframe.scale ?? base.scale,
  };
}

/**
 * The pose at `frame` (scene-relative). Holds the first keyframe before the
 * path starts and the last one after it ends — a layer is on screen for longer
 * than its path, and extrapolating past the ends would send it drifting off to
 * nowhere.
 *
 * Each segment is eased rather than linear: a keyframe is a place the author
 * said to BE at, so arriving and departing softly reads as deliberate, the same
 * curve a linked visual's glide already uses between two scenes.
 */
export function poseAtFrame(entry: PositionedVisualEntry, frame: number): LayerPose {
  const base = basePose(entry);
  const keyframes = sortedKeyframes(entry);
  if (keyframes.length === 0) return base;
  if (keyframes.length === 1) return resolve(keyframes[0], base);

  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (frame <= first.frame) return resolve(first, base);
  if (frame >= last.frame) return resolve(last, base);

  let index = 0;
  while (index < keyframes.length - 2 && keyframes[index + 1].frame <= frame) index++;
  const from = resolve(keyframes[index], base);
  const to = resolve(keyframes[index + 1], base);
  const span: [number, number] = [keyframes[index].frame, keyframes[index + 1].frame];
  // Two keyframes on the same frame would make `interpolate` divide by zero.
  if (span[1] <= span[0]) return to;

  const ease = (a: number, b: number) =>
    interpolate(frame, span, [a, b], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: standardEasing,
    });

  return {
    x: ease(from.x, to.x),
    y: ease(from.y, to.y),
    scale:
      from.scale === undefined && to.scale === undefined
        ? undefined
        : ease(from.scale ?? base.scale ?? 1, to.scale ?? base.scale ?? 1),
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
