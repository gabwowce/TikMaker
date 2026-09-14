import { Button, Modal, Tabs } from "@mantine/core";
import { useEffect, useState } from "react";
import { parseProject } from "../utils/normalizeProject";
import { useProjectStore } from "./state/projectStore";
type Version = {
  file: string;
  savedAt: number;
  scenes?: number;
  title?: string;
  voiceClips?: number;
  sfxClips?: number;
};
type Trashed = {
  file: string;
  deletedAt: number;
  title?: string;
  id?: string;
  scenes?: number;
};
function when(at: number) {
  return new Date(at).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}
type RecoveryDialogProps = {
  onClose: () => void;
};
export function RecoveryDialog({ onClose }: RecoveryDialogProps) {
  const project = useProjectStore((s) => s.project);
  const loadProject = useProjectStore((s) => s.loadProject);

  const [tab, setTab] = useState<"versions" | "trash">("versions");
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [trash, setTrash] = useState<Trashed[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [v, t] = await Promise.all([
          fetch(
            `/api/library/versions?kind=project&id=${encodeURIComponent(project.id)}`,
          ).then((r) => r.json()),
          fetch("/api/library/trash?kind=project").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setVersions(Array.isArray(v) ? v : []);
        setTrash(Array.isArray(t) ? t : []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);
  async function restoreVersion(file: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/library/versions?kind=project&id=${encodeURIComponent(project.id)}&file=${encodeURIComponent(file)}`,
      );
      if (!response.ok) throw new Error(await response.text());
      loadProject(parseProject(await response.json()));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }
  async function restoreTrashed(entry: Trashed) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/library/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "project", file: entry.file }),
      });
      if (!response.ok) throw new Error(await response.text());
      setTrash((current) =>
        (current ?? []).filter((row) => row.file !== entry.file),
      );
      if (entry.id)
        window.localStorage.setItem("tikmaker.reopenAfterRestore", entry.id);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }
  const rows = tab === "versions" ? versions : trash;
  return (
    <Modal
      opened
      onClose={onClose}
      title="Recovery"
      size="lg"
      centered
      className="editor-ui"
    >
      <Tabs
        value={tab}
        onChange={(value) => setTab(value === "trash" ? "trash" : "versions")}
      >
        <Tabs.List>
          <Tabs.Tab value="versions">Versions</Tabs.Tab>
          <Tabs.Tab value="trash">Trash</Tabs.Tab>
        </Tabs.List>
      </Tabs>
      {error ? (
        <div role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}
      <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto">
        {!rows ? (
          <div>Loading...</div>
        ) : rows.length === 0 ? (
          <div>No projects</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.file}
              className="flex items-center gap-3 rounded border border-solid border-editor-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">
                  {row.title ?? "Untitled"}
                </div>
                <div className="text-xs text-editor-muted">
                  {when("savedAt" in row ? row.savedAt : row.deletedAt)}
                </div>
                {row.scenes !== undefined ? (
                  <div className="text-xs text-editor-muted">
                    {row.scenes} scenes
                  </div>
                ) : null}
              </div>
              <Button
                disabled={busy}
                onClick={() =>
                  "savedAt" in row
                    ? restoreVersion(row.file)
                    : restoreTrashed(row)
                }
              >
                Restore
              </Button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
