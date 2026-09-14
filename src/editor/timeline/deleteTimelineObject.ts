import { useProjectStore } from "../state/projectStore";
import { parseSelection } from "./selectionId";
export type TimelineObjectDescription = {
  label: string;
  deletable: boolean;
};
export function describeTimelineObject(
  rawSelectionId: string,
): TimelineObjectDescription {
  const { project, selectedSceneId } = useProjectStore.getState();
  const { sceneId: owner, objectId: selectionId } =
    parseSelection(rawSelectionId);
  const scene = project.scenes.find(
    (entry) => entry.id === (owner ?? selectedSceneId),
  );
  if (selectionId === "text-group")
    return { label: "Scene text", deletable: false };
  if (selectionId.startsWith("audio-clip-"))
    return { label: "Audio clip", deletable: true };
  if (/^sound-scene-(in|out)$/.test(selectionId))
    return { label: "Scene sound", deletable: true };
  if (/^sound-visual-(.+)-(in|out)$/.test(selectionId))
    return { label: "Visual sound", deletable: true };
  const lineIndex = /^line-(\d+)$/.exec(selectionId)?.[1];
  if (lineIndex !== undefined) {
    const text = scene?.content.richHeadline?.[Number(lineIndex)]?.text;
    return { label: text ? `Text “${text}”` : "Text line", deletable: true };
  }
  if (selectionId.startsWith("block-")) {
    const text = scene?.content.blocks?.find(
      (block) => block.id === selectionId.slice(6),
    )?.text;
    return { label: text ? `Block “${text}“` : "Text block", deletable: true };
  }
  if (selectionId.startsWith("visual-")) {
    const entry = scene?.content.visuals?.find(
      (visual) => visual.id === selectionId.slice(7),
    );
    return {
      label: entry ? `Visual „${entry.visual.type}“` : "Visual",
      deletable: true,
    };
  }
  const stepIndex = /^step-(\d+)$/.exec(selectionId)?.[1];
  if (stepIndex !== undefined) {
    const label = scene?.content.items?.[Number(stepIndex)]?.label;
    return { label: label ? `Item „${label}“` : "Item", deletable: true };
  }
  const check = /^check-(.+)-(\d+)$/.exec(selectionId);
  if (check) {
    const entry = scene?.content.visuals?.find(
      (visual) => visual.id === check[1],
    );
    const item =
      entry?.visual.type === "checklist"
        ? entry.visual.items[Number(check[2])]
        : undefined;
    return {
      label: item ? `Item „${item.label}“` : "Checklist item",
      deletable: true,
    };
  }
  return { label: "Object", deletable: false };
}
export function deleteTimelineObject(rawSelectionId: string): boolean {
  const state = useProjectStore.getState();
  const { project, selectedSceneId: openSceneId } = state;
  const { sceneId: owner, objectId: selectionId } =
    parseSelection(rawSelectionId);
  const selectedSceneId = owner ?? openSceneId;
  const scene = project.scenes.find((entry) => entry.id === selectedSceneId);
  if (selectionId.startsWith("audio-clip-")) {
    state.removeAudioClip(selectionId.slice(11));
    return true;
  }
  if (!scene || !selectedSceneId) return false;
  const sceneSound = /^sound-scene-(in|out)$/.exec(selectionId)?.[1];
  if (sceneSound) {
    state.updateSceneMotion(
      selectedSceneId,
      sceneSound === "out" ? { exitSfx: "none" } : { sfx: "none" },
    );
    return true;
  }
  const visuals = scene.content.visuals ?? [];
  const visualSound = /^sound-visual-(.+)-(in|out)$/.exec(selectionId);
  if (visualSound) {
    const isOut = visualSound[2] === "out";
    state.updateSceneVisuals(
      selectedSceneId,
      visuals.map((entry) =>
        entry.id === visualSound[1]
          ? {
              ...entry,
              ...(isOut ? { exitSfx: undefined } : { sfx: undefined }),
            }
          : entry,
      ),
    );
    return true;
  }
  const lineIndex = /^line-(\d+)$/.exec(selectionId)?.[1];
  if (lineIndex !== undefined) {
    const lines = scene.content.richHeadline ?? [];
    state.updateSceneRichHeadline(
      selectedSceneId,
      lines.filter((_, index) => index !== Number(lineIndex)),
    );
    return true;
  }
  if (selectionId.startsWith("block-")) {
    const id = selectionId.slice(6);
    state.updateSceneBlocks(
      selectedSceneId,
      (scene.content.blocks ?? []).filter((block) => block.id !== id),
    );
    return true;
  }
  if (selectionId.startsWith("visual-")) {
    const id = selectionId.slice(7);
    state.updateSceneVisuals(
      selectedSceneId,
      visuals.filter((entry) => entry.id !== id),
    );
    return true;
  }
  const stepIndex = /^step-(\d+)$/.exec(selectionId)?.[1];
  if (stepIndex !== undefined) {
    const items = scene.content.items ?? [];
    state.updateSceneItems(
      selectedSceneId,
      items.filter((_, index) => index !== Number(stepIndex)),
    );
    return true;
  }
  const check = /^check-(.+)-(\d+)$/.exec(selectionId);
  if (check) {
    const itemIndex = Number(check[2]);
    state.updateSceneVisuals(
      selectedSceneId,
      visuals.map((entry) =>
        entry.id === check[1] && entry.visual.type === "checklist"
          ? {
              ...entry,
              visual: {
                ...entry.visual,
                items: entry.visual.items.filter(
                  (_, index) => index !== itemIndex,
                ),
              },
            }
          : entry,
      ),
    );
    return true;
  }
  return false;
}
export function confirmDeleteTimelineObject(selectionId: string): boolean {
  return confirmDeleteTimelineObjects([selectionId]);
}
export function confirmDeleteTimelineObjects(selectionIds: string[]): boolean {
  const deletable = selectionIds.filter(
    (id) => describeTimelineObject(id).deletable,
  );
  if (!deletable.length) return false;
  const prompt =
    deletable.length === 1
      ? `Remove: ${describeTimelineObject(deletable[0]).label}?`
      : `Remove ${deletable.length} objects?`;
  if (!window.confirm(prompt)) return false;
  const state = useProjectStore.getState();
  state.beginHistoryTransaction();
  const ordered = [...deletable].sort((a, b) => {
    const sceneA = parseSelection(a).sceneId ?? "";
    const sceneB = parseSelection(b).sceneId ?? "";
    return sceneA === sceneB
      ? indexIn(b) - indexIn(a)
      : sceneA.localeCompare(sceneB);
  });
  const removed = ordered.map(deleteTimelineObject).some(Boolean);
  state.endHistoryTransaction();
  return removed;
}
function indexIn(selectionId: string): number {
  const match = /-(\d+)$/.exec(parseSelection(selectionId).objectId);
  return match ? Number(match[1]) : -1;
}
