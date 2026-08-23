import type React from "react";
import type { SceneType } from "../schema/scene";
import type { SceneComponentProps } from "../video/scenes/types";
import { HookCenteredScene } from "../video/scenes/HookCenteredScene";
import { HookVisualScene } from "../video/scenes/HookVisualScene";
import { VisualExplainerScene } from "../video/scenes/VisualExplainerScene";
import { ScreenDemoScene } from "../video/scenes/ScreenDemoScene";
import { TakeawayScene } from "../video/scenes/TakeawayScene";
import { ComparisonScene } from "../video/scenes/ComparisonScene";
import { StepsScene } from "../video/scenes/StepsScene";

export type SceneDefinition = {
  type: SceneType;
  name: string;
  description: string;
  component: React.FC<SceneComponentProps>;
  defaultDurationSeconds: number;
};

export const sceneRegistry: SceneDefinition[] = [
  {
    type: "hook-centered",
    name: "Hook Centered",
    description: "Strong opening statement or question.",
    component: HookCenteredScene,
    defaultDurationSeconds: 2.6,
  },
  {
    type: "hook-visual",
    name: "Hook With Visual",
    description: "Headline paired with a large visual.",
    component: HookVisualScene,
    defaultDurationSeconds: 2.8,
  },
  {
    type: "visual-explainer",
    name: "Visual Explainer",
    description: "Main educational scene: title, large visual, short explanation.",
    component: VisualExplainerScene,
    defaultDurationSeconds: 4,
  },
  {
    type: "screen-demo",
    name: "Screen Demo",
    description: "Designed for screen recordings inside a device frame.",
    component: ScreenDemoScene,
    defaultDurationSeconds: 4.5,
  },
  {
    type: "takeaway",
    name: "Takeaway",
    description: "Final idea to close the video.",
    component: TakeawayScene,
    defaultDurationSeconds: 2.7,
  },
  {
    type: "comparison",
    name: "Comparison",
    description: "Two columns, side by side — before/after, this/that.",
    component: ComparisonScene,
    defaultDurationSeconds: 4,
  },
  {
    type: "steps",
    name: "Steps",
    description: "2-4 numbered steps or list items, staggered in.",
    component: StepsScene,
    defaultDurationSeconds: 4.5,
  },
];

export function getSceneDefinition(type: SceneType): SceneDefinition {
  const def = sceneRegistry.find((s) => s.type === type);
  if (!def) throw new Error(`Unknown scene type: ${type}`);
  return def;
}
