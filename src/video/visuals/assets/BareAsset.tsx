import React from "react";
import { Img } from "remotion";
import { getTool } from "../../../registries/toolRegistry";
import { getProp } from "../../../registries/propRegistry";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";

/**
 * Renders a prop or tool logo as just its mark, at an exact size, with no
 * plate/background — for visuals that sit behind other content (an orbiting
 * ring, floating corner props) where the standalone-visual chrome would be
 * unwanted. Falls back to the normal VisualRenderer for anything else.
 */
export const BareAsset: React.FC<{ visual: VisualConfig; size: number }> = ({ visual, size }) => {
  if (visual.type === "tool-logo") {
    const tool = getTool(visual.tool);
    if (!tool) return null;
    return <Img src={tool.src} style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  if (visual.type === "prop") {
    const prop = getProp(visual.asset);
    if (!prop) return null;
    return <Img src={prop.src} style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return <VisualRenderer visual={visual} />;
};
