import { interpolate, spring } from "remotion";
import type { CSSProperties } from "react";
import { standardEasing } from "./easing";
import { videoDefaults } from "../typography/tokens";
import type { EntrancePreset } from "../../schema/scene";

type EnterArgs = {
  frame: number;
  fps: number;
  delay?: number;
  /** How long the entrance takes, in frames.
   *
   * Every preset but `fade` is a SPRING, and a spring has no duration of its
   * own — its pace comes from damping/stiffness/mass. That's why this used to
   * be read by the `fade` branch alone, and why there was no `entranceDuration`
   * to match `exitDuration` anywhere in the schema. Remotion's `spring()` takes
   * a `durationInFrames` that stretches or squashes the whole curve to fit, so
   * passing it through makes the knob mean the same thing for all of them.
   *
   * Unset keeps the old behaviour exactly: `fade` runs over 18 frames and every
   * spring runs at its natural pace. Only an explicit value changes anything,
   * so existing projects are untouched. */
  durationInFrames?: number;
  /** How far (px) the element travels on a slide/zoomSettle preset. Unset =
   * the tasteful default below. Past `FULL_TRAVEL_DISTANCE` the opacity fade
   * is dropped so a long slide reads as one continuous move from off-frame
   * instead of the element materialising halfway in — same reasoning as the
   * whole-scene slide in `transitions.ts`, which never fades either. */
  distance?: number;
};

const springConfig = { damping: 200, stiffness: 200, mass: 0.7 };

const ARRIVE_DISTANCE = 260;

/**
 * How far a slide travels when nobody gave it a distance.
 *
 * A slide is a move from OUTSIDE the frame, not a nudge: the old 60px default
 * made the element materialise a thumb's width from where it lands, which is
 * the "it popped, then twitched" look. Sized per axis off the real canvas plus
 * a margin so the element clears the frame from ANY resting position — the
 * caller no longer has to work out "how far is far enough", which is what
 * `distance` used to be for and what nobody ever computed correctly by hand.
 *
 * Well past `FULL_TRAVEL_DISTANCE`, so these slides never fade either: the move
 * itself is the animation.
 */
const OFF_FRAME_MARGIN = 200;
export function offFrameTravel(axis: "x" | "y"): number {
  return (axis === "x" ? videoDefaults.width : videoDefaults.height) + OFF_FRAME_MARGIN;
}

function slideAxis(preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight"): "x" | "y" {
  return preset === "slideLeft" || preset === "slideRight" ? "x" : "y";
}

/** Shared with the matching exits so `blurIn` and `blurOut` are the same move
 * in reverse — a preset pair that disagrees on its own constant reads as two
 * unrelated effects. */
export const BLUR_RADIUS = 22;
export const SPIN_DEGREES = 200;
export const ROLL_DEGREES = 140;
/** At or past this travel distance the element is far enough out of frame that
 * fading it too just makes it vanish early — so opacity is left alone. */
export const FULL_TRAVEL_DISTANCE = 400;
/** Convenience for the editor: travelling this far clears the 1080x1920 canvas
 * from any starting position. */
export const OFF_FRAME_DISTANCE = 1200;

function slideOffset(
  preset: "slideUp" | "slideDown" | "slideLeft" | "slideRight",
  distance: number,
): { x: number; y: number } {
  switch (preset) {
    case "slideUp":
      return { x: 0, y: distance };
    case "slideDown":
      return { x: 0, y: -distance };
    case "slideLeft":
      return { x: distance, y: 0 };
    case "slideRight":
      return { x: -distance, y: 0 };
  }
}

export function enter(preset: EntrancePreset, args: EnterArgs): CSSProperties {
  const { frame, fps, delay = 0, durationInFrames, distance } = args;
  const localFrame = frame - delay;
  // Springs get the duration only when one was actually given — `spring()`
  // treats `undefined` as "run at your natural pace", which is the behaviour
  // every existing project was authored against.
  // Imported/legacy projects may still contain a zero duration. Remotion's
  // spring rejects it and would crash the entire editor preview (including the
  // timeline), so keep the renderer defensive even though current controls do
  // not allow zero.
  const springDuration = durationInFrames === undefined
    ? undefined
    : Math.max(1, Math.round(durationInFrames));

  switch (preset) {
    case "fade": {
      const opacity = interpolate(localFrame, [0, springDuration ?? 18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: standardEasing,
      });
      return { opacity };
    }
    case "slideUp":
    case "slideDown":
    case "slideLeft":
    case "slideRight": {
      const progress = spring({ frame: localFrame, fps, config: springConfig, durationInFrames: springDuration });
      const travel = distance ?? offFrameTravel(slideAxis(preset));
      const fades = travel < FULL_TRAVEL_DISTANCE;
      const { x, y } = slideOffset(preset, travel);
      const translateX = interpolate(progress, [0, 1], [x, 0]);
      const translateY = interpolate(progress, [0, 1], [y, 0]);
      return { opacity: fades ? progress : 1, transform: `translate(${translateX}px, ${translateY}px)` };
    }
    case "scaleIn": {
      const progress = spring({ frame: localFrame, fps, config: springConfig, durationInFrames: springDuration });
      const scale = interpolate(progress, [0, 1], [0.85, 1]);
      return { opacity: progress, transform: `scale(${scale})` };
    }
    case "pop": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 12, stiffness: 260, mass: 0.6 },
        durationInFrames: springDuration,
      });
      const scale = interpolate(progress, [0, 1], [0.5, 1]);
      return { opacity: Math.min(progress * 1.6, 1), transform: `scale(${scale})` };
    }
    case "zoomSettleRight":
    case "zoomSettleLeft": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 16, stiffness: 140, mass: 0.8 },
        durationInFrames: springDuration,
      });
      const arrive = distance ?? ARRIVE_DISTANCE;
      const fromX = preset === "zoomSettleRight" ? arrive : -arrive;
      const translateX = interpolate(progress, [0, 0.65, 1], [fromX, 0, 0]);
      const translateY = interpolate(progress, [0, 0.65, 1], [-36, -16, 0]);
      const scale = interpolate(progress, [0, 0.5, 1], [0.6, 1.15, 1]);
      const opacity = interpolate(progress, [0, 0.25, 1], [0, 1, 1]);
      return {
        opacity,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      };
    }
    case "zoomSettleTop":
    case "zoomSettleBottom": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 16, stiffness: 140, mass: 0.8 },
        durationInFrames: springDuration,
      });
      const arrive = distance ?? ARRIVE_DISTANCE;
      const fromY = preset === "zoomSettleBottom" ? arrive : -arrive;
      const translateY = interpolate(progress, [0, 0.65, 1], [fromY, 0, 0]);
      const scale = interpolate(progress, [0, 0.5, 1], [0.6, 1.15, 1]);
      const opacity = interpolate(progress, [0, 0.25, 1], [0, 1, 1]);
      return {
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
      };
    }
    case "zoomIn": {
      const progress = spring({ frame: localFrame, fps, config: springConfig, durationInFrames: springDuration });
      const scale = interpolate(progress, [0, 1], [1.6, 1]);
      return { opacity: progress, transform: `scale(${scale})` };
    }
    case "blurIn": {
      // Eased rather than sprung: a spring's overshoot would push blur past
      // zero into a negative value, which the browser clamps — the tail of the
      // move would silently do nothing.
      const progress = interpolate(localFrame, [0, springDuration ?? 18], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: standardEasing,
      });
      const blur = interpolate(progress, [0, 1], [BLUR_RADIUS, 0]);
      const scale = interpolate(progress, [0, 1], [1.06, 1]);
      return { opacity: progress, filter: `blur(${blur}px)`, transform: `scale(${scale})` };
    }
    case "spinIn": {
      const progress = spring({ frame: localFrame, fps, config: springConfig, durationInFrames: springDuration });
      const rotate = interpolate(progress, [0, 1], [-SPIN_DEGREES, 0]);
      const scale = interpolate(progress, [0, 1], [0.3, 1]);
      return { opacity: Math.min(progress * 2, 1), transform: `rotate(${rotate}deg) scale(${scale})` };
    }
    case "flipIn": {
      const progress = spring({ frame: localFrame, fps, config: springConfig, durationInFrames: springDuration });
      const rotateY = interpolate(progress, [0, 1], [90, 0]);
      // The perspective has to live in the transform itself: these styles are
      // merged onto the element, so there is no parent to carry a perspective
      // property and a bare rotateY would read as a flat horizontal squash.
      return { opacity: Math.min(progress * 2, 1), transform: `perspective(1200px) rotateY(${rotateY}deg)` };
    }
    case "bounceIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 8, stiffness: 180, mass: 0.9 },
        durationInFrames: springDuration,
      });
      const scale = interpolate(progress, [0, 1], [0.4, 1]);
      return { opacity: Math.min(progress * 2.2, 1), transform: `scale(${scale})` };
    }
    case "dropIn": {
      const progress = spring({
        frame: localFrame,
        fps,
        config: { damping: 9, stiffness: 150, mass: 1 },
        durationInFrames: springDuration,
      });
      const travel = distance ?? offFrameTravel("y");
      const translateY = interpolate(progress, [0, 1], [-travel, 0]);
      return { opacity: 1, transform: `translateY(${translateY}px)` };
    }
    case "rollIn": {
      const progress = spring({ frame: localFrame, fps, config: springConfig, durationInFrames: springDuration });
      const travel = distance ?? offFrameTravel("x");
      const translateX = interpolate(progress, [0, 1], [-travel, 0]);
      const rotate = interpolate(progress, [0, 1], [-ROLL_DEGREES, 0]);
      return { opacity: 1, transform: `translateX(${translateX}px) rotate(${rotate}deg)` };
    }
    default:
      return {};
  }
}
