import type { VisualConfig } from "../../schema/visual";
import { fontSizes } from "../typography/tokens";
import { MONO_SIZE } from "../visuals/dev/devText";
import { screenFrameSize } from "../visuals/devices/screenFrameSize";
export const TRANSFORM_ZOOM = 1.04;
export type Size = {
  width: number;
  height: number;
};
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
      if (visual.frame === "plain") return screenFrameSize(visual.aspect);
      return visual.frame === "browser"
        ? { width: 860, height: 690 }
        : { width: 860, height: 540 };
    case "browser":
      return { width: 860, height: 690 };
    case "screen":
      return screenFrameSize(visual.aspect);
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
    case "checkpoint":
      if (visual.variant === "pill") return { width: 460, height: 70 };
      if (visual.variant === "compact") return { width: 520, height: 74 };
      return { width: 680, height: visual.detail ? 116 : 88 };
    case "pricing-card":
      return { width: 640, height: 420 + (visual.features?.length ?? 0) * 56 };
    case "app-mockup":
      return { width: 620, height: 720 };
    case "progress":
      return { width: 640, height: 110 };
    case "keycap": {
      const n = visual.keys.length;
      return {
        width: n * 300 + (n - 1) * 24,
        height: visual.caption ? 260 : 170,
      };
    }
    case "claude-cli": {
      const rows = visual.transcript?.length ?? 0;
      const overlayRows = visual.overlay ? visual.overlay.items.length + 1 : 0;
      const box = visual.overlay
        ? overlayRows * (MONO_SIZE * 1.3 + 28)
        : MONO_SIZE * 1.3 + 52;
      return {
        width: 820,
        height:
          rows * (MONO_SIZE * 1.3 + 12) +
          box +
          (visual.mode ? MONO_SIZE + 20 : 0) +
          40,
      };
    }
    case "terminal":
      return {
        width: 820,
        height: 120 + visual.lines.length * (MONO_SIZE * 1.25 + 16) + 56,
      };
    case "code-diff":
      return {
        width: 820,
        height:
          (visual.filename ? 76 : 0) +
          44 +
          visual.lines.length * (MONO_SIZE * 1.3 + 16),
      };
    case "flow": {
      const n = visual.nodes.length;
      const nodeSize = 260;
      const gap = 90;
      if (visual.direction === "vertical") {
        return {
          width: nodeSize + 120,
          height: n * (nodeSize + 60) + (n - 1) * gap,
        };
      }
      return { width: n * nodeSize + (n - 1) * gap, height: nodeSize + 90 };
    }
    case "node-group": {
      const radius = visual.radius ?? 300;
      return { width: radius * 2 + 220, height: radius * 2 + 220 };
    }
    case "stack": {
      const sizes = visual.items.map(naturalVisualSize);
      const maxW = Math.max(...sizes.map((s) => s.width));
      const maxH = Math.max(...sizes.map((s) => s.height));
      const n = visual.items.length;
      return visual.direction === "horizontal"
        ? { width: n * maxW + (n - 1) * 40, height: maxH }
        : { width: maxW, height: n * (maxH * 0.55) + maxH * 0.45 };
    }
    case "transform": {
      const from = naturalVisualSize(visual.from);
      const to = naturalVisualSize(visual.to);
      return {
        width: Math.max(from.width, to.width) * TRANSFORM_ZOOM,
        height: Math.max(from.height, to.height) * TRANSFORM_ZOOM,
      };
    }
    case "corner-props":
      return { width: 1080, height: 1920 };
    default:
      return { width: 400, height: 400 };
  }
}
export function fitScale(size: Size, box: Size, maxScale = 2): number {
  if (size.width <= 0 || size.height <= 0) return 1;
  return Math.min(box.width / size.width, box.height / size.height, maxScale);
}
