import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../motion/entrances";
import type { EntrancePreset } from "../../schema/scene";

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

/** One animated word/letter/line unit — inherits font/color/size from its parent via normal CSS. */
export const AnimatedUnit: React.FC<{ text: string; delay: number; preset?: EntrancePreset }> = ({
  text,
  delay,
  preset,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const style = enter(preset ?? "pop", { frame, fps, delay });

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
}> = ({ text, splitBy, baseDelay, preset }) => {
  const units = splitText(text, splitBy);
  const stagger = unitStaggerFor(splitBy);

  return (
    <>
      {units.map((unit, index) => (
        <AnimatedUnit key={index} text={unit} delay={baseDelay + index * stagger} preset={preset} />
      ))}
    </>
  );
};

/** Wraps a box (pill/badge background) so it animates in with its contents instead of
 * appearing instantly while the text inside animates. */
export const AnimatedBox: React.FC<{
  delay: number;
  preset?: EntrancePreset;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay, preset, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motionStyle = enter(preset ?? "pop", { frame, fps, delay });

  return <div style={{ ...style, ...motionStyle }}>{children}</div>;
};
