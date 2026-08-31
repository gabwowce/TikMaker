import { videoProjectSchema, type VideoProject } from "../schema/project";
import type { PositionedVisualEntry, Scene } from "../schema/scene";
import { autoScale, layoutPresets } from "../video/layout/layoutPresets";
import { naturalVisualSize } from "../video/layout/visualMetrics";

/**
 * Every visual is ONE kind of thing: an entry in `content.visuals[]`, ordered
 * bottom-to-top, each with the same position/scale/in/out/sfx/carry controls.
 *
 * A scene's `visual` + its `visualXxx` sibling fields were a second, parallel
 * way to place a graphic — one that couldn't be reordered against the freeform
 * layers and had its own half of the settings living on the scene instead of on
 * the visual. That split is what made some visuals "extra" and others not.
 * Loading a project folds the primary into the layer list, so downstream code
 * (renderer, inspector, link/carry resolution) only ever sees layers.
 *
 * Projects on disk keep the old shape and still open — the fold happens at
 * parse time, and re-saving writes the normalized form.
 */

/**
 * Where a primary visual lands when the scene never pinned it. Untouched, such
 * a visual FLOWED inside the text column, which has no coordinates to carry
 * over. `visual-bottom` is the preset that means "centered in the space below
 * the headline" — literally what visual-explainer/screen-demo did with their
 * `flex: 1` visual slot, and close enough for the centered scene types that the
 * layer lands where the flowed one did.
 */
const INLINE_FALLBACK_LAYOUT = "visual-bottom" as const;

/** True for visuals that render full-bleed behind everything (orbit rings,
 * corner props) — see `isFullBleedVisual`. Their x/y/scale are ignored at render
 * time, so migrating them just needs a stable placeholder. */
function isBackdrop(scene: Scene): boolean {
  const v = scene.visual;
  if (!v) return false;
  return v.type === "corner-props" || (v.type === "node-group" && v.layout === "orbit");
}

/** The primary visual expressed as a layer entry, with its scene-level
 * `visualXxx` settings moved onto the entry itself. */
export function primaryVisualAsLayer(scene: Scene): PositionedVisualEntry | null {
  const visual = scene.visual;
  if (!visual) return null;

  const preset = layoutPresets[scene.layout ?? INLINE_FALLBACK_LAYOUT];
  const position = scene.visualPosition ?? preset.visual;
  // Auto-fit is what kept a visual inside the safe box without anyone tuning a
  // number, so it has to be baked in — otherwise a migrated layer defaults to
  // 1x and an oversized asset suddenly overflows.
  const scale = scene.visualScale ?? autoScale(visual, preset);

  return {
    id: `primary-${scene.id}`,
    visual,
    x: position.x,
    y: position.y,
    // A backdrop ignores position/scale entirely; keeping its scale unset
    // avoids writing a meaningless number into the project file.
    scale: isBackdrop(scene) ? undefined : scale,
    // The primary visual fell back to the scene's own entrance when it had no
    // opinion of its own; a layer has no such fallback, so resolve it now.
    entrance: scene.visualEntrance ?? scene.motion?.entrance,
    exit: scene.visualExit,
    exitDuration: scene.visualExitDuration,
    entranceDistance: scene.visualEntranceDistance,
    exitDistance: scene.visualExitDistance,
    kenBurns: scene.visualKenBurns,
    sfx: scene.visualSfx,
    exitSfx: scene.visualExitSfx,
    link: scene.visualLink,
  };
}

/** Default corner slots, as percent of the canvas — the fixed spots the old
 * CornerFloat composition parked its two props at. */
const CORNER_SLOTS = {
  tl: { x: (150 / 1080) * 100, y: (340 / 1920) * 100 },
  tr: { x: ((1080 - 150) / 1080) * 100, y: (340 / 1920) * 100 },
  bl: { x: (150 / 1080) * 100, y: ((1920 - 380) / 1920) * 100 },
  br: { x: ((1080 - 150) / 1080) * 100, y: ((1920 - 380) / 1920) * 100 },
} as const;

const CORNER_PAIRS = { tlbr: ["tl", "br"], trbl: ["tr", "bl"] } as const;

/**
 * `corner-props` drew TWO props from one entry, which meant the pair shared a
 * single size, a single entrance and no exit at all — the props could never be
 * sized, animated or carried independently, and the compound needed its own
 * bespoke inspector to fake a fraction of what a layer already does.
 *
 * Splitting it into two ordinary layers gives each prop the full standard set
 * (position, scale, In/Out, Ken Burns, sound, carry, z-index) with no special
 * cases. The drift that made the composition worth having survives as the
 * `float` Ken Burns preset, so the split is invisible until you start moving
 * things.
 */
export function splitCornerProps(entry: PositionedVisualEntry): PositionedVisualEntry[] {
  const visual = entry.visual;
  if (visual.type !== "corner-props") return [entry];

  const size = visual.size ?? 480;
  // A lone asset was duplicated into BOTH corners — mirror that.
  const assets = visual.assets.length === 1 ? [visual.assets[0], visual.assets[0]] : visual.assets.slice(0, 2);
  const corners = CORNER_PAIRS[visual.diagonal ?? "tlbr"];

  return assets.map((asset, index) => {
    const override = visual.offsets?.[index];
    const slot = override ?? CORNER_SLOTS[corners[index] ?? corners[0]];
    return {
      ...entry,
      id: `${entry.id}-corner-${index}`,
      visual: asset,
      x: slot.x,
      y: slot.y,
      // CornerFloat drew at an absolute pixel size regardless of the asset's
      // natural size; a layer scales relative to it, so convert.
      scale: Number((size / naturalVisualSize(asset).width).toFixed(3)),
      entrance: entry.entrance ?? "pop",
      kenBurns: "float",
      // A carry links ONE element to a neighbouring scene. Two layers can't
      // share one group id without both claiming the same chain, so only the
      // first keeps it.
      link: index === 0 ? entry.link : undefined,
    };
  });
}

export function normalizeScene(scene: Scene): Scene {
  const primary = primaryVisualAsLayer(scene);
  const existing = scene.content.visuals ?? [];

  if (!primary) {
    const split = existing.flatMap(splitCornerProps);
    if (split.length === existing.length) return scene;
    return { ...scene, content: { ...scene.content, visuals: split } };
  }

  const {
    visual: _visual,
    visualPosition: _visualPosition,
    visualEntrance: _visualEntrance,
    visualExit: _visualExit,
    visualExitDuration: _visualExitDuration,
    visualEntranceDistance: _visualEntranceDistance,
    visualExitDistance: _visualExitDistance,
    visualScale: _visualScale,
    visualLink: _visualLink,
    visualKenBurns: _visualKenBurns,
    visualSfx: _visualSfx,
    visualExitSfx: _visualExitSfx,
    ...rest
  } = scene;

  return {
    ...rest,
    content: {
      ...scene.content,
      // First = bottom of the stack. The primary visual drew beneath the
      // freeform layers before, so it keeps that spot and nothing re-stacks.
      visuals: [primary, ...existing].flatMap(splitCornerProps),
    },
  };
}

export function normalizeProject(project: VideoProject): VideoProject {
  return { ...project, scenes: project.scenes.map(normalizeScene) };
}

/**
 * Drags positions back onto the canvas BEFORE the schema sees them.
 *
 * `x`/`y` are percentages with a 0-100 range, and a single value outside it
 * failed the whole `videoProjectSchema.parse` — which the project library reads
 * as "corrupt entry", silently dropping the ENTIRE video. One layer nudged off
 * the top edge should cost you that layer's position, not the project. (It
 * happened for real: the new-layer fan in `VisualLibrary` marched each addition
 * 12% higher until the sixth landed at y: -10.)
 *
 * Clamping rather than discarding also puts the element back where you can see
 * and move it, instead of leaving it invisible off-frame.
 */
function clampPositions(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const project = json as { scenes?: unknown[] };
  if (!Array.isArray(project.scenes)) return json;

  const clamp = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : value;

  const clampEntry = (entry: unknown) => {
    if (!entry || typeof entry !== "object") return entry;
    const positioned = entry as { x?: unknown; y?: unknown };
    if (typeof positioned.x === "number") positioned.x = clamp(positioned.x);
    if (typeof positioned.y === "number") positioned.y = clamp(positioned.y);
    return entry;
  };

  for (const scene of project.scenes) {
    const content = (scene as { content?: { visuals?: unknown[]; blocks?: unknown[]; richHeadline?: unknown[] } })
      ?.content;
    if (!content) continue;
    for (const list of [content.visuals, content.blocks, content.richHeadline]) {
      if (Array.isArray(list)) list.forEach(clampEntry);
    }
  }
  return json;
}

/** Parse + normalize. Use this everywhere a project enters the app (bundled
 * templates, the store, JSON import) so no code downstream has to handle the
 * pre-layer shape. */
export function parseProject(json: unknown): VideoProject {
  return normalizeProject(videoProjectSchema.parse(clampPositions(json)));
}
