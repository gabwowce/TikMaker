import { videoProjectSchema, type VideoProject } from "../schema/project";
import type { PositionedVisualEntry, RichHeadlineLine, Scene, ScenePlanRole } from "../schema/scene";
import { colors } from "../video/typography/tokens";
import { autoScale, layoutPresets } from "../video/layout/layoutPresets";
import { naturalVisualSize } from "../video/layout/visualMetrics";
import { withOnScreenText } from "./projectStoryPlan";

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


/**
 * The size each scene type drew its headline at, before headlines became text
 * objects.
 *
 * Converting a legacy `headline` into a Rich Headline line has to LOOK the
 * same, and each scene component chose its own size: Hook Centered used
 * `HeroText`, Hook With Visual and Takeaway used `Headline`, everything else
 * used `Title`. Getting this table wrong would resize the opening frame of
 * every old video at once, which is why it is a table and not a default.
 */
const LEGACY_HEADLINE_SIZE: Record<string, RichHeadlineLine["size"]> = {
  "hook-centered": "hero",
  "hook-visual": "headline",
  takeaway: "headline",
  "visual-explainer": "title",
  "screen-demo": "title",
  comparison: "title",
  steps: "title",
};

/**
 * Folds `content.eyebrow` / `content.headline` into `content.richHeadline`.
 *
 * Same one-way migration as `primaryVisualAsLayer`, and for the same reason:
 * there were two ways to put text in a scene, each with its own fields, its own
 * editor and different capabilities — a headline could never be recoloured or
 * positioned, and a line could never be a headline. Old projects open unchanged
 * and re-save in the new shape.
 *
 * A scene that already has a rich headline is left alone: its lines are what it
 * renders, and the legacy fields were being ignored anyway.
 */
export function legacyTextAsLines(scene: Scene): Scene {
  const { eyebrow, headline, highlights, ...content } = scene.content;
  if (!eyebrow && !headline) return scene;
  if ((scene.content.richHeadline?.length ?? 0) > 0) {
    // Already migrated in spirit — drop the ignored leftovers so the editor
    // stops offering fields that change nothing.
    return { ...scene, content: { ...content, richHeadline: scene.content.richHeadline } };
  }

  const lines: RichHeadlineLine[] = [];
  if (eyebrow) {
    // The eyebrow was drawn small, spaced and in the accent colour; the line
    // has to say all three explicitly, because a line's default is none of them.
    lines.push({ text: eyebrow, size: "label", color: colors.accent, letterSpacing: 4 });
  }
  if (headline) {
    lines.push({
      text: headline,
      size: LEGACY_HEADLINE_SIZE[scene.type] ?? "headline",
      ...(highlights?.length ? { highlights } : {}),
    });
  }

  return { ...scene, content: { ...content, richHeadline: lines } };
}

export function normalizeScene(rawScene: Scene): Scene {
  // Text first, so the rest of this function only ever sees the new shape.
  const scene = legacyTextAsLines(rawScene);
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
  // One-time repair for the edit discussed with the author: an older 11-scene
  // draft and the intended 7-scene cut shared the same project id. No
  // `storyPlan` means this is still that legacy copy; once saved, normal edits
  // (including adding new scenes) are never filtered again.
  const repairClaudeFlow = project.id === "project-mtii3v8d"
    && !project.storyPlan
    && (project.scenes.length === 7 || project.scenes.length === 11);
  const sourceScenes = repairClaudeFlow && project.scenes.length === 11
    ? project.scenes.filter((scene) => [
        "scene-odn7i8z", "scene-01-hook", "scene-1gkt5f9", "scene-03-reveal",
        "scene-04-solution", "scene-05-step", "scene-10-cta",
      ].includes(scene.id))
    : project.scenes;
  const acceptedClaudeFlow = repairClaudeFlow
    ? [
        ["hook", "Stop the scroll with a familiar manual-testing pain.", "Claude Code marks on a dynamic background.", "Tired of testing apps manually?", "Tired of testing apps\nmanually?"],
        ["reveal", "Reveal the new capability in one clear promise.", "Claude Code with a real app open in Chrome.", "Claude Code can now test your app like a real user.", "Claude Code\ncan now test your app\nlike a real user."],
        ["benefit", "Turn the feature into two concrete developer benefits.", "Clock changes to a bug: less wasted time, fewer missed bugs.", "So you waste less time and catch more bugs.", "DON'T WASTE TIME\nDON'T MISS BUGS"],
        ["mechanism", "Explain how Claude gains access to the app.", "Claude Code and Google Chrome connect visually.", "It connects directly to Google Chrome.", "Claude Code\n+\nGoogle Chrome"],
        ["setup", "Show the extension being installed and added to Chrome.", "Install the Chrome extension and finish on the Add extension confirmation.", "First, install the extension, and add it to Chrome.", "INSTALL EXTENSION\nADD TO CHROME"],
        ["proof", "Show the prompt being sent and Claude testing through the extension.", "Open the extension panel, send the prompt, then show Claude navigating the website by itself.", "Open it, send your prompt, and watch Claude test the app.", "OPEN & SEND PROMPT\nWATCH CLAUDE TEST"],
        ["cta", "End with one clear next action.", "Clean end card with an arrow and Claude mark.", "Follow for more practical AI building tips.", "FOLLOW FOR MORE\nAI BUILDING TIPS"],
      ] as const
    : null;

  return { ...project, storyPlan: project.storyPlan ?? (acceptedClaudeFlow ? {
    targetDuration: 30,
    premise: "Claude Code can test a web app like a real user through Google Chrome.",
    audience: "Developers and AI app builders",
  } : undefined), scenes: sourceScenes.map((raw, index) => {
    let scene = normalizeScene(raw);
    // Recover only the exact scene-5 caption accidentally written by the
    // development patch. This is deliberately signature-scoped: it cannot
    // overwrite a later caption authored by the user or touch another project.
    if (project.id === "project-mtii3v8d" && scene.id === "scene-04-solution"
      && scene.content.richHeadline?.[0]?.text === "INSTALL EXTENSION\nADD TO CHROME") {
      scene = {
        ...scene,
        content: {
          ...scene.content,
          richHeadline: [{
            text: "INSTALL THE EXTENSION",
            size: "title",
            lane: 0,
            delay: 18,
            exitAt: 57,
            exit: "fade",
            x: 50,
            y: 21.992481203007518,
            splitDuration: 30,
            exitDuration: 3,
            color: "#d97757",
          }, ...scene.content.richHeadline.slice(1)],
        },
      };
    }
    const accepted = acceptedClaudeFlow?.[index];
    if (accepted) return {
      ...withOnScreenText(scene, accepted[4]),
      vo: accepted[3],
      plan: { role: accepted[0], purpose: accepted[1], visualBrief: accepted[2] },
    };
    if (scene.plan) return scene;
    const role: ScenePlanRole = scene.type === "screen-demo"
      ? "demo"
      : scene.type === "takeaway"
        ? "payoff"
        : scene.type === "hook-centered"
          ? "hook"
          : scene.type === "hook-visual"
            ? "reveal"
            : "benefit";
    return {
      ...scene,
      plan: {
        role,
        purpose: undefined,
        // Existing author notes remain where they are. They often combine a
        // visual brief and edit note, so guessing how to split them would lose
        // meaning; the unified editor lets the author do it explicitly.
        visualBrief: undefined,
      },
    };
  }) };
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
