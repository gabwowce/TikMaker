import React from "react";
import type { BackgroundId, SceneBackground } from "../../schema/scene";
import { SolidDark } from "./SolidDark";
import { SoftGrid } from "./SoftGrid";
import { OrangeGlow } from "./OrangeGlow";
import { Spotlight } from "./Spotlight";
import { PerspectiveDataGrid } from "./PerspectiveDataGrid";
import { FloatingGlassLayers } from "./FloatingGlassLayers";
import { DotGrid } from "./DotGrid";
import { CustomBackground } from "./CustomBackground";

const backgroundComponents: Record<BackgroundId, React.FC> = {
  "solid-dark": SolidDark,
  "soft-grid": SoftGrid,
  "orange-glow": OrangeGlow,
  spotlight: Spotlight,
  "perspective-data-grid": PerspectiveDataGrid,
  "floating-glass-layers": FloatingGlassLayers,
  "dot-grid": DotGrid,
};

/** A scene's background is either a named preset (string id) or a hand-built
 * `{ type: "custom", fill, grid }` — see `schema/scene.ts#sceneBackgroundSchema`. */
export const Background: React.FC<{ id: SceneBackground }> = ({ id }) => {
  if (typeof id === "object") return <CustomBackground config={id} />;
  const Component = backgroundComponents[id] ?? SolidDark;
  return <Component />;
};
