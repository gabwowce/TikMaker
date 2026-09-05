import React from "react";
import { editorColors } from "./theme";
import { useProjectStore } from "./state/projectStore";
import { parseProject } from "../utils/normalizeProject";

/**
 * Getting work back, from inside the app.
 *
 * Every save has always been snapshotted into `projects/.history/<id>/` and
 * every delete moved the file to `library/.trash/`, so nothing was ever
 * actually lost. But both were reachable only through a file manager, which
 * means that in the moment something disappears — the moment you are least
 * inclined to go spelunking — the safety net may as well not exist.
 *
 * Two lists, one gesture each. The version list shows the SCENE COUNT beside
 * the time, because "the one that still had eleven scenes" is how you actually
 * remember the version you want, not "the one from 13:05".
 */

type Version = { file: string; savedAt: number; scenes?: number; title?: string; voiceClips?: number; sfxClips?: number };
type Trashed = { file: string; deletedAt: number; title?: string; id?: string; scenes?: number };

const when = (at: number) => new Date(at).toLocaleString("lt-LT", { dateStyle: "short", timeStyle: "medium" });

export const RecoveryDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const project = useProjectStore((s) => s.project);
  const loadProject = useProjectStore((s) => s.loadProject);
  const openProject = useProjectStore((s) => s.openProject);

  const [tab, setTab] = React.useState<"versions" | "trash">("versions");
  const [versions, setVersions] = React.useState<Version[] | null>(null);
  const [trash, setTrash] = React.useState<Trashed[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [v, t] = await Promise.all([
          fetch(`/api/library/versions?kind=project&id=${encodeURIComponent(project.id)}`).then((r) => r.json()),
          fetch("/api/library/trash?kind=project").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setVersions(Array.isArray(v) ? v : []);
        setTrash(Array.isArray(t) ? t : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  /**
   * Restoring a version does NOT overwrite the file directly — it loads the old
   * content as the open project, which the normal autosave then writes. So the
   * version you were on a second ago becomes a snapshot too, and restoring is
   * itself undoable.
   */
  async function restoreVersion(file: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/library/versions?kind=project&id=${encodeURIComponent(project.id)}&file=${encodeURIComponent(file)}`
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
      setTrash((current) => (current ?? []).filter((row) => row.file !== entry.file));
      // The library index is built at startup from disk, so a file that just
      // came back is not in it yet — reloading is the honest way to pick it up.
      if (entry.id) window.localStorage.setItem("tikmaker.reopenAfterRestore", entry.id);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const rows = tab === "versions" ? versions : trash;

  return (
    <div
      onMouseDown={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: "min(680px, 92vw)",
          maxHeight: "82vh",
          background: editorColors.panel,
          border: `1px solid ${editorColors.border}`,
          borderRadius: 10,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: editorColors.text }}>Atkūrimas</div>
            <button onClick={onClose} style={buttonStyle}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["versions", "trash"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  ...buttonStyle,
                  borderColor: tab === id ? editorColors.accent : editorColors.border,
                  color: tab === id ? editorColors.accent : editorColors.text,
                }}
              >
                {id === "versions" ? `Šio video versijos${versions ? ` (${versions.length})` : ""}` : `Šiukšliadėžė${trash ? ` (${trash.length})` : ""}`}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: editorColors.textDim, lineHeight: 1.5 }}>
            {tab === "versions"
              ? "Kiekvienas išsaugojimas palieka kopiją. Atkūrimas atidaro seną versiją kaip dabartinę — dabartinė prieš tai irgi tampa versija, tad atsukti galima ir atgal."
              : "Ištrinti projektai keliauja čia, o ne dingsta. Grąžinimas įrašo failą atgal į projects/."}
          </div>
        </div>

        {error ? (
          <div style={{ margin: "10px 16px 0", fontSize: 11, color: "#ff8a65", whiteSpace: "pre-wrap" }}>{error}</div>
        ) : null}

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
          {rows === null ? (
            <div style={{ fontSize: 11, color: editorColors.textDim }}>Kraunama…</div>
          ) : rows.length === 0 ? (
            <div style={{ fontSize: 11, color: editorColors.textDim }}>
              {tab === "versions" ? "Šis video dar neturi ankstesnių versijų." : "Šiukšliadėžė tuščia."}
            </div>
          ) : (
            rows.map((row) => {
              const isVersion = "savedAt" in row;
              const stamp = isVersion ? (row as Version).savedAt : (row as Trashed).deletedAt;
              return (
                <div
                  key={row.file}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 11px",
                    borderRadius: 7,
                    border: `1px solid ${editorColors.border}`,
                    background: editorColors.panelElevated,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: editorColors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.title ?? "(be pavadinimo)"}
                    </div>
                    <div style={{ fontSize: 10, color: editorColors.textDim, fontVariantNumeric: "tabular-nums" }}>
                      {when(stamp)}
                      {row.scenes !== undefined ? ` · ${row.scenes} scenos` : ""}
                      {isVersion && (row as Version).voiceClips !== undefined
                        ? ` · ${(row as Version).voiceClips} VO · ${(row as Version).sfxClips} SFX`
                        : ""}
                      {isVersion ? ` · ${row.file}` : ""}
                    </div>
                  </div>
                  <button
                    disabled={busy}
                    style={{ ...buttonStyle, borderColor: editorColors.accent, color: editorColors.accent, opacity: busy ? 0.5 : 1 }}
                    onClick={() => (isVersion ? restoreVersion(row.file) : restoreTrashed(row as Trashed))}
                  >
                    {isVersion ? "Atkurti" : "Grąžinti"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: "5px 10px",
  fontSize: 11,
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.text,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
