import { Button, UnstyledButton } from "@mantine/core";
import type { VideoProject } from "../../schema/project";
import { sceneOnScreenText } from "../../utils/projectStoryPlan";
import { useProjectStore } from "../state/projectStore";
type Props = {
  project: VideoProject;
  selectedSceneId?: string;
};
export function StoryboardSceneList({ project, selectedSceneId }: Props) {
  const selectScene = useProjectStore((state) => state.selectScene);
  const addScene = useProjectStore((state) => state.addScene);
  return (
    <div className="min-h-0 overflow-y-auto p-4">
      <div className="grid gap-2">
        {project.scenes.map((scene, index) => {
          const isSelected = scene.id === selectedSceneId;
          return (
            <UnstyledButton
              key={scene.id}
              aria-pressed={isSelected}
              onClick={() => selectScene(scene.id)}
              className={`grid w-full grid-cols-[24px_1fr] items-start gap-2 rounded-md border border-solid p-3 text-left ${isSelected ? "border-editor-accent bg-editor-accent/10" : "border-editor-border bg-editor-panel-raised"}`}
            >
              <span className="text-editor-muted">{index + 1}.</span>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase text-editor-accent">
                    {scene.plan?.role}
                  </span>
                </div>
                <div className="truncate text-sm">
                  {scene.vo || sceneOnScreenText(scene) || "Empty scene"}
                </div>
                <div className="mt-1 text-xs text-editor-muted">
                  {scene.plan?.purpose}
                </div>
              </div>
            </UnstyledButton>
          );
        })}
      </div>
      <Button
        className="mt-3"
        fullWidth
        variant="default"
        onClick={() => addScene("visual-explainer")}
      >
        + Add scene
      </Button>
    </div>
  );
}
