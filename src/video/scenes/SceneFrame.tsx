import React from "react";
import { AbsoluteFill } from "remotion";
import { Background } from "../backgrounds";
import { safeAreaPadding } from "../typography/SafeArea";
import { BlockLayer } from "../typography/BlockLayer";
import { VisualsLayer } from "../typography/VisualsLayer";
import { SceneSfx } from "../motion/SceneSfx";
import { EnterOnCue, staggerDelay, useSceneExitStyle, sceneStartDelay } from "./EnterOnCue";
import { resolveTextZone, textZoneJustify, type TextZone } from "../layout/layoutPresets";
import type { SceneComponentProps } from "./types";

/**
 * The parts every scene type has in common: background, the safe-area text
 * column that carries the scene's exit animation, and the three layers that sit
 * on top of it (freeform text blocks, the visual stack, the scene's sound cue).
 *
 * Each scene component was repeating all of that verbatim, which is how they
 * drifted — a fix to the layer order or the exit style had to be applied seven
 * times and sometimes wasn't. A scene type is only responsible for what makes
 * it that scene type: which text elements it shows, in what order, and how the
 * column is aligned.
 */
export const SceneFrame: React.FC<{
  background: SceneComponentProps["background"];
  content: SceneComponentProps["content"];
  motion: SceneComponentProps["motion"];
  durationSeconds: number;
  layout?: SceneComponentProps["layout"];
  /** Band the text column occupies when the scene has no `layout` preset. */
  textZone?: TextZone;
  /** Space between the column's own children. Scene types tune this because
   * their content has different density, not for any deeper reason. */
  gap?: number;
  children?: React.ReactNode;
}> = ({ background, content, motion, durationSeconds, layout, textZone = "center", gap = 40, children }) => {
  const exitStyle = useSceneExitStyle(durationSeconds, motion);
  const baseDelay = sceneStartDelay(motion);

  return (
    <AbsoluteFill>
      <Background id={background} />

      <AbsoluteFill
        style={{
          ...safeAreaPadding,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: textZoneJustify[resolveTextZone(layout, textZone)],
          gap,
          ...exitStyle,
        }}
      >
        {children}
      </AbsoluteFill>

      {/* Order matters: freeform text, then the visual stack on top of it, so a
          layer can deliberately cover a block. Both sit above the text column. */}
      <BlockLayer blocks={content.blocks} baseDelay={baseDelay} />
      <VisualsLayer visuals={content.visuals} durationSeconds={durationSeconds} baseDelay={baseDelay} />
      <SceneSfx motion={motion} durationSeconds={durationSeconds} />
    </AbsoluteFill>
  );
};

/**
 * The scene's stagger clock. `cue(0)`, `cue(1)`, … are the frames successive
 * elements enter on, already offset by the scene's own start delay — every
 * scene was recomputing `staggerDelay(i, motion?.stagger, sceneStartDelay(motion))`
 * inline, and a missed `baseDelay` argument silently desynced one element.
 */
export function useSceneCues(motion: SceneComponentProps["motion"]) {
  const baseDelay = sceneStartDelay(motion);
  return {
    baseDelay,
    cue: (index: number) => staggerDelay(index, motion?.stagger, baseDelay),
  };
}

/**
 * A headline/eyebrow line entering on the scene's shared timing. Wraps
 * `EnterOnCue` with the two props every scene passed it identically (the
 * scene's entrance preset and travel distance), so a scene only says WHICH
 * element and WHEN.
 */
export const SceneCue: React.FC<{
  motion: SceneComponentProps["motion"];
  delay: number;
  /** Used when the scene's `motion.entrance` is unset. */
  fallback?: "fade" | "slideUp";
  children: React.ReactNode;
}> = ({ motion, delay, fallback = "fade", children }) => (
  <EnterOnCue distance={motion?.entranceDistance} preset={motion?.entrance ?? fallback} delay={delay}>
    {children}
  </EnterOnCue>
);
