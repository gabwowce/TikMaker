import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import type { EntrancePreset, ExitPreset } from "../../schema/scene";
import { pillInlineStyle } from "./Text";

export type SplitBy = "word" | "letter" | "line";

export const WORD_STAGGER_FRAMES = 3;
export const LETTER_STAGGER_FRAMES = 1.5;

export function splitText(text: string, splitBy: SplitBy): string[] {
  if (splitBy === "line") return [text];
  if (splitBy === "letter") return text.split("");
  return text.split(/(\s+)/).filter((s) => s.length > 0);
}

export function unitStaggerFor(splitBy: SplitBy): number {
  return splitBy === "letter" ? LETTER_STAGGER_FRAMES : WORD_STAGGER_FRAMES;
}

/**
 * Share of the total that ONE unit's own entrance gets.
 *
 * The rest is spread between units as stagger. Making the entrance a fraction
 * of the total rather than a fixed number of frames is what keeps the cascade
 * alive when the total is short: budget a flat 18 frames and a 0.3s request has
 * nothing left to stagger with, so every word lands at once and the effect you
 * were speeding up disappears. At 0.45 the words still arrive one after another
 * at any speed — they just arrive faster.
 */
const UNIT_ENTRANCE_SHARE = 0.45;

export type SplitTiming = {
  /** Frames between one unit starting and the next. */
  stagger: number;
  /** Duration to give each unit's own entrance. Undefined = leave the preset's
   * own pace alone (the automatic case). */
  unitEntrance?: number;
  /** Frames from the first unit STARTING to the last one FINISHING. */
  total: number;
};

/**
 * Resolves a split's timing from an author-set total.
 *
 * `splitDuration` is the whole animation, start to finish: set 0.3s and the
 * sentence goes from nothing to fully on screen in 0.3s. Both halves of the
 * effect scale with it — the gap between words AND each word's own entrance —
 * because speeding up only the gaps just makes the words overlap while each one
 * still takes as long as it did.
 *
 *     total = stagger x (units - 1) + unitEntrance
 *
 * An explicit `entranceDuration` wins where it fits, so a line that was tuned by
 * hand keeps its own pace and only the stagger absorbs the difference.
 *
 * Everything that needs to know when a split finishes — the renderer, the
 * per-unit sfx cues, the next line's delay, the timelines' automatic positions
 * — reads this, which is why it is one function and not a constant multiplied
 * at four call sites.
 */
export function splitTiming(
  splitBy: SplitBy,
  unitCount: number,
  splitDuration?: number,
  entranceDuration?: number
): SplitTiming {
  if (splitDuration === undefined) {
    const stagger = unitStaggerFor(splitBy);
    const gaps = Math.max(0, unitCount - 1);
    return { stagger, unitEntrance: entranceDuration, total: gaps * stagger + (entranceDuration ?? 18) };
  }

  const gaps = Math.max(0, unitCount - 1);
  const unitEntrance = gaps === 0
    ? splitDuration
    : Math.max(1, Math.min(entranceDuration ?? splitDuration * UNIT_ENTRANCE_SHARE, splitDuration));
  return {
    stagger: gaps === 0 ? 0 : (splitDuration - unitEntrance) / gaps,
    unitEntrance,
    total: splitDuration,
  };
}

/** Frames from a split's start until it has fully finished — what the next
 * element in the stack has to wait for. */
export function splitSpan(text: string, splitBy: SplitBy, splitDuration?: number, entranceDuration?: number): number {
  const units = splitText(text, splitBy).length;
  return splitTiming(splitBy, units, splitDuration, entranceDuration).total;
}

/** Exit timing for a split/box — resolved once by the caller (e.g.
 * `RichHeadline`, falling back to `motion.exit`/`exitDuration`/`exitDistance`
 * when a line has no override of its own) and threaded down here rather than
 * each unit re-deriving it. */
export type ExitConfig = {
  preset?: ExitPreset;
  durationInFrames: number;
  exitDuration?: number;
  exitDistance?: number;
  /** Frames to shift the exit window later (negative = earlier). Implemented
   * by moving the END of the window rather than by a separate start offset:
   * `exitStyle` always anchors the exit to `durationInFrames`, so pretending
   * the scene is `exitDelay` frames longer slides the whole window without
   * teaching that function a second timing concept. A positive delay therefore
   * means the cut lands while the element is still mid-exit — deliberate, and
   * the whole point when syncing to a carried visual that keeps moving after
   * the cut. */
  exitDelay?: number;
};

/** Merges an entrance and an exit style the same way `AnimatedVisual` does:
 * opacity multiplies (so either animation alone can dim it) and transforms
 * concatenate (so a unit can, say, pop in and slide out). */
function useEnterExitStyle(args: {
  entrancePreset: EntrancePreset | undefined;
  delay: number;
  /** Travel distance (px) for a slide/zoomSettle entrance — same field every
   * other entrance in the system takes. */
  entranceDistance?: number;
  entranceDuration?: number;
  exit?: ExitConfig;
}): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterStyle = enter(args.entrancePreset ?? "pop", {
    frame,
    fps,
    delay: args.delay,
    distance: args.entranceDistance,
    durationInFrames: args.entranceDuration,
  });

  if (!args.exit?.preset) return enterStyle;

  const exitResult = computeExitStyle(args.exit.preset, {
    frame,
    durationInFrames: args.exit.durationInFrames + (args.exit.exitDelay ?? 0),
    exitDuration: args.exit.exitDuration,
    distance: args.exit.exitDistance,
  });

  const enterOpacity = typeof enterStyle.opacity === "number" ? enterStyle.opacity : 1;
  const exitOpacity = typeof exitResult.opacity === "number" ? exitResult.opacity : 1;

  return {
    opacity: enterOpacity * exitOpacity,
    transform: [enterStyle.transform, exitResult.transform].filter(Boolean).join(" ") || undefined,
  };
}

/** One animated word/letter/line unit — inherits font/color/size from its parent via normal CSS. */
export const AnimatedUnit: React.FC<{
  text: string;
  delay: number;
  preset?: EntrancePreset;
  entranceDistance?: number;
  entranceDuration?: number;
  /** Extra styling for THIS unit — the pill box on a highlighted word. It sits
   * under the animation transform, so a pilled word animates like any other. */
  style?: React.CSSProperties;
  exit?: ExitConfig;
}> = ({ text, delay, preset, entranceDistance, entranceDuration, style: ownStyle, exit }) => {
  const style = useEnterExitStyle({ entrancePreset: preset, delay, entranceDistance, entranceDuration, exit });

  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...ownStyle, ...style }}>
      {text}
    </span>
  );
};

/** Renders `text` split by `splitBy`, each unit staggered from `baseDelay`. Wrap in an
 * element that sets fontFamily/fontSize/color/letterSpacing — units inherit it via CSS. */
export const AnimatedSplitText: React.FC<{
  text: string;
  splitBy: SplitBy;
  baseDelay: number;
  preset?: EntrancePreset;
  entranceDistance?: number;
  entranceDuration?: number;
  splitDuration?: number;
  /** Units matching one of these get the pill box. Word-level only: a pill
   * around a single letter is not a highlight, it is a typo. */
  highlights?: string[];
  exit?: ExitConfig;
}> = ({ text, splitBy, baseDelay, preset, entranceDistance, entranceDuration, splitDuration, highlights, exit }) => {
  const units = splitText(text, splitBy);
  const pilled = new Set((splitBy === "word" ? highlights ?? [] : []).map((word) => word.trim().toLowerCase()));
  const timing = splitTiming(splitBy, units.length, splitDuration, entranceDuration);

  return (
    <>
      {units.map((unit, index) => (
        <AnimatedUnit
          key={index}
          text={unit}
          delay={baseDelay + index * timing.stagger}
          preset={preset}
          entranceDistance={entranceDistance}
          entranceDuration={timing.unitEntrance}
          style={pilled.has(unit.trim().toLowerCase()) ? pillInlineStyle : undefined}
          exit={exit}
        />
      ))}
    </>
  );
};

/** Wraps a box (pill/badge background) so it animates in with its contents instead of
 * appearing instantly while the text inside animates. */
export const AnimatedBox: React.FC<{
  delay: number;
  preset?: EntrancePreset;
  entranceDistance?: number;
  entranceDuration?: number;
  exit?: ExitConfig;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay, preset, entranceDistance, entranceDuration, exit, style, children }) => {
  const motionStyle = useEnterExitStyle({ entrancePreset: preset, delay, entranceDistance, entranceDuration, exit });

  return <div style={{ ...style, ...motionStyle }}>{children}</div>;
};
