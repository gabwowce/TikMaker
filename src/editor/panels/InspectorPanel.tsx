import { Button, Tabs } from "@mantine/core";
import { useState } from "react";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import { SceneContentSettings } from "../inspector/SceneContentSettings";
import { SceneLayerSettings } from "../inspector/SceneLayerSettings";
import { SceneMotionSettings } from "../inspector/SceneMotionSettings";
import { useProjectStore } from "../state/projectStore";

type InspectorTab = "content" | "visuals" | "motion";

export function InspectorPanel() {
  const [tab, setTab] = useState<InspectorTab>("content");
  const scene = useProjectStore((state) =>
    state.project.scenes.find((scene) => scene.id === state.selectedSceneId),
  );
  const removeScene = useProjectStore((state) => state.removeScene);

  if (!scene) {
    return (
      <div className="editor-ui w-[clamp(300px,23vw,480px)] shrink-0 border-0 border-l border-solid border-editor-border bg-editor-panel p-4 text-editor-muted text-[13px]">
        No scene selected
      </div>
    );
  }

  return (
    <div className="editor-ui w-[clamp(300px,23vw,480px)] shrink-0 border-0 border-l border-solid border-editor-border bg-editor-panel text-editor-text flex flex-col min-h-0">
      <div className="px-4 pt-4 shrink-0">
        <div className="text-[13px] font-bold">
          {getSceneDefinition(scene.type).name}
        </div>
        <Tabs
          value={tab}
          onChange={(value) => setTab(value as InspectorTab)}
          className="mt-3"
        >
          <Tabs.List grow>
            <Tabs.Tab value="content">Content</Tabs.Tab>
            <Tabs.Tab value="visuals">Visuals</Tabs.Tab>
            <Tabs.Tab value="motion">Motion</Tabs.Tab>
          </Tabs.List>
        </Tabs>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-1 pb-4">
        {tab === "content" && <SceneContentSettings scene={scene} />}
        {tab === "visuals" && <SceneLayerSettings scene={scene} />}
        {tab === "motion" && <SceneMotionSettings scene={scene} />}
        <Button
          color="red"
          variant="light"
          fullWidth
          className="mt-6"
          onClick={() => removeScene(scene.id)}
        >
          Delete Scene
        </Button>
      </div>
    </div>
  );
}
