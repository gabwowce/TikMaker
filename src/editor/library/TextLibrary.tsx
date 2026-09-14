import { Button } from "@mantine/core";
import { computeSceneTimings } from "../../utils/duration";
import { useProjectStore } from "../state/projectStore";
import { qualifySelection } from "../timeline/selectionId";
export function TextLibrary() {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const project = useProjectStore((s) => s.project);
  const scene = project.scenes.find((value) => value.id === selectedSceneId);
  const updateSceneRichHeadline = useProjectStore(
    (s) => s.updateSceneRichHeadline,
  );
  const selectObject = useProjectStore((s) => s.selectObject);
  const playheadFrame = useProjectStore((s) => s.playheadFrame);
  if (!scene || !selectedSceneId) {
    return (
      <div className="text-editor-muted text-[11px]">No scene selected</div>
    );
  }
  const lines = scene.content.richHeadline ?? [];
  const full = lines.length >= 6;
  function add() {
    if (full || !selectedSceneId) return;
    const sceneFrom =
      computeSceneTimings(project).find(
        (entry) => entry.scene.id === selectedSceneId,
      )?.from ?? 0;
    const delay = Math.max(0, playheadFrame - sceneFrom);
    updateSceneRichHeadline(selectedSceneId, [
      ...lines,
      { text: "New text", size: "headline", animation: "slideUp", delay },
    ]);
    selectObject(qualifySelection(selectedSceneId, `line-${lines.length}`));
  }
  return (
    <div className="flex flex-col gap-2.5">
      <Button variant="default" onClick={add} disabled={full} fullWidth>
        + Text
      </Button>
    </div>
  );
}
