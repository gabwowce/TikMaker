import { naturalVisualSize, fitScale, type Size } from "./visualMetrics";
import { MAX_LINE_CHARS } from "../visuals/dev/devText";
import { safeArea } from "../typography/tokens";
import { layoutIdSchema, type LayoutId, type Scene } from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";

/**
 * Named compositions, so a scene says WHERE its visual belongs rather than
 * carrying hand-tuned percentages that nothing validates. Each preset owns a
 * rectangle the visual must fit inside, and the visual is auto-scaled down to
 * fit it — which is what makes "the visual runs off the frame" structurally
 * impossible instead of a thing you catch by eye after rendering.
 *
 * Each preset also declares which band the scene's TEXT occupies, so the text
 * and the visual can't be placed on top of each other.
 */

export type TextZone = "top" | "center" | "bottom";

/**
 * Widest a visual may be drawn. TikTok overlays its own UI down both sides of
 * the frame, so anything wider than the text-safe box (1080 - 2x130) risks
 * sitting under the share/like column on a real phone — visuals get the same
 * side margins as text, not the full canvas.
 */
export const SAFE_CONTENT_WIDTH = 1080 - safeArea.left - safeArea.right;

export type LayoutPreset = {
  /** Center of the visual's box, in percent of the 1080x1920 canvas. */
  visual: { x: number; y: number };
  /** Room the visual gets at that spot, in canvas px. */
  box: Size;
  /** Where this composition puts the headline/eyebrow stack. */
  textZone: TextZone;
  /** Auto-fit never enlarges past this, so a 220px icon doesn't become a
   * pixelated hero just because the box is big. */
  maxScale: number;
  description: string;
};

/**
 * Canvas is 1080x1920 with a TikTok-safe box of 130 left/right, 220 top,
 * 500 bottom. Visual boxes may reach a little past the text-safe area
 * (graphics tolerate it, text doesn't) but never past ~90px from an edge.
 */
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
    // A visual is CENTERED in its box, so the box has to cover the whole
    // region below the headline — not a narrow band near the bottom. Anchored
    // low (y 70) this centred a small visual near the bottom edge and left a
    // dead gap under the headline; 57 puts small and large visuals alike in
    // the optical middle of the space they actually have.
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

export type Placement = { position: { x: number; y: number }; scale: number };

/** Where a scene's primary visual actually lands, and how big. Explicit
 * `visualPosition`/`visualScale` still win (hand-placed art direction, and the
 * `visualLink` glide authored before layouts existed); otherwise the scene's
 * `layout` preset decides and the visual is fitted to that preset's box. */
export function resolveScenePlacement(scene: Scene): Placement | null {
  const visual = scene.visual;
  if (!visual) return null;

  const preset = scene.layout ? layoutPresets[scene.layout] : undefined;

  const position = scene.visualPosition ?? preset?.visual;
  if (!position) return null;

  const scale = scene.visualScale ?? (preset ? autoScale(visual, preset) : 1);
  return { position, scale };
}

/**
 * Auto-fit for a freeform `content.visuals[]` entry, which has no layout
 * preset of its own. Without this a positioned visual is the one remaining way
 * to push content past the side-safe margins — the exact failure the presets
 * exist to prevent. An explicit `scale` on the entry still wins.
 */
export function fitPositionedVisual(visual: VisualConfig, explicitScale?: number): number {
  if (typeof explicitScale === "number") return explicitScale;
  const size = naturalVisualSize(visual);
  // Never enlarge: these are accents layered over a scene that already has a
  // primary visual, so the only job here is to stop an oversized one.
  return Math.min(1, SAFE_CONTENT_WIDTH / size.width);
}

export function autoScale(visual: VisualConfig, preset: LayoutPreset): number {
  if (preset.box.width === 0 || preset.box.height === 0) return 1;
  return fitScale(naturalVisualSize(visual), preset.box, preset.maxScale);
}

/** The text band for a scene — the layout's zone, or the scene type's own
 * default when no layout preset is set. */
export function resolveTextZone(layout: LayoutId | undefined, fallback: TextZone): TextZone {
  return layout ? layoutPresets[layout].textZone : fallback;
}

export const textZoneJustify: Record<TextZone, "flex-start" | "center" | "flex-end"> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};

/**
 * Overflow check for one placed visual — reports when its box crosses the
 * canvas edge. An explicit `scale` bypasses auto-fit, so this is the safety net
 * that makes a hand-tuned number visibly wrong in the editor instead of
 * silently wrong in the render.
 */
export function visualOverflowWarning(
  visual: VisualConfig,
  position: { x: number; y: number },
  scale: number
): string | null {
  // Orbit rings and corner props are drawn full-bleed against the canvas, not
  // placed at a point — position and scale don't describe them.
  if (visual.type === "corner-props") return null;
  if (visual.type === "node-group" && visual.layout === "orbit") return null;

  // Code-like visuals clip rather than shrink — a long line just disappears
  // off the right edge of the window, which is invisible until you watch the
  // render. Catch it on the data instead.
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

  // Checked against the TikTok-safe box, not the raw canvas — a visual that
  // technically fits 1080px wide still lands under TikTok's own side UI.
  const over: string[] = [];
  if (cx - w / 2 < safeArea.left) over.push("left");
  if (cx + w / 2 > 1080 - safeArea.right) over.push("right");
  if (cy - h / 2 < 0) over.push("top");
  if (cy + h / 2 > 1920) over.push("bottom");

  if (over.length === 0) return null;
  return `Crosses the ${over.join(" and ")} safe margin — reduce Scale or move it.`;
}

/** The same check for a layer entry, which carries its own position/scale. */
export function layerOverflowWarning(entry: {
  visual: VisualConfig;
  x: number;
  y: number;
  scale?: number;
}): string | null {
  return visualOverflowWarning(entry.visual, { x: entry.x, y: entry.y }, fitPositionedVisual(entry.visual, entry.scale));
}
