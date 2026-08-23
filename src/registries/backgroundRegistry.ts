import type { BackgroundId } from "../schema/scene";

export type BackgroundDefinition = {
  id: BackgroundId;
  name: string;
  description: string;
};

export const backgroundRegistry: BackgroundDefinition[] = [
  { id: "solid-dark", name: "Solid Dark", description: "Flat #171717 background." },
  { id: "soft-grid", name: "Soft Grid", description: "Very subtle technical grid." },
  { id: "orange-glow", name: "Orange Glow", description: "Dark background with a soft moving orange light." },
  { id: "spotlight", name: "Spotlight", description: "Subtle radial light around the primary object." },
  {
    id: "perspective-data-grid",
    name: "Perspective Data Grid",
    description: "Static image: deep charcoal perspective grid with orange light pulses near the bottom.",
  },
  {
    id: "floating-glass-layers",
    name: "Floating Glass Layers",
    description: "Oversized translucent glass panels drifting slowly behind the content.",
  },
  {
    id: "dot-grid",
    name: "Dot Grid",
    description: "Dark charcoal background with a subtle dotted grid, like a notebook page.",
  },
];

export function getBackground(id: BackgroundId): BackgroundDefinition | undefined {
  return backgroundRegistry.find((b) => b.id === id);
}
