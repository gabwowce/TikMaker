import React from "react";
import type { BackgroundId } from "../../schema/scene";
import { SolidDark } from "./SolidDark";
import { SoftGrid } from "./SoftGrid";
import { OrangeGlow } from "./OrangeGlow";
import { Spotlight } from "./Spotlight";
import { PerspectiveDataGrid } from "./PerspectiveDataGrid";
import { FloatingGlassLayers } from "./FloatingGlassLayers";
import { DotGrid } from "./DotGrid";

const backgroundComponents: Record<BackgroundId, React.FC> = {
  "solid-dark": SolidDark,
  "soft-grid": SoftGrid,
  "orange-glow": OrangeGlow,
  spotlight: Spotlight,
  "perspective-data-grid": PerspectiveDataGrid,
  "floating-glass-layers": FloatingGlassLayers,
  "dot-grid": DotGrid,
};

export const Background: React.FC<{ id: BackgroundId }> = ({ id }) => {
  const Component = backgroundComponents[id] ?? SolidDark;
  return <Component />;
};
