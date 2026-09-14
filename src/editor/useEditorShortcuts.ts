import { useEffect } from "react";
import { computeSceneTimings } from "../utils/duration";
import { useProjectStore } from "./state/projectStore";
import { confirmDeleteTimelineObjects } from "./timeline/deleteTimelineObject";
import {
  copyTimelineObjects,
  duplicateTimelineObjects,
  pasteTimelineObjects,
} from "./timeline/objectClipboard";

export function useEditorShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const state = useProjectStore.getState();
      const key = event.key.toLowerCase();
      const command = event.ctrlKey || event.metaKey;

      if (command && !event.altKey && (key === "z" || key === "y")) {
        event.preventDefault();
        if (key === "y" || event.shiftKey) state.redo();
        else state.undo();
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.closest("input, textarea, select")
      )
        return;

      if (
        key === "delete" &&
        !command &&
        !event.altKey &&
        state.selectedObjectId
      ) {
        event.preventDefault();
        if (confirmDeleteTimelineObjects(state.selectedObjectIds))
          state.selectObject(null);
        return;
      }

      if (
        !command ||
        event.altKey ||
        event.shiftKey ||
        window.getSelection()?.toString()
      )
        return;
      if (key === "c") {
        if (copyTimelineObjects(state.selectedObjectIds))
          event.preventDefault();
        return;
      }
      if (key !== "v" && key !== "d") return;

      const timings = computeSceneTimings(state.project);
      const timing =
        timings.find(
          (entry) =>
            state.playheadFrame >= entry.from &&
            state.playheadFrame < entry.from + entry.durationInFrames,
        ) ?? timings.find((entry) => entry.scene.id === state.selectedSceneId);
      if (!timing) return;
      if (state.selectedSceneId !== timing.scene.id) {
        state.selectScene(timing.scene.id);
      }
      const frame = Math.max(0, state.playheadFrame - timing.from);
      const ids =
        key === "v"
          ? pasteTimelineObjects(frame)
          : duplicateTimelineObjects(state.selectedObjectIds, frame);
      if (ids.length) {
        state.selectObjects(ids);
        event.preventDefault();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
