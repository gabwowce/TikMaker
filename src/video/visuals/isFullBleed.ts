import type { VisualConfig } from "../../schema/visual";
export function isFullBleedVisual(
  visual: VisualConfig | undefined,
): visual is VisualConfig {
  if (!visual) return false;
  if (visual.type === "node-group" && visual.layout === "orbit") return true;
  if (visual.type === "corner-props") return true;
  return false;
}
