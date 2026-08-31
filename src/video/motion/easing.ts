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
