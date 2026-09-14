import { Button, NumberInput } from "@mantine/core";
import { projectDurationInFrames } from "../../utils/duration";
import { projectPlanJson } from "../../utils/projectStoryPlan";
import { useProjectStore } from "../state/projectStore";
import { StoryboardSceneForm } from "./StoryboardSceneForm";
import { StoryboardSceneList } from "./StoryboardSceneList";
type Props = {
  onOpenScenes: () => void;
};
export function ProjectStoryboardView({ onOpenScenes }: Props) {
  const project = useProjectStore((state) => state.project);
  const selectedId = useProjectStore((state) => state.selectedSceneId);
  const updateStory = useProjectStore((state) => state.updateProjectStoryPlan);
  const selectedScene =
    project.scenes.find((scene) => scene.id === selectedId) ??
    project.scenes[0];
  const selectedIndex = selectedScene
    ? project.scenes.indexOf(selectedScene)
    : -1;
  const durationSeconds = projectDurationInFrames(project) / project.fps;
  const exceedsGoal =
    durationSeconds > (project.storyPlan?.targetDuration ?? Infinity);
  function updateTargetDuration(value: string | number) {
    updateStory({ targetDuration: value === "" ? undefined : Number(value) });
  }
  function downloadPlan() {
    const blob = new Blob([projectPlanJson(project)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.id}.plan.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="editor-ui flex min-h-0 flex-1 flex-col text-editor-text">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-0 border-b border-solid border-editor-border bg-editor-panel px-4 py-2">
        <NumberInput
          aria-label="Target duration in seconds"
          className="w-28"
          placeholder="Goal (s)"
          suffix=" s"
          min={1}
          value={project.storyPlan?.targetDuration ?? ""}
          onChange={updateTargetDuration}
        />
        <span
          className={`text-xs ${exceedsGoal ? "text-orange-400" : "text-editor-muted"}`}
        >
          {project.scenes.length} scenes · {durationSeconds.toFixed(1)}s
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={() =>
              void navigator.clipboard.writeText(projectPlanJson(project))
            }
          >
            Copy AI JSON
          </Button>
          <Button variant="default" onClick={downloadPlan}>
            Export AI JSON
          </Button>
          <Button onClick={onOpenScenes}>Open Scenes →</Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] md:overflow-hidden">
        <StoryboardSceneList
          project={project}
          selectedSceneId={selectedScene?.id}
        />
        <aside className="overflow-y-auto border-0 border-t border-solid border-editor-border bg-editor-panel p-4 md:border-t-0 md:border-l">
          {selectedScene ? (
            <StoryboardSceneForm
              scene={selectedScene}
              index={selectedIndex}
              sceneCount={project.scenes.length}
            />
          ) : (
            <div className="text-sm text-editor-muted">No scenes</div>
          )}
        </aside>
      </div>
    </div>
  );
}
