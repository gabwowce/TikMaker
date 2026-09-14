import { Button } from "@mantine/core";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import { resolveSceneDuration } from "../../utils/pacing";
import { useProjectStore } from "../state/projectStore";
export function SceneStrip() {
  const scenes = useProjectStore((s) => s.project.scenes);
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const selectScene = useProjectStore((s) => s.selectScene);
  const duplicateScene = useProjectStore((s) => s.duplicateScene);
  const removeScene = useProjectStore((s) => s.removeScene);
  const moveScene = useProjectStore((s) => s.moveScene);
  return (
    <div className="h-[110px] border-0 border-t border-solid border-editor-border bg-editor-panel flex items-center gap-2.5 p-[0_16px] overflow-x-auto">
      {scenes.length === 0 ? (
        <div className="text-editor-muted text-[13px]">No scenes</div>
      ) : null}

      {scenes.map((scene, index) => {
        const def = getSceneDefinition(scene.type);
        const isSelected = scene.id === selectedSceneId;
        const seconds = resolveSceneDuration(scene);
        const isAuto = typeof scene.durationSeconds !== "number";
        return (
          <div
            key={scene.id}
            onClick={() => selectScene(scene.id)}
            className={`min-w-[150px] p-2.5 rounded-lg bg-editor-panel-raised cursor-pointer shrink-0 ${isSelected ? "[border:1px_solid_#FF7024]" : "[border:1px_solid_#2c2c2c]"}`}
          >
            <div className="text-[11px] text-editor-muted">
              {String(index + 1).padStart(2, "0")} {def.name.toUpperCase()}
            </div>
            <div
              className={`text-[12px] mt-0.5 flex items-baseline gap-[5px] text-editor-text`}
            >
              {seconds.toFixed(1)}s
              {isAuto ? (
                <span className="text-[9px] text-editor-muted [letter-spacing:0.4px]">
                  AUTO
                </span>
              ) : null}
            </div>
            <div className="flex gap-1 mt-1.5">
              <Button
                variant="default"
                aria-label="Move up"
                onClick={(e) => {
                  e.stopPropagation();
                  moveScene(scene.id, "up");
                }}
                className="flex-1"
              >
                ↑
              </Button>
              <Button
                variant="default"
                aria-label="Move down"
                onClick={(e) => {
                  e.stopPropagation();
                  moveScene(scene.id, "down");
                }}
                className="flex-1"
              >
                ↓
              </Button>
              <Button
                variant="default"
                aria-label="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateScene(scene.id);
                }}
                className="flex-1"
              >
                ⧉
              </Button>
              <Button
                variant="default"
                aria-label="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeScene(scene.id);
                }}
                className="flex-1"
              >
                ✕
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
