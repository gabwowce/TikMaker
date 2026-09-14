import { type ComponentType } from "react";
import type { BackgroundId, SceneBackground } from "../../schema/scene";
import { CustomBackground } from "./CustomBackground";
import { DotGrid } from "./DotGrid";
import { FloatingGlassLayers } from "./FloatingGlassLayers";
import { OrangeGlow } from "./OrangeGlow";
import { PerspectiveDataGrid } from "./PerspectiveDataGrid";
import { SoftGrid } from "./SoftGrid";
import { SolidDark } from "./SolidDark";
import { Spotlight } from "./Spotlight";
const backgroundComponents: Record<BackgroundId, ComponentType> = {
  "solid-dark": SolidDark,
  "soft-grid": SoftGrid,
  "orange-glow": OrangeGlow,
  spotlight: Spotlight,
  "perspective-data-grid": PerspectiveDataGrid,
  "floating-glass-layers": FloatingGlassLayers,
  "dot-grid": DotGrid,
};
type BackgroundProps = {
  id: SceneBackground;
};
export function Background({ id }: BackgroundProps) {
  if (typeof id === "object") return <CustomBackground config={id} />;
  const Component = backgroundComponents[id] ?? SolidDark;
  return <Component />;
}
