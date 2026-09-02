import { Easing } from "remotion";

/**
 * The arrival curve: almost all of the distance is covered immediately, then it
 * settles. Right for an ENTRANCE — the element is already where you can read it
 * while the last few pixels resolve.
 */
export const standardEasing = Easing.bezier(0.16, 1, 0.3, 1);

/**
 * The departure curve — the mirror of `standardEasing`.
 *
 * Exits used the arrival curve, which meant they covered ~60% of their travel
 * in the first fifth of the window: the element bolted off-frame almost at once
 * and the rest of the OUT duration was spent invisible. Lengthening the
 * duration then changed nothing you could see, which reads as "the time slider
 * does nothing". Accelerating away instead keeps the element on screen for most
 * of its window and makes the duration mean what it says.
 */
export const exitEasing = Easing.bezier(0.7, 0, 0.84, 0);

/**
 * The traversal curve, for movement BETWEEN two keyframes.
 *
 * A keyframe pair is not an arrival and not a departure — it is a journey with
 * a stated length, and the author states that length by how far apart the two
 * diamonds sit. `standardEasing` cannot express that: it covers half the
 * distance in the first tenth of the window and 94% by the fourth, so the layer
 * is parked for the rest of the gap. Widening the gap then does not lengthen
 * the movement, it lengthens the STILLNESS after it — which reads exactly like
 * the keyframe timing being ignored.
 *
 * Symmetric ease-in-out instead: eased at both ends so a keyframe still reads
 * as a place the layer deliberately reaches, but with the travel spread across
 * the whole segment, so the distance between two keyframes IS the duration of
 * the move.
 */
export const pathEasing = Easing.bezier(0.45, 0, 0.55, 1);
