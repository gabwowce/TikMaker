import React from "react";
import { Audio, Sequence, useVideoConfig } from "remotion";
import { staggerDelay } from "../scenes/EnterOnCue";
import { colors, fontFamilies, fontSizes, safeArea } from "./tokens";
import { SAFE_CONTENT_WIDTH } from "../layout/layoutPresets";
import { pillBlockStyle } from "./Text";
import { AnimatedSplitText, AnimatedBox, splitText, splitTiming, splitSpan, type ExitConfig } from "./splitAnimate";
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
  //
  // The distance/duration/delay overrides ride along with that preset rather
  // than standing on their own: without `line.exit` the line has no separate
  // exit window to size or shift, so honoring them alone would silently double
  // up with the shared column exit instead of retiming it.
  const resolvedPreset = line.exit ?? exit.preset;
  const resolvedExit: ExitConfig | undefined = resolvedPreset || line.exitAt !== undefined
    ? {
        ...exit,
        preset: resolvedPreset ?? "fade",
        durationInFrames: line.exitAt ?? exit.durationInFrames,
        exitDistance: line.exitDistance ?? exit.exitDistance,
        exitDuration: line.exitDuration ?? exit.exitDuration,
        exitDelay: line.exitDelay,
      }
    : undefined;

  const content = (
    <div
      style={{
        fontFamily: font,
        fontSize: line.sizePx ?? fontSizes[line.size],
        lineHeight: 0.95,
        color: line.color ?? (line.pill ? colors.background : colors.textPrimary),
        textAlign: "center",
        textTransform: "uppercase",
      }}
    >
      <AnimatedSplitText
        text={line.text}
        splitBy={splitBy}
        baseDelay={baseDelay}
        preset={line.animation}
        entranceDuration={line.entranceDuration}
        splitDuration={line.splitDuration}
        exit={resolvedExit}
      />
    </div>
  );

  if (line.pill) {
    return (
      <AnimatedBox delay={baseDelay} preset={line.animation} entranceDuration={line.splitDuration ?? line.entranceDuration} exit={resolvedExit} style={{ ...pillBlockStyle, lineHeight: 0.95 }}>
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
  const stagger = splitTiming(splitBy, splitText(line.text, splitBy).length, line.splitDuration, line.entranceDuration).stagger;

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
  /** Percent of the canvas for the STACK's centre — see
   * `content.richHeadlineX`/`richHeadlineY`. Both unset leaves the stack in the
   * scene's flex column; either one set lifts it out.
   *
   * Positioning happens HERE rather than in each scene component so all three
   * rich-headline scene types get it from one place. The percentages land on
   * the full 1080x1920 canvas because an absolutely positioned child resolves
   * against its ancestor's PADDING box, and `SceneFrame`'s column is an
   * `AbsoluteFill` inset to 0 — its safe-area padding shrinks the flow box, not
   * this one. That's what keeps these mean the same thing as a Block's x/y. */
  x?: number;
  y?: number;
}> = ({ lines, stagger, baseDelay = 0, motion, durationSeconds, x, y }) => {
  const { fps } = useVideoConfig();

  const sharedExit: ExitConfig = {
    preset: motion?.exit,
    durationInFrames: (durationSeconds ?? 0) * fps,
    exitDuration: motion?.exitDuration,
    exitDistance: motion?.exitDistance,
  };

  // The entrance clock walks EVERY line in author order, whether or not a line
  // was pulled out of the stack. Timing is a property of the reading order, not
  // of where a line happens to sit — computing it only over the flow lines
  // would make freeing one line silently retime all the others.
  let cumulativeDelay = baseDelay;
  const timed = lines.map((line) => {
    const delay = line.delay ?? cumulativeDelay;
    const splitBy = line.splitBy ?? "word";
    cumulativeDelay += splitSpan(line.text, splitBy, line.splitDuration, line.entranceDuration) + staggerDelay(1, stagger);
    return { line, delay };
  });

  // A line with BOTH x and y goes wherever it says; anything else stays stacked.
  // Requiring both keeps "positioned" unambiguous — a lone x would leave the
  // vertical slot it vacated up to the flow it just left.
  const isFree = (line: RichHeadlineLine) => line.x !== undefined && line.y !== undefined;
  const stacked = timed.filter((entry) => !isFree(entry.line));
  const free = timed.filter((entry) => isFree(entry.line));

  const stackPositioned = x !== undefined || y !== undefined;

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: LINE_GAP,
          // Pinning both insets rather than setting a width: lifting the stack
          // out of the flow also drops the column's safe-area padding, and this
          // keeps the text inside the same readable band it had before. When an
          // x IS given the stack narrows to its content and centres on that
          // point instead, the way a Block does.
          ...(!stackPositioned
            ? {}
            : {
                position: "absolute",
                top: `${y ?? 50}%`,
                ...(x === undefined
                  ? { left: safeArea.left, right: safeArea.right, transform: "translateY(-50%)" }
                  : { left: `${x}%`, transform: "translate(-50%, -50%)" }),
              }),
        }}
      >
        {stacked.map(({ line, delay }, index) => (
          <React.Fragment key={index}>
            <RichHeadlineLineRow line={line} baseDelay={delay} exit={sharedExit} />
            <RichHeadlineLineSfx line={line} baseDelay={delay} />
          </React.Fragment>
        ))}
      </div>

      {/* Siblings of the stack, not children of it: a free line's x/y always
          address the canvas, and nesting them would re-resolve those percents
          against the stack once the stack itself is positioned. */}
      {free.map(({ line, delay }, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `${line.x}%`,
            top: `${line.y}%`,
            transform: "translate(-50%, -50%)",
            // Without an explicit width, an absolutely positioned box is
            // shrink-to-fit against the space LEFT of its own offset — a line
            // freed at x: 50 gets half the canvas and wraps, so the same words
            // that were one line in the stack silently become two. The break
            // should come from the text being too wide for the video, never
            // from where it was placed, so the box takes its content's natural
            // width and only wraps at the same side-safe limit everything else
            // respects.
            width: "max-content",
            maxWidth: SAFE_CONTENT_WIDTH,
          }}
        >
          <RichHeadlineLineRow line={line} baseDelay={delay} exit={sharedExit} />
          <RichHeadlineLineSfx line={line} baseDelay={delay} />
        </div>
      ))}
    </>
  );
};
