import type { VisualConfig } from "../../schema/visual";

/**
 * Visuals that draw against the WHOLE 1080x1920 canvas rather than sitting at
 * a point: an orbit ring encircles the frame's centre, corner props park at its
 * corners. `VisualsLayer` gives these the full frame and ignores the layer's
 * own x/y/scale, which would otherwise fight the composition's own geometry.
 *
 * Kept in its own leaf module (no React, no component imports) so layout and
 * project-normalization code can ask the question without pulling the renderer
 * graph in behind it — see the TRANSFORM_ZOOM note in `visualMetrics.ts` for
 * what that cycle cost last time.
 */
export function isFullBleedVisual(visual: VisualConfig | undefined): visual is VisualConfig {
  if (!visual) return false;
  if (visual.type === "node-group" && visual.layout === "orbit") return true;
  if (visual.type === "corner-props") return true;
  return false;
}
