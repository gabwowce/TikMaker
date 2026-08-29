import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import type { EntrancePreset, ExitPreset } from "../../schema/scene";

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

/** Exit timing for a split/box — resolved once by the caller (e.g.
 * `RichHeadline`, falling back to `motion.exit`/`exitDuration`/`exitDistance`
 * when a line has no override of its own) and threaded down here rather than
 * each unit re-deriving it. */
export type ExitConfig = {
  preset?: ExitPreset;
  durationInFrames: number;
  exitDuration?: number;
  exitDistance?: number;
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
  exit?: ExitConfig;
}): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enterStyle = enter(args.entrancePreset ?? "pop", {
    frame,
    fps,
    delay: args.delay,
    distance: args.entranceDistance,
  });

  if (!args.exit?.preset) return enterStyle;

  const exitResult = computeExitStyle(args.exit.preset, {
    frame,
    durationInFrames: args.exit.durationInFrames,
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
  exit?: ExitConfig;
}> = ({ text, delay, preset, entranceDistance, exit }) => {
  const style = useEnterExitStyle({ entrancePreset: preset, delay, entranceDistance, exit });

  return (
    <span style={{ display: "inline-block", whiteSpace: "pre", ...style }}>
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
  exit?: ExitConfig;
}> = ({ text, splitBy, baseDelay, preset, entranceDistance, exit }) => {
  const units = splitText(text, splitBy);
  const stagger = unitStaggerFor(splitBy);

  return (
    <>
      {units.map((unit, index) => (
        <AnimatedUnit
          key={index}
          text={unit}
          delay={baseDelay + index * stagger}
          preset={preset}
          entranceDistance={entranceDistance}
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
  exit?: ExitConfig;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay, preset, entranceDistance, exit, style, children }) => {
  const motionStyle = useEnterExitStyle({ entrancePreset: preset, delay, entranceDistance, exit });

  return <div style={{ ...style, ...motionStyle }}>{children}</div>;
};
