import { ActionIcon, Button, Menu, NativeSelect, Tabs } from "@mantine/core";
import { useState } from "react";
import { projectDurationInFrames } from "../utils/duration";
import { parseProject } from "../utils/normalizeProject";
import { ImportJsonDialog } from "./ImportJsonDialog";
import { RecoveryDialog } from "./RecoveryDialog";
import { RenderButton } from "./RenderButton";
import { SaveStatusBadge } from "./SaveStatusBadge";
import { useProjectStore } from "./state/projectStore";

type EditorToolbarProps = {
  mode: "scenes" | "storyboard";
  onModeChange: (mode: "scenes" | "storyboard") => void;
};

export function EditorToolbar({ mode, onModeChange }: EditorToolbarProps) {
  const project = useProjectStore((state) => state.project);
  const library = useProjectStore((state) => state.libraryIndex);
  const canUndo = useProjectStore((state) => state.canUndo);
  const canRedo = useProjectStore((state) => state.canRedo);
  const [importOpen, setImportOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const actions = useProjectStore.getState();

  function renameProject() {
    const title = window.prompt("Project name", project.title);
    if (title?.trim()) actions.updateProjectTitle(title.trim());
  }

  function duplicateProject() {
    const title = window.prompt("Project name", `${project.title} copy`);
    if (title?.trim()) actions.saveProjectAs(title.trim());
  }

  function deleteProject() {
    if (window.confirm(`Delete "${project.title}"?`))
      actions.deleteProject(project.id);
  }

  function exportProject() {
    const blob = new Blob([actions.exportProjectJson()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importProject(text: string): string | null {
    try {
      actions.loadProject(parseProject(JSON.parse(text)));
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid project JSON.";
    }
  }

  return (
    <>
      <header className="editor-ui flex shrink-0 flex-wrap items-center gap-2 border-0 border-b border-solid border-editor-border px-3 py-2">
        <strong className="hidden text-xs lg:block">TikMaker</strong>
        <Menu>
          <Menu.Target>
            <Button variant="default">Menu</Button>
          </Menu.Target>
          <Menu.Dropdown className="editor-ui">
            <Menu.Item onClick={renameProject}>Rename project</Menu.Item>
            <Menu.Item onClick={duplicateProject}>Duplicate project</Menu.Item>
            <Menu.Item onClick={() => setRecoveryOpen(true)}>
              Recover project
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item onClick={() => setImportOpen(true)}>
              Import JSON
            </Menu.Item>
            <Menu.Item onClick={exportProject}>Export JSON</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" onClick={deleteProject}>
              Delete project
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <NativeSelect
          aria-label="Current project"
          className="w-40 xl:w-64"
          value={project.id}
          data={library.map((entry) => ({
            value: entry.id,
            label: entry.title,
          }))}
          onChange={(event) => actions.openProject(event.currentTarget.value)}
        />
        <Button
          variant="default"
          onClick={() => actions.createProject("Untitled project")}
        >
          + New
        </Button>
        <Tabs
          id="editor-mode"
          value={mode}
          onChange={(value) =>
            onModeChange(value === "storyboard" ? "storyboard" : "scenes")
          }
        >
          <Tabs.List aria-label="Editor mode">
            <Tabs.Tab value="storyboard">Storyboard</Tabs.Tab>
            <Tabs.Tab value="scenes">Scenes</Tabs.Tab>
          </Tabs.List>
        </Tabs>
        <ActionIcon
          aria-label="Undo"
          disabled={!canUndo}
          onClick={actions.undo}
        >
          ↶
        </ActionIcon>
        <ActionIcon
          aria-label="Redo"
          disabled={!canRedo}
          onClick={actions.redo}
        >
          ↷
        </ActionIcon>
        <span className="text-xs text-editor-muted">
          {(projectDurationInFrames(project) / project.fps).toFixed(1)}s
        </span>
        <div className="ml-auto flex items-center gap-2">
          <SaveStatusBadge />
          <Button variant="default" onClick={actions.saveProject}>
            Save
          </Button>
          <RenderButton />
        </div>
      </header>
      {importOpen ? (
        <ImportJsonDialog
          title="Import project JSON"
          onImport={importProject}
          onClose={() => setImportOpen(false)}
        />
      ) : null}
      {recoveryOpen ? (
        <RecoveryDialog onClose={() => setRecoveryOpen(false)} />
      ) : null}
    </>
  );
}
