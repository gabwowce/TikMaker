import { type CSSProperties, type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { EntrancePreset, ExitPreset } from "../../schema/scene";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";

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
const UNIT_ENTRANCE_SHARE = 0.45;
export type SplitTiming = {
  stagger: number;
  unitEntrance?: number;
  total: number;
};
export function splitTiming(
  splitBy: SplitBy,
  unitCount: number,
  splitDuration?: number,
  entranceDuration?: number,
): SplitTiming {
  if (splitDuration === undefined) {
    const stagger = unitStaggerFor(splitBy);
    const gaps = Math.max(0, unitCount - 1);
    return {
      stagger,
      unitEntrance: entranceDuration,
      total: gaps * stagger + (entranceDuration ?? 18),
    };
  }
  const gaps = Math.max(0, unitCount - 1);
  const unitEntrance =
    gaps === 0
      ? splitDuration
      : Math.max(
          1,
          Math.min(
            entranceDuration ?? splitDuration * UNIT_ENTRANCE_SHARE,
            splitDuration,
          ),
        );
  return {
    stagger: gaps === 0 ? 0 : (splitDuration - unitEntrance) / gaps,
    unitEntrance,
    total: splitDuration,
  };
}
export function splitSpan(
  text: string,
  splitBy: SplitBy,
  splitDuration?: number,
  entranceDuration?: number,
): number {
  const units = splitText(text, splitBy).length;
  return splitTiming(splitBy, units, splitDuration, entranceDuration).total;
}
export type ExitConfig = {
  preset?: ExitPreset;
  durationInFrames: number;
  exitDuration?: number;
  exitDistance?: number;
  exitDelay?: number;
};
function useEnterExitStyle(args: {
  entrancePreset: EntrancePreset | undefined;
  delay: number;
  entranceDistance?: number;
  entranceDuration?: number;
  exit?: ExitConfig;
}): CSSProperties {
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
  const enterOpacity =
    typeof enterStyle.opacity === "number" ? enterStyle.opacity : 1;
  const exitOpacity =
    typeof exitResult.opacity === "number" ? exitResult.opacity : 1;
  return {
    opacity: enterOpacity * exitOpacity,
    transform:
      [enterStyle.transform, exitResult.transform].filter(Boolean).join(" ") ||
      undefined,
  };
}
type AnimatedUnitProps = {
  highlighted?: boolean;
  text: string;
  delay: number;
  preset?: EntrancePreset;
  entranceDistance?: number;
  entranceDuration?: number;
  style?: CSSProperties;
  exit?: ExitConfig;
};
export function AnimatedUnit({
  text,
  delay,
  preset,
  entranceDistance,
  entranceDuration,
  style: ownStyle,
  highlighted = false,
  exit,
}: AnimatedUnitProps) {
  const style = useEnterExitStyle({
    entrancePreset: preset,
    delay,
    entranceDistance,
    entranceDuration,
    exit,
  });
  return (
    <span
      className={`whitespace-pre ${highlighted ? "inline bg-[#FFFFFF] text-[#171717] p-[0.05em_0.18em] rounded-md [box-decoration-break:clone] [-webkit-box-decoration-break:clone]" : "inline-block"}`}
      style={{
        ...ownStyle,
        ...style,
      }}
    >
      {text}
    </span>
  );
}
type AnimatedSplitTextProps = {
  text: string;
  splitBy: SplitBy;
  baseDelay: number;
  preset?: EntrancePreset;
  entranceDistance?: number;
  entranceDuration?: number;
  splitDuration?: number;
  highlights?: string[];
  exit?: ExitConfig;
};
export function AnimatedSplitText({
  text,
  splitBy,
  baseDelay,
  preset,
  entranceDistance,
  entranceDuration,
  splitDuration,
  highlights,
  exit,
}: AnimatedSplitTextProps) {
  const units = splitText(text, splitBy);
  const pilled = new Set(
    (splitBy === "word" ? (highlights ?? []) : []).map((word) =>
      word.trim().toLowerCase(),
    ),
  );
  const timing = splitTiming(
    splitBy,
    units.length,
    splitDuration,
    entranceDuration,
  );
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
          highlighted={pilled.has(unit.trim().toLowerCase())}
          exit={exit}
        />
      ))}
    </>
  );
}
type AnimatedBoxProps = {
  delay: number;
  preset?: EntrancePreset;
  entranceDistance?: number;
  entranceDuration?: number;
  exit?: ExitConfig;
  style?: CSSProperties;
  className?: string;
  children: ReactNode;
};
export function AnimatedBox({
  delay,
  preset,
  entranceDistance,
  entranceDuration,
  exit,
  style,
  children,
  className,
}: AnimatedBoxProps) {
  const motionStyle = useEnterExitStyle({
    entrancePreset: preset,
    delay,
    entranceDistance,
    entranceDuration,
    exit,
  });
  return (
    <div className={className} style={{ ...style, ...motionStyle }}>
      {children}
    </div>
  );
}
