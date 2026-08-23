import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { VisualRenderer } from "../visuals/VisualRenderer";
import { standardEasing } from "../motion/easing";
import type { VisualConfig } from "../../schema/visual";

/**
 * A visual that reads as a ring or a pair of corner accents around the whole
 * scene, not something competing for space alongside the headline.
 */
export function isOrbitBackdrop(visual: VisualConfig | undefined): visual is VisualConfig {
  if (!visual) return false;
  if (visual.type === "node-group" && visual.layout === "orbit") return true;
  if (visual.type === "corner-props") return true;
  return false;
}

const FADE_FRAMES = 18;

/**
 * Renders full-bleed, behind every text element and any other visual,
 * instead of in the normal visual slot inside the scene's padded content
 * column — see isOrbitBackdrop for which visual types qualify. It doesn't
 * take a position or slide direction (it's meant to be full-bleed/centered),
 * but it does fade in with the scene's entrance and fade out with its exit,
 * same as everything else, so it isn't a silent exception to those settings.
 */
export const OrbitBackdrop: React.FC<{ visual?: VisualConfig; exitOpacity?: number }> = ({
  visual,
  exitOpacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!isOrbitBackdrop(visual)) return null;

  const enterOpacity = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: enterOpacity * exitOpacity }}
    >
      <VisualRenderer visual={visual} />
    </AbsoluteFill>
  );
};
