import { fontSizes } from "../typography/tokens";
import { MONO_SIZE } from "../visuals/dev/devText";
import type { VisualConfig } from "../../schema/visual";

/** How far a `transform` visual's "to" state zooms past its resting size
 * during the crossfade. Lives here, not in the Transform component, so this
 * module stays a leaf: it is read while a project is being normalized at
 * import time, and pulling a React component (and through it the whole
 * VisualRenderer graph) into that path made the binding land in the temporal
 * dead zone depending on module evaluation order. */
export const TRANSFORM_ZOOM = 1.04;

export type Size = { width: number; height: number };

/**
 * Approximate on-screen box a visual occupies at scale 1, in canvas pixels.
 *
 * These mirror the hardcoded dimensions inside `src/video/visuals/**` (e.g.
 * `PropAsset`'s 260px, `Checklist`'s 640px min-width). They deliberately round
 * UP where a component is text-driven and can't be measured statically —
 * over-estimating makes the auto-fit slightly conservative, which is the safe
 * direction: a visual that ends up a little smaller than it could be is a
 * non-event, one that runs off the frame is a broken video.
 *
 * When a visual component's own size constants change, update the matching
 * entry here or auto-fit will quietly start lying.
 */
export function naturalVisualSize(visual: VisualConfig): Size {
  switch (visual.type) {
    case "prop":
      return { width: 260, height: 260 };

    case "tool-logo":
      return { width: 220, height: visual.showName ? 300 : 220 };

    case "tool-flow": {
      const n = visual.tools.length;
      return { width: n * 200 + (n - 1) * 70, height: 200 };
    }

    case "image":
      return { width: 700, height: 700 };

    case "recording":
      if (visual.frame === "phone") return { width: 460, height: 940 };
      // Browser frame now carries a tab strip + address bar; a bare clip has none.
      return visual.frame === "browser" ? { width: 860, height: 690 } : { width: 860, height: 540 };

    case "browser":
      // 860 wide, 16:10 content (537) plus the tab strip + address bar chrome.
      return { width: 860, height: 690 };

    case "phone":
      return { width: 460, height: 940 };

    case "stat-counter":
      return { width: 620, height: fontSizes.hero + fontSizes.label + 40 };

    case "checklist": {
      const rowFont = fontSizes[visual.size ?? "bodyLarge"];
      const rowHeight = Math.max(rowFont * 1.2, 36) + 36;
      const count = visual.items.length;
      return { width: 700, height: count * rowHeight + (count - 1) * 20 };
    }

    case "pricing-card":
      return { width: 640, height: 420 + (visual.features?.length ?? 0) * 56 };

    case "app-mockup":
      return { width: 620, height: 720 };

    case "progress":
      return { width: 640, height: 110 };

    case "keycap": {
      const n = visual.keys.length;
      // Matches Keycap.tsx's 260px min cap + 56px side padding and its
      // caption row; drawn near final size so auto-fit scales DOWN, not up.
      return { width: n * 300 + (n - 1) * 24, height: visual.caption ? 260 : 170 };
    }

    case "claude-cli": {
      const rows = visual.transcript?.length ?? 0;
      const overlayRows = visual.overlay ? visual.overlay.items.length + 1 : 0;
      const box = visual.overlay ? overlayRows * (MONO_SIZE * 1.3 + 28) : MONO_SIZE * 1.3 + 52;
      return {
        width: 820,
        height: rows * (MONO_SIZE * 1.3 + 12) + box + (visual.mode ? MONO_SIZE + 20 : 0) + 40,
      };
    }

    case "terminal":
      return { width: 820, height: 120 + visual.lines.length * (MONO_SIZE * 1.25 + 16) + 56 };

    case "code-diff":
      return {
        width: 820,
        height: (visual.filename ? 76 : 0) + 44 + visual.lines.length * (MONO_SIZE * 1.3 + 16),
      };

    case "flow": {
      const n = visual.nodes.length;
      const nodeSize = 260;
      const gap = 90;
      if (visual.direction === "vertical") {
        return { width: nodeSize + 120, height: n * (nodeSize + 60) + (n - 1) * gap };
      }
      return { width: n * nodeSize + (n - 1) * gap, height: nodeSize + 90 };
    }

    case "node-group": {
      const radius = visual.radius ?? 300;
      return { width: radius * 2 + 220, height: radius * 2 + 220 };
    }

    case "stack": {
      // Same wrapper reasoning as `transform`: measure the children.
      const sizes = visual.items.map(naturalVisualSize);
      const maxW = Math.max(...sizes.map((s) => s.width));
      const maxH = Math.max(...sizes.map((s) => s.height));
      const n = visual.items.length;
      return visual.direction === "horizontal"
        ? { width: n * maxW + (n - 1) * 40, height: maxH }
        : { width: maxW, height: n * (maxH * 0.55) + maxH * 0.45 };
    }

    case "transform": {
      // A wrapper, not a shape of its own — it is exactly as big as the larger
      // of the two states it crossfades between. Returning a fixed guess here
      // made auto-fit scale the real content up ~2x and push it off frame.
      const from = naturalVisualSize(visual.from);
      const to = naturalVisualSize(visual.to);
      // Includes the crossfade zoom, so the enlarged "to" state is what gets
      // fitted — not the resting size it briefly exceeds.
      return {
        width: Math.max(from.width, to.width) * TRANSFORM_ZOOM,
        height: Math.max(from.height, to.height) * TRANSFORM_ZOOM,
      };
    }

    case "corner-props":
      // Full-bleed backdrop — never participates in fitting.
      return { width: 1080, height: 1920 };

    default:
      return { width: 400, height: 400 };
  }
}

/** Largest uniform scale at which `size` fits inside `box`, capped at `maxScale`
 * so auto-fit never blows a small icon up into a blurry hero. */
export function fitScale(size: Size, box: Size, maxScale = 2): number {
  if (size.width <= 0 || size.height <= 0) return 1;
  return Math.min(box.width / size.width, box.height / size.height, maxScale);
}
