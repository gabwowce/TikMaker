import React from "react";
import { Audio, Sequence, useVideoConfig } from "remotion";
import { staggerDelay } from "../scenes/EnterOnCue";
import { colors, fontFamilies, fontSizes } from "./tokens";
import { pillBlockStyle } from "./Text";
import { AnimatedSplitText, AnimatedBox, splitText, unitStaggerFor, type ExitConfig } from "./splitAnimate";
import { getSfx } from "../../registries/sfxRegistry";
import { resolveTextEntranceSfx, SFX_VOLUME } from "../motion/sfxDefaults";
import type { RichHeadlineLine, Scene } from "../../schema/scene";

// Always Tanker — only line.size varies (see the Design rules in CLAUDE.md).
const fontForLine = (): string => fontFamilies.tanker;

const LINE_GAP = 6;
const CUE_WINDOW_FRAMES = 30;

const RichHeadlineLineRow: React.FC<{ line: RichHeadlineLine; baseDelay: number; exit: ExitConfig }> = ({
  line,
  baseDelay,
  exit,
}) => {
  const splitBy = line.splitBy ?? "word";
  const font = fontForLine();
  // A line with no override needs no exit config of its own at all: it's
  // already inside the scene's exit-styled content column (`SceneFrame`),
  // which fades/slides everything out together per `motion.exit` — that IS
  // "take the motion out animation." Only when a line sets its OWN preset do
  // we add a second, independent exit motion on top of that shared one, which
  // is what lets this one line leave differently from its neighbors.
  const resolvedExit: ExitConfig | undefined = line.exit ? { ...exit, preset: line.exit } : undefined;

  const content = (
    <div
      style={{
        fontFamily: font,
        fontSize: fontSizes[line.size],
        lineHeight: 0.95,
        color: line.pill ? colors.background : colors.textPrimary,
        textAlign: "center",
        textTransform: "uppercase",
      }}
    >
      <AnimatedSplitText
        text={line.text}
        splitBy={splitBy}
        baseDelay={baseDelay}
        preset={line.animation}
        exit={resolvedExit}
      />
    </div>
  );

  if (line.pill) {
    return (
      <AnimatedBox delay={baseDelay} preset={line.animation} exit={resolvedExit} style={{ ...pillBlockStyle, lineHeight: 0.95 }}>
        {content}
      </AnimatedBox>
    );
  }

  return content;
};

/** Fires `line`'s sfx once per visible unit for word/letter splits (matching
 * `AnimatedSplitText`'s per-unit stagger), or once at `baseDelay` for a line
 * split — same pattern as `BlockLayer`'s `BlockSfxCues`, since a Rich
 * Headline line is text just like a Block. */
const RichHeadlineLineSfx: React.FC<{ line: RichHeadlineLine; baseDelay: number }> = ({ line, baseDelay }) => {
  const splitBy = line.splitBy ?? "word";
  const resolvedSfxId = resolveTextEntranceSfx({
    override: line.sfx,
    entrance: line.animation ?? "pop",
    splitBy,
  });
  const sfxSrc = resolvedSfxId ? getSfx(resolvedSfxId)?.src : undefined;
  if (!sfxSrc) return null;

  if (splitBy === "line") {
    return (
      <Sequence from={Math.max(0, baseDelay)} durationInFrames={CUE_WINDOW_FRAMES} layout="none">
        <Audio src={sfxSrc} volume={SFX_VOLUME} />
      </Sequence>
    );
  }

  const units = splitText(line.text, splitBy);
  const stagger = unitStaggerFor(splitBy);

  return (
    <>
      {units.map((unit, index) =>
        unit.trim().length === 0 ? null : (
          <Sequence
            key={index}
            from={Math.round(Math.max(0, baseDelay) + index * stagger)}
            durationInFrames={CUE_WINDOW_FRAMES}
            layout="none"
          >
            <Audio src={sfxSrc} volume={SFX_VOLUME} />
          </Sequence>
        )
      )}
    </>
  );
};

export const RichHeadline: React.FC<{
  lines: RichHeadlineLine[];
  stagger?: number;
  baseDelay?: number;
  /** Scene-level exit fallback for lines that don't set their own — see
   * `RichHeadlineLine.exit`'s doc comment. Omit to leave every line exit-less
   * (matches the old behavior, before per-line exit existed). */
  motion?: Scene["motion"];
  durationSeconds?: number;
}> = ({ lines, stagger, baseDelay = 0, motion, durationSeconds }) => {
  const { fps } = useVideoConfig();
  let cumulativeDelay = baseDelay;

  const sharedExit: ExitConfig = {
    preset: motion?.exit,
    durationInFrames: (durationSeconds ?? 0) * fps,
    exitDuration: motion?.exitDuration,
    exitDistance: motion?.exitDistance,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: LINE_GAP }}>
      {lines.map((line, index) => {
        const delay = cumulativeDelay;
        const splitBy = line.splitBy ?? "word";
        const unitCount = splitText(line.text, splitBy).length;
        cumulativeDelay += unitCount * unitStaggerFor(splitBy) + staggerDelay(1, stagger);
        return (
          <React.Fragment key={index}>
            <RichHeadlineLineRow line={line} baseDelay={delay} exit={sharedExit} />
            <RichHeadlineLineSfx line={line} baseDelay={delay} />
          </React.Fragment>
        );
      })}
    </div>
  );
};
