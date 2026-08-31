import type { VisualConfig } from "../../schema/visual";
import type { CustomAsset } from "../state/customAssetsStore";
import { buildAssetOptions } from "../panels/InspectorPanel";

export type TimelinePreview = { src?: string; video?: boolean; label: string };

/** Finds a useful media preview even when it is wrapped in a phone/browser or
 * compound visual. Code-native visuals still get a descriptive label. */
export function visualTimelinePreview(visual: VisualConfig, custom: CustomAsset[]): TimelinePreview {
  if (visual.type === "image") return { src: visual.src, label: "image" };
  if (visual.type === "recording") return { src: visual.src, video: true, label: "recording" };
  if (visual.type === "prop" || visual.type === "tool-logo") {
    const key = visual.type === "prop" ? `prop:${visual.asset}` : `tool:${visual.tool}`;
    const match = buildAssetOptions(custom).find((asset) => asset.key === key);
    return { src: match?.src, label: match?.label ?? visual.type };
  }
  if (visual.type === "browser" || visual.type === "screen" || visual.type === "phone") return visualTimelinePreview(visual.content, custom);
  if (visual.type === "tool-flow") {
    const match = buildAssetOptions(custom).find((asset) => asset.key === `tool:${visual.tools[0]}`);
    return { src: match?.src, label: visual.tools.join(" → ") };
  }
  if (visual.type === "corner-props" && visual.assets[0]) return visualTimelinePreview(visual.assets[0], custom);
  if (visual.type === "stack" && visual.items[0]) return visualTimelinePreview(visual.items[0], custom);
  return { label: visual.type };
}
