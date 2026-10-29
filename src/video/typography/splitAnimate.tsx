import { Fragment, type CSSProperties, type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { EntrancePreset, ExitPreset, HighlightStyle } from "../../schema/scene";
import { enter } from "../motion/entrances";
import { exitStyle as computeExitStyle } from "../motion/exits";
import { colors, fontFamilies } from "./tokens";

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
// How a highlighted word is drawn (B2): a light box, the accent colour or a bolder font.
const PILL_CLASS =
  "inline bg-[#FFFFFF] text-[#171717] p-[0.05em_0.18em] rounded-md [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
function highlightLook(
  highlight: HighlightStyle,
  color?: string,
): { className?: string; style?: CSSProperties } {
  if (highlight === "pill")
    return { className: PILL_CLASS, style: color ? { background: color } : undefined };
  if (highlight === "color") return { style: { color: color ?? colors.accent } };
  return { style: { fontFamily: fontFamilies.clashBold } };
}

// Which characters of the text belong to a highlighted word. Case and
// punctuation around a word are ignored: "apps!" matches the highlight "apps".
export function highlightMask(text: string, highlights?: string[]): boolean[] {
  const clean = (word: string) => word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
  const wanted = new Set((highlights ?? []).map(clean).filter(Boolean));
  const mask = new Array<boolean>(text.length).fill(false);
  for (const match of text.matchAll(/\S+/g)) {
    if (wanted.has(clean(match[0])))
      mask.fill(true, match.index, match.index + match[0].length);
  }
  return mask;
}

type AnimatedUnitProps = {
  highlight?: HighlightStyle; // unset = plain
  highlightColor?: string;
  children?: ReactNode; // drawn instead of text (a whole line with highlighted words inside)
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
  highlight,
  highlightColor,
  children,
  exit,
}: AnimatedUnitProps) {
  const style = useEnterExitStyle({
    entrancePreset: preset,
    delay,
    entranceDistance,
    entranceDuration,
    exit,
  });
  const look = highlight ? highlightLook(highlight, highlightColor) : {};
  return (
    <span
      className={`whitespace-pre ${look.className ?? "inline-block"}`}
      style={{
        ...ownStyle,
        ...style,
        ...look.style,
      }}
    >
      {children ?? text}
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
  highlightStyle?: HighlightStyle;
  highlightColor?: string;
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
  highlightStyle = "pill",
  highlightColor,
  exit,
}: AnimatedSplitTextProps) {
  const units = splitText(text, splitBy);
  const mask = highlightMask(text, highlights);
  // where each unit starts in the text (units are consecutive pieces of it)
  const starts = units.map((_, index) =>
    units.slice(0, index).reduce((sum, unit) => sum + unit.length, 0),
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
          highlight={
            splitBy !== "line" && unit.trim() && mask[starts[index]]
              ? highlightStyle
              : undefined
          }
          highlightColor={highlightColor}
          exit={exit}
        >
          {splitBy === "line" ? (
            <HighlightedText
              text={unit}
              mask={mask}
              style={highlightStyle}
              color={highlightColor}
            />
          ) : undefined}
        </AnimatedUnit>
      ))}
    </>
  );
}
// A whole line drawn at once, with its highlighted words styled inside it.
function HighlightedText({
  text,
  mask,
  style,
  color,
}: {
  text: string;
  mask: boolean[];
  style: HighlightStyle;
  color?: string;
}) {
  const parts: { text: string; on: boolean }[] = [];
  [...text].forEach((char, index) => {
    const on = mask[index] && char.trim() !== "";
    const last = parts[parts.length - 1];
    if (last && last.on === on) last.text += char;
    else parts.push({ text: char, on });
  });
  return (
    <>
      {parts.map((part, index) => {
        if (!part.on) return <Fragment key={index}>{part.text}</Fragment>;
        const look = highlightLook(style, color);
        return (
          <span key={index} className={look.className} style={look.style}>
            {part.text}
          </span>
        );
      })}
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
