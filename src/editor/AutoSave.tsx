import { useDebouncedValue } from "@mantine/hooks";
import { useEffect } from "react";
import { isSavedOnServer, useSaveProject } from "../api/projects";
import { useEditorPrefs } from "./state/editorPrefs";
import { useProjectStore } from "./state/projectStore";

// Renders nothing — it only watches the open project and keeps the server in
// step with it. Every change (an edit, a new project, Save As, an import)
// just changes the open project in Zustand; this is the one place that saves.
export function AutoSave() {
  const project = useProjectStore((s) => s.project);
  const [settled] = useDebouncedValue(project, 400); // 400 ms after the last change
  const { save, isPending } = useSaveProject();
  const rememberProject = useEditorPrefs((s) => s.set);

  useEffect(() => {
    rememberProject({ lastOpenedProjectId: project.id });
  }, [project.id, rememberProject]);

  useEffect(() => {
    if (!isSavedOnServer(settled)) save(settled);
    // runs only when the project settles, not when `save` changes identity
  }, [settled]);

  // Closing the tab in the 400 ms before a save would lose that last edit,
  // so the browser asks first.
  const unsaved = project !== settled || isPending;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  return null;
}
