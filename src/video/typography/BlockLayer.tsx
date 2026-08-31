import React from "react";
import { AbsoluteFill, Audio, Sequence, useCurrentFrame } from "remotion";
import { colors, fontFamilies, fontSizes } from "./tokens";
import { AnimatedSplitText, AnimatedBox, splitText, splitTiming } from "./splitAnimate";
import { getSfx } from "../../registries/sfxRegistry";
import { resolveTextEntranceSfx, SFX_VOLUME } from "../motion/sfxDefaults";
import type { Block } from "../../schema/scene";

const CUE_WINDOW_FRAMES = 30;

const fontFor = (block: Block): string => (block.font === "clash" ? fontFamilies.clashMedium : fontFamilies.tanker);

const BlockUnit: React.FC<{ block: Block; baseDelay: number; durationInFrames: number }> = ({ block, baseDelay, durationInFrames }) => {
  const delay = block.delay ?? baseDelay;
  const font = fontFor(block);
  const textStyle: React.CSSProperties = {
    fontFamily: font,
    fontSize: block.size ?? fontSizes.body,
    color: block.color ?? colors.textPrimary,
    letterSpacing: block.letterSpacing,
    textAlign: "center",
    whiteSpace: "nowrap",
    textTransform: font === fontFamilies.tanker ? "uppercase" : undefined,
  };

  const content = (
    <div style={textStyle}>
      <AnimatedSplitText
        text={block.text}
        splitBy={block.splitBy ?? "word"}
        baseDelay={delay}
        preset={block.animation}
        entranceDuration={block.entranceDuration}
        splitDuration={block.splitDuration}
        exit={block.exit ? { preset: block.exit, durationInFrames: block.exitAt ?? durationInFrames, exitDuration: block.exitDuration } : undefined}
      />
    </div>
  );

  if (block.type === "badge") {
    return (
      <AnimatedBox
        delay={delay}
        preset={block.animation}
        entranceDuration={block.splitDuration ?? block.entranceDuration}
        exit={block.exit ? { preset: block.exit, durationInFrames: block.exitAt ?? durationInFrames, exitDuration: block.exitDuration } : undefined}
        style={{
          display: "inline-flex",
          padding: "10px 24px",
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.06)",
          border: `1px solid ${block.color ?? colors.accent}`,
        }}
      >
        {content}
      </AnimatedBox>
    );
  }

  return content;
};

/** Fires the block's sfx once per visible unit when the text splits into
 * word/letter beats (so a typewriter-style block reads as a run of clicks,
 * one per word, instead of a single cue at the block's start) — matches the
 * per-unit stagger `AnimatedSplitText` already animates each unit in with.
 * `splitBy: "line"` (or no split) keeps the old single cue at the block's
 * own delay, since there's only ever one visible unit in that case. */
const BlockSfxCues: React.FC<{ block: Block; sfxSrc: string; baseDelay: number }> = ({ block, sfxSrc, baseDelay }) => {
  const splitBy = block.splitBy ?? "word";
  const start = Math.max(0, block.delay ?? baseDelay);

  if (splitBy === "line") {
    return (
      <Sequence from={start} durationInFrames={CUE_WINDOW_FRAMES} layout="none">
        <Audio src={sfxSrc} volume={SFX_VOLUME} />
      </Sequence>
    );
  }

  const units = splitText(block.text, splitBy);
  const stagger = splitTiming(splitBy, splitText(block.text, splitBy).length, block.splitDuration, block.entranceDuration).stagger;

  return (
    <>
      {units.map((unit, index) =>
        unit.trim().length === 0 ? null : (
          <Sequence
            key={index}
            from={Math.round(start + index * stagger)}
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

export const BlockLayer: React.FC<{ blocks?: Block[]; baseDelay?: number; durationInFrames: number }> = ({ blocks, baseDelay = 0, durationInFrames }) => {
  const frame = useCurrentFrame();
  if (!blocks || blocks.length === 0) return null;

  return (
    <AbsoluteFill>
      {blocks.map((block) => {
        const resolvedSfxId = resolveTextEntranceSfx({
          override: block.sfx,
          entrance: block.animation ?? "pop",
          splitBy: block.splitBy ?? "word",
        });
        const sfxSrc = resolvedSfxId ? getSfx(resolvedSfxId)?.src : undefined;

        return (
          <div
            key={block.id}
            style={{
              position: "absolute",
              left: `${block.x}%`,
              top: `${block.y}%`,
              transform: "translate(-50%, -50%)",
              // The chosen OUT preset owns the animation. This wrapper only
              // enforces the clip edge, avoiding an extra hard-coded fade.
              visibility: block.exitAt === undefined || frame < block.exitAt ? "visible" : "hidden",
            }}
          >
            <BlockUnit block={block} baseDelay={baseDelay} durationInFrames={durationInFrames} />
            {sfxSrc ? <BlockSfxCues block={block} sfxSrc={sfxSrc} baseDelay={baseDelay} /> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
