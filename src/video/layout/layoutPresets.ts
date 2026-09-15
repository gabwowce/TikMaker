import { layoutIdSchema, type LayoutId, type Scene } from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";
import { safeArea } from "../typography/tokens";
import { MAX_LINE_CHARS } from "../visuals/dev/devText";
import { fitScale, naturalVisualSize, type Size } from "./visualMetrics";
export type TextZone = "top" | "center" | "bottom";
export const SAFE_CONTENT_WIDTH = 1080 - safeArea.left - safeArea.right;
export type LayoutPreset = {
  visual: {
    x: number;
    y: number;
  };
  box: Size;
  textZone: TextZone;
  maxScale: number;
  description: string;
};
export const layoutPresets = {
  "visual-hero": {
    visual: { x: 50, y: 52 },
    box: { width: SAFE_CONTENT_WIDTH, height: 900 },
    textZone: "top",
    maxScale: 2.2,
    description: "Headline at the top, one large visual owning the middle.",
  },
  "visual-top": {
    visual: { x: 50, y: 26 },
    box: { width: SAFE_CONTENT_WIDTH, height: 420 },
    textZone: "center",
    maxScale: 1.8,
    description: "Visual above, headline centered under it.",
  },
  "visual-bottom": {
    visual: { x: 50, y: 57 },
    box: { width: SAFE_CONTENT_WIDTH, height: 860 },
    textZone: "top",
    maxScale: 2,
    description: "Headline at the top, visual centered in the space below it.",
  },
  "icon-corner-tr": {
    visual: { x: 84, y: 16 },
    box: { width: 200, height: 200 },
    textZone: "center",
    maxScale: 1,
    description: "Small icon pinned top-right, text keeps the middle.",
  },
  "icon-corner-tl": {
    visual: { x: 16, y: 16 },
    box: { width: 200, height: 200 },
    textZone: "center",
    maxScale: 1,
    description: "Small icon pinned top-left, text keeps the middle.",
  },
  "icon-corner-br": {
    visual: { x: 84, y: 78 },
    box: { width: 200, height: 200 },
    textZone: "center",
    maxScale: 1,
    description: "Small icon pinned bottom-right, text keeps the middle.",
  },
  "icon-corner-bl": {
    visual: { x: 16, y: 78 },
    box: { width: 200, height: 200 },
    textZone: "center",
    maxScale: 1,
    description: "Small icon pinned bottom-left, text keeps the middle.",
  },
  "text-only": {
    visual: { x: 50, y: 50 },
    box: { width: 0, height: 0 },
    textZone: "center",
    maxScale: 1,
    description: "No visual — the words are the whole frame.",
  },
} as const satisfies Record<LayoutId, LayoutPreset>;
export const layoutIds = layoutIdSchema.options;
export function fitPositionedVisual(
  visual: VisualConfig,
  explicitScale?: number,
): number {
  if (typeof explicitScale === "number") return explicitScale;
  const size = naturalVisualSize(visual);
  return Math.min(1, SAFE_CONTENT_WIDTH / size.width);
}
export function autoScale(visual: VisualConfig, preset: LayoutPreset): number {
  if (preset.box.width === 0 || preset.box.height === 0) return 1;
  return fitScale(naturalVisualSize(visual), preset.box, preset.maxScale);
}
export function resolveTextZone(
  layout: LayoutId | undefined,
  fallback: TextZone,
): TextZone {
  return layout ? layoutPresets[layout].textZone : fallback;
}
export const textZoneJustify: Record<
  TextZone,
  "flex-start" | "center" | "flex-end"
> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};
export function visualOverflowWarning(
  visual: VisualConfig,
  position: {
    x: number;
    y: number;
  },
  scale: number,
): string | null {
  if (visual.type === "corner-props") return null;
  if (visual.type === "node-group" && visual.layout === "orbit") return null;
  if (visual.type === "terminal" || visual.type === "code-diff") {
    const tooLong = visual.lines.filter((l) => l.text.length > MAX_LINE_CHARS);
    if (tooLong.length > 0) {
      return `${tooLong.length} line(s) longer than ${MAX_LINE_CHARS} characters will be cut off — shorten them.`;
    }
  }
  const size = naturalVisualSize(visual);
  const w = size.width * scale;
  const h = size.height * scale;
  const cx = (position.x / 100) * 1080;
  const cy = (position.y / 100) * 1920;
  const over: string[] = [];
  if (cx - w / 2 < safeArea.left) over.push("left");
  if (cx + w / 2 > 1080 - safeArea.right) over.push("right");
  if (cy - h / 2 < 0) over.push("top");
  if (cy + h / 2 > 1920) over.push("bottom");
  if (over.length === 0) return null;
  return `Crosses the ${over.join(" and ")} safe margin — reduce Scale or move it.`;
}
export function layerOverflowWarning(entry: {
  visual: VisualConfig;
  x: number;
  y: number;
  scale?: number;
}): string | null {
  return visualOverflowWarning(
    entry.visual,
    { x: entry.x, y: entry.y },
    fitPositionedVisual(entry.visual, entry.scale),
  );
}
