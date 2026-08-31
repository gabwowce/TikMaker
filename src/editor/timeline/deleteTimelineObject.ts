import { useProjectStore } from "../state/projectStore";

/**
 * Removing whatever the timeline has selected, in ONE place.
 *
 * The panel's delete button and the Delete key have to mean exactly the same
 * thing — two implementations of "what does deleting a checklist row do" is how
 * one of them ends up deleting the whole visual instead. The selection id is
 * the only input either of them has, so the parsing lives here too rather than
 * being repeated next to every call site.
 *
 * Selection ids are minted by the timeline rows (`SceneTimeline`) and read by
 * `TimelineObjectPanel`; the shapes below are that vocabulary.
 */
export type TimelineObjectDescription = {
  /** What the confirm prompt calls it. */
  label: string;
  /** False for the objects that exist but cannot be removed — the scene's own
   * text group, whose "delete" is just emptying the fields. */
  deletable: boolean;
};

export function describeTimelineObject(selectionId: string): TimelineObjectDescription {
  const { project, selectedSceneId } = useProjectStore.getState();
  const scene = project.scenes.find((entry) => entry.id === selectedSceneId);

  if (selectionId === "text-group") return { label: "Scenos tekstai", deletable: false };
  if (selectionId.startsWith("audio-clip-")) return { label: "Audio klipas", deletable: true };
  if (/^sound-scene-(in|out)$/.test(selectionId)) return { label: "Scenos garsas", deletable: true };
  if (/^sound-visual-(.+)-(in|out)$/.test(selectionId)) return { label: "Vizualo garsas", deletable: true };

  const lineIndex = /^line-(\d+)$/.exec(selectionId)?.[1];
  if (lineIndex !== undefined) {
    const text = scene?.content.richHeadline?.[Number(lineIndex)]?.text;
    return { label: text ? `Tekstas „${text}“` : "Teksto eilutė", deletable: true };
  }

  if (selectionId.startsWith("block-")) {
    const text = scene?.content.blocks?.find((block) => block.id === selectionId.slice(6))?.text;
    return { label: text ? `Blokas „${text}“` : "Teksto blokas", deletable: true };
  }

  if (selectionId.startsWith("visual-")) {
    const entry = scene?.content.visuals?.find((visual) => visual.id === selectionId.slice(7));
    return { label: entry ? `Vizualas „${entry.visual.type}“` : "Vizualas", deletable: true };
  }

  const stepIndex = /^step-(\d+)$/.exec(selectionId)?.[1];
  if (stepIndex !== undefined) {
    const label = scene?.content.items?.[Number(stepIndex)]?.label;
    return { label: label ? `Punktas „${label}“` : "Punktas", deletable: true };
  }

  const check = /^check-(.+)-(\d+)$/.exec(selectionId);
  if (check) {
    const entry = scene?.content.visuals?.find((visual) => visual.id === check[1]);
    const item = entry?.visual.type === "checklist" ? entry.visual.items[Number(check[2])] : undefined;
    return { label: item ? `Punktas „${item.label}“` : "Checklist punktas", deletable: true };
  }

  return { label: "Objektas", deletable: false };
}

/** Deletes without asking. `confirmDeleteTimelineObject` is the one to call
 * from the UI — nothing here is undoable except through the history stack. */
export function deleteTimelineObject(selectionId: string): boolean {
  const state = useProjectStore.getState();
  const { project, selectedSceneId } = state;
  const scene = project.scenes.find((entry) => entry.id === selectedSceneId);

  if (selectionId.startsWith("audio-clip-")) {
    state.removeAudioClip(selectionId.slice(11));
    return true;
  }

  if (!scene || !selectedSceneId) return false;

  const sceneSound = /^sound-scene-(in|out)$/.exec(selectionId)?.[1];
  if (sceneSound) {
    // Scene cues resolve automatically from the entrance/exit preset unless an
    // override says otherwise, so "delete" here has to be the explicit "none"
    // — clearing the field would just let the automatic sound come back.
    state.updateSceneMotion(selectedSceneId, sceneSound === "out" ? { exitSfx: "none" } : { sfx: "none" });
    return true;
  }

  const visuals = scene.content.visuals ?? [];
  const visualSound = /^sound-visual-(.+)-(in|out)$/.exec(selectionId);
  if (visualSound) {
    const isOut = visualSound[2] === "out";
    // A layer's own cues are explicit-only (see `positionedVisualSchema.sfx`),
    // so unsetting the field really is silence.
    state.updateSceneVisuals(
      selectedSceneId,
      visuals.map((entry) =>
        entry.id === visualSound[1] ? { ...entry, ...(isOut ? { exitSfx: undefined } : { sfx: undefined }) } : entry
      )
    );
    return true;
  }

  const lineIndex = /^line-(\d+)$/.exec(selectionId)?.[1];
  if (lineIndex !== undefined) {
    const lines = scene.content.richHeadline ?? [];
    state.updateSceneRichHeadline(
      selectedSceneId,
      lines.filter((_, index) => index !== Number(lineIndex))
    );
    return true;
  }

  if (selectionId.startsWith("block-")) {
    const id = selectionId.slice(6);
    state.updateSceneBlocks(selectedSceneId, (scene.content.blocks ?? []).filter((block) => block.id !== id));
    return true;
  }

  if (selectionId.startsWith("visual-")) {
    const id = selectionId.slice(7);
    state.updateSceneVisuals(selectedSceneId, visuals.filter((entry) => entry.id !== id));
    return true;
  }

  const stepIndex = /^step-(\d+)$/.exec(selectionId)?.[1];
  if (stepIndex !== undefined) {
    const items = scene.content.items ?? [];
    state.updateSceneItems(
      selectedSceneId,
      items.filter((_, index) => index !== Number(stepIndex))
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
              visual: { ...entry.visual, items: entry.visual.items.filter((_, index) => index !== itemIndex) },
            }
          : entry
      )
    );
    return true;
  }

  return false;
}

/**
 * Asks first, then deletes. Every deletion in the editor goes through this —
 * the Delete key especially, because a keystroke that silently destroys a
 * scene's work is exactly the accident this exists to prevent.
 */
export function confirmDeleteTimelineObject(selectionId: string): boolean {
  const { label, deletable } = describeTimelineObject(selectionId);
  if (!deletable) return false;
  if (!window.confirm(`Pašalinti: ${label}?`)) return false;
  return deleteTimelineObject(selectionId);
}
