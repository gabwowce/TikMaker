import React, { useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { useProjectStore } from "./state/projectStore";
import { editorColors } from "./theme";
import { LibraryPanel } from "./panels/LibraryPanel";
import { InspectorPanel } from "./panels/InspectorPanel";
import { SceneStrip } from "./panels/SceneStrip";
import { TikTokVideo } from "../video/TikTokVideo";
import { videoDefaults } from "../video/typography/tokens";
import { computeSceneTimings, projectDurationInFrames } from "../utils/duration";
import { parseProject } from "../utils/normalizeProject";
import { BlockPositionOverlay } from "./BlockPositionOverlay";
import { RenderButton } from "./RenderButton";
import { useSavedTemplatesStore } from "./state/savedTemplatesStore";
import { ProjectStoryboardView } from "./storyboard/ProjectStoryboardView";
import { StoryboardGuide } from "./storyboard/StoryboardGuide";
import { SceneTimeline } from "./timeline/SceneTimeline";
import { TimelineObjectPanel } from "./timeline/TimelineObjectPanel";
import { confirmDeleteTimelineObjects } from "./timeline/deleteTimelineObject";
import { copyTimelineObjects, duplicateTimelineObjects, pasteTimelineObjects } from "./timeline/objectClipboard";
import { GlobalStyles } from "./GlobalStyles";
import { SafeZoneOverlay, safeZonePresets, type SafeZonePlatform } from "./SafeZoneOverlay";
import { SaveStatusBadge } from "./SaveStatusBadge";
import { LibraryLoadWarning } from "./LibraryLoadWarning";
import { ImportJsonDialog } from "./ImportJsonDialog";
import { RecoveryDialog } from "./RecoveryDialog";

/** The preview sizes itself to whatever room the middle column has, instead of
 * sitting at a fixed 380px while the space around it goes unused. Capped so it
 * doesn't turn into a wall on a very tall window. */
const PREVIEW_MIN_WIDTH = 300;
const PREVIEW_MAX_WIDTH = 620;
const STAGE_PADDING = 24;

/** Zoom multiplies the FITTED size rather than replacing it, so the buttons
 * stay meaningful when the window is resized: 100% always means "as big as this
 * column can show it", whatever that is right now. */
const ZOOM_STEP = 1.2;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

const VIDEO_RATIO = videoDefaults.height / videoDefaults.width;

export const Editor: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = React.useState(PREVIEW_MIN_WIDTH);
  const [zoom, setZoom] = React.useState(1);
  const [showSafeZones, setShowSafeZones] = React.useState(false);
  const [safeZonePlatform, setSafeZonePlatform] = React.useState<SafeZonePlatform>("all");
  const selectedTimelineObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectedTimelineObjectIds = useProjectStore((s) => s.selectedObjectIds);
  const selectTimelineObjects = useProjectStore((s) => s.selectObjects);
  const setSelectedTimelineObjectId = useProjectStore((s) => s.selectObject);

  /** Delete removes the selected timeline object, after confirming. It lives
   * here rather than in the store's global shortcut handler because it acts on
   * the SELECTION, which is editor state — and it is deliberately Delete only:
   * Backspace is what you press to fix a typo, and a stray one landing outside
   * a field would destroy work with no warning at all. */
  React.useEffect(() => {
    if (!selectedTimelineObjectId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      // Never while the caret is somewhere: inside a field Delete means
      // "delete the character to the right", and hijacking that is worse than
      // not having the shortcut.
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      if (confirmDeleteTimelineObjects(selectedTimelineObjectIds)) setSelectedTimelineObjectId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedTimelineObjectId, selectedTimelineObjectIds]);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const availableWidth = stage.clientWidth - STAGE_PADDING * 2;
      const availableHeight = stage.clientHeight - STAGE_PADDING * 2;
      setFitWidth(
        Math.round(
          Math.max(PREVIEW_MIN_WIDTH, Math.min(PREVIEW_MAX_WIDTH, availableWidth, availableHeight / VIDEO_RATIO))
        )
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const preview = React.useMemo(() => {
    const width = Math.round(fitWidth * zoom);
    return { width, height: Math.round(width * VIDEO_RATIO) };
  }, [fitWidth, zoom]);

  function zoomBy(factor: number) {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z * factor)));
  }

  const project = useProjectStore((s) => s.project);
  const saveProject = useProjectStore((s) => s.saveProject);
  const saveProjectAs = useProjectStore((s) => s.saveProjectAs);
  const saveTemplate = useSavedTemplatesStore((s) => s.save);
  const exportProjectJson = useProjectStore((s) => s.exportProjectJson);
  const loadProject = useProjectStore((s) => s.loadProject);
  const updateProjectTitle = useProjectStore((s) => s.updateProjectTitle);
  const libraryIndex = useProjectStore((s) => s.libraryIndex);
  const projectCollections = useMemo(() => {
    const groups = new Map<string, typeof libraryIndex>();
    for (const entry of libraryIndex) {
      const label = entry.collection?.trim() || "Kiti video";
      groups.set(label, [...(groups.get(label) ?? []), entry]);
    }
    return [...groups.entries()];
  }, [libraryIndex]);
  const openProject = useProjectStore((s) => s.openProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const createProject = useProjectStore((s) => s.createProject);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const setPlayheadFrame = useProjectStore((s) => s.setPlayheadFrame);
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const playheadFrame = useProjectStore((s) => s.playheadFrame);

  /** Ctrl+C / Ctrl+V on the selected timeline object. Paste lands at the
   * playhead in the selected scene and carries every setting the original had —
   * effects, keyframes, timing, position — which is the whole reason to copy an
   * object rather than build a second one. Same guard as Delete: never while a
   * field has the caret, where the browser's own copy/paste is what you want. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      const key = event.key.toLowerCase();
      if (key !== "c" && key !== "v" && key !== "d") return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (window.getSelection()?.toString()) return;

      // Paste targets the scene under the PLAYHEAD, falling back to the open
      // one. In the full-video view the two are routinely different, and the
      // playhead is the one you actually pointed at.
      const timings = computeSceneTimings(project);
      const pasteTiming =
        timings.find((entry) => playheadFrame >= entry.from && playheadFrame < entry.from + entry.durationInFrames) ??
        timings.find((entry) => entry.scene.id === selectedSceneId);
      if (pasteTiming && pasteTiming.scene.id !== selectedSceneId) {
        useProjectStore.getState().selectScene(pasteTiming.scene.id);
      }
      const localFrame = Math.max(0, playheadFrame - (pasteTiming?.from ?? 0));

      if (key === "c" && selectedTimelineObjectId) {
        if (copyTimelineObjects(selectedTimelineObjectIds)) event.preventDefault();
      } else if (key === "d" && selectedTimelineObjectId) {
        const pasted = duplicateTimelineObjects(selectedTimelineObjectIds, localFrame);
        if (pasted.length) {
          selectTimelineObjects(pasted);
          event.preventDefault();
        }
      } else if (key === "v") {
        const pasted = pasteTimelineObjects(localFrame);
        if (pasted.length) {
          selectTimelineObjects(pasted);
          event.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedTimelineObjectId, selectedSceneId, playheadFrame, project]);
  const selectScene = useProjectStore((s) => s.selectScene);
  const [importOpen, setImportOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  /** Which half of the right column is showing while an object is selected.
   * Resets to the object whenever a DIFFERENT one is picked, because that click
   * is a request to look at it. */
  const [rightPanel, setRightPanel] = useState<"object" | "scene">("object");
  const [importError, setImportError] = useState<string | null>(null);
  /** Storyboard vs scene editing are different jobs on different data (see
   * `schema/storyboard.ts`), so they get separate modes rather than another
   * panel competing for room next to the preview. */
  const [mode, setMode] = useState<"scenes" | "storyboard">("scenes");

  const selectedScene = project.scenes.find((s) => s.id === selectedSceneId);
  const selectedSceneBlocks = selectedScene?.content.blocks ?? [];
  const selectedSceneVisuals = selectedScene?.content.visuals ?? [];

  const durationInFrames = useMemo(() => projectDurationInFrames(project), [project]);
  const totalSeconds = useMemo(() => durationInFrames / videoDefaults.fps, [durationInFrames]);

  useEffect(() => {
    if (project.scenes.length === 0) return;
    if (selectedSceneId && project.scenes.some((scene) => scene.id === selectedSceneId)) return;
    const timings = computeSceneTimings(project);
    const atPlayhead = timings.find(
      (timing) => currentFrame >= timing.from && currentFrame < timing.from + timing.durationInFrames
    );
    selectScene(atPlayhead?.scene.id ?? project.scenes[0].id);
  }, [currentFrame, project, selectScene, selectedSceneId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (event: { detail: { frame: number } }) => { setCurrentFrame(event.detail.frame); setPlayheadFrame(event.detail.frame); };
    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [durationInFrames]);

  useEffect(() => {
    setRightPanel("object");
  }, [selectedTimelineObjectId]);

  useEffect(() => {
    if (!selectedSceneId) return;
    const selectedTiming = computeSceneTimings(project).find((entry) => entry.scene.id === selectedSceneId);
    if (!selectedTiming) return;
    playerRef.current?.seekTo(selectedTiming.from);
    setCurrentFrame(selectedTiming.from);
    setPlayheadFrame(selectedTiming.from);
  }, [selectedSceneId]);



  /** Duplicate branches the video: a new named entry that this session keeps
   * editing, leaving the one it came from untouched on disk. */
  function handleDuplicate() {
    const title = window.prompt("Dublikuoti video — naujas pavadinimas", `${project.title} kopija`);
    if (title?.trim()) saveProjectAs(title.trim());
  }

  /** "Save as Template" keeps the SHAPE without claiming the video: the project
   * being edited is untouched, and the copy lands in the Templates tab as a
   * starting point for the next one. */
  function handleSaveAsTemplate() {
    const name = window.prompt("Išsaugoti kaip šabloną — pavadinimas", project.title);
    if (!name?.trim()) return;
    const description = window.prompt("Trumpas aprašymas (nebūtina)", "") ?? undefined;
    saveTemplate(project, name.trim(), description?.trim() || undefined);
  }

  function handleExport() {
    const json = exportProjectJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Returns the failure message, or null on success — the dialog keeps itself
   * open and shows the error, so a typo in a pasted blob does not cost you the
   * paste. */
  function handleImportText(text: string): string | null {
    setImportError(null);
    try {
      loadProject(parseProject(JSON.parse(text)));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Netinkamas projekto JSON.";
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: editorColors.bg,
        color: editorColors.text,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <GlobalStyles />
      <LibraryLoadWarning />
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 16,
          borderBottom: `1px solid ${editorColors.border}`,
          background: editorColors.panel,
        }}
      >
        <div style={{ display: "flex", gap: 4, marginRight: 4 }}>
          {(["storyboard", "scenes"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                ...topButtonStyle,
                borderColor: mode === m ? editorColors.accent : editorColors.border,
                color: mode === m ? editorColors.accent : editorColors.text,
                fontWeight: mode === m ? 600 : 400,
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Project-scoped controls only exist for the scene editor — the
            storyboard has its own Save/Export in its action bar, and two of
            each in one header is a live way to save the wrong thing. */}
        {mode === "scenes" ? (
          <>
            <input
              value={project.title}
              onChange={(e) => updateProjectTitle(e.target.value)}
              style={{
                fontSize: 14,
                fontWeight: 600,
                background: "transparent",
                border: "none",
                color: editorColors.text,
                outline: "none",
                width: 200,
              }}
            />
            <span style={{ fontSize: 12, color: editorColors.textDim }}>{totalSeconds.toFixed(1)}s</span>

            <select
              value={project.id}
              onChange={(e) => openProject(e.target.value)}
              style={{ ...topButtonStyle, cursor: "pointer" }}
              title="Switch project — all projects auto-save locally"
            >
              {!libraryIndex.some((p) => p.id === project.id) ? (
                <option value={project.id}>{project.title} (unsaved)</option>
              ) : null}
              {projectCollections.map(([collection, entries]) => (
                <optgroup key={collection} label={collection}>
                  {entries.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </optgroup>
              ))}
            </select>
            <button onClick={() => createProject("Untitled project")} style={topButtonStyle}>
              New
            </button>
            <button
              onClick={() => setRecoveryOpen(true)}
              style={topButtonStyle}
              title="Ankstesnės šio video versijos ir ištrinti projektai"
            >
              ↺ Atkurti
            </button>
            <button
              onClick={handleDuplicate}
              style={topButtonStyle}
              title="Sukurti šio video kopiją nauju pavadinimu ir tęsti darbą su ja"
            >
              Duplicate
            </button>
            <button
              onClick={() => {
                // Honest wording: the file is moved to `library/.trash/`, not
                // destroyed, so this is recoverable by hand.
                if (window.confirm(`Ištrinti „${project.title}"? Failas keliauja į library/.trash/.`)) {
                  deleteProject(project.id);
                }
              }}
              style={topButtonStyle}
            >
              Delete
            </button>
            <button onClick={undo} disabled={!canUndo} style={{ ...topButtonStyle, opacity: canUndo ? 1 : 0.4 }} title="Undo (Ctrl+Z)">
              ↶ Undo
            </button>
            <button onClick={redo} disabled={!canRedo} style={{ ...topButtonStyle, opacity: canRedo ? 1 : 0.4 }} title="Redo (Ctrl+Shift+Z / Ctrl+Y)">
              ↷ Redo
            </button>

            <div style={{ flex: 1 }} />
            {importError ? (
              <span style={{ fontSize: 11, color: "#ff8a65", maxWidth: 320 }} title={importError}>
                Import failed: {importError}
              </span>
            ) : null}
            <SaveStatusBadge />
            <button onClick={() => setImportOpen(true)} style={topButtonStyle} title="Įklijuoti arba įkelti projekto JSON">
              Import JSON
            </button>
            <button onClick={saveProject} style={topButtonStyle} title="Įrašyti dabar (šiaip viskas saugoma automatiškai)">
              Save
            </button>
            <button
              onClick={handleSaveAsTemplate}
              style={topButtonStyle}
              title="Keep this shape as a reusable starting point"
            >
              Save as Template…
            </button>
            <button onClick={handleExport} style={topButtonStyle}>
              Export JSON
            </button>
            <RenderButton style={topButtonStyle} />
          </>
        ) : null}
      </div>

      {recoveryOpen ? <RecoveryDialog onClose={() => setRecoveryOpen(false)} /> : null}

      {importOpen ? (
        <ImportJsonDialog
          title="Importuoti projekto JSON"
          onImport={handleImportText}
          onClose={() => setImportOpen(false)}
        />
      ) : null}

      {mode === "storyboard" ? (
        <ProjectStoryboardView onOpenScenes={() => setMode("scenes")} />
      ) : (
        <>
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <LibraryPanel />

            {/* The stage is the scroll container; the zoom controls live on the
            wrapper OUTSIDE it, or they would scroll away with the preview at
            the very moment a zoom makes them needed. */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <StoryboardGuide onOpenStoryboard={() => setMode("storyboard")} />
              <div
                ref={stageRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  background: "#0a0a0a",
                  padding: STAGE_PADDING,
                  // Zoomed past the column, the preview has to be reachable — but
                  // `justify/align: center` clips the overflowing start edge instead
                  // of letting it scroll, so centring is done with `margin: auto` on
                  // the child, which scrolls correctly in both directions.
                  overflow: "auto",
                }}
              >
                {project.scenes.length > 0 ? (
                  <div
                    style={{
                      position: "relative",
                      width: preview.width,
                      height: preview.height,
                      flexShrink: 0,
                      margin: "auto",
                    }}
                  >
                    <div
                      style={{
                        width: preview.width,
                        height: preview.height,
                        // No border/inner ring: a light outline on all four sides read
                        // as part of the video rather than as editor chrome.
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <Player
                        ref={playerRef}
                        component={TikTokVideo}
                        inputProps={{ project }}
                        durationInFrames={durationInFrames}
                        fps={videoDefaults.fps}
                        compositionWidth={videoDefaults.width}
                        compositionHeight={videoDefaults.height}
                        style={{
                          width: preview.width,
                          height: preview.height,
                          display: "block",
                        }}
                        controls
                        initiallyShowControls
                        loop
                        acknowledgeRemotionLicense
                        // Rich Headlines fire one SFX per word, and push-transition scenes now
                        // briefly overlap (see SCENE_OVERLAP_FRAMES in utils/duration.ts) — both
                        // can stack past the Player's default shared-audio-tag limit and crash
                        // the preview. Raised well above worst case; doesn't affect real
                        // exports, which don't go through this browser-audio-tag limit at all.
                        numberOfSharedAudioTags={0}
                      />
                    </div>
                    {showSafeZones ? <SafeZoneOverlay platform={safeZonePlatform} /> : null}
                    <BlockPositionOverlay
                      blocks={selectedSceneBlocks}
                      visuals={selectedSceneVisuals}
                      visualPosition={selectedScene?.visualPosition}
                      richHeadline={selectedScene?.content.richHeadline}
                      richHeadlineX={selectedScene?.content.richHeadlineX}
                      richHeadlineY={selectedScene?.content.richHeadlineY}
                      width={preview.width}
                      height={preview.height}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      color: editorColors.textDim,
                      fontSize: 13,
                      margin: "auto",
                    }}
                  >
                    Add a scene from the Library to preview your video.
                  </div>
                )}
              </div>

              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 4,
                  borderRadius: 8,
                  border: `1px solid ${showSafeZones ? editorColors.accent : editorColors.border}`,
                  background: "rgba(26,26,26,0.94)",
                  zIndex: 20,
                }}
              >
                <button
                  onClick={() => setShowSafeZones((visible) => !visible)}
                  style={{ ...zoomButtonStyle, width: "auto", padding: "0 8px", color: showSafeZones ? editorColors.accent : editorColors.text }}
                  title="Rodyti arba paslėpti platformų UI safe zonas"
                >
                  {showSafeZones ? "◉ Safe zones" : "○ Safe zones"}
                </button>
                {showSafeZones ? (
                  <select
                    value={safeZonePlatform}
                    onChange={(event) => setSafeZonePlatform(event.target.value as SafeZonePlatform)}
                    style={{ ...topButtonStyle, height: 26, padding: "2px 7px", fontSize: 10 }}
                    title="Tikrinama platforma"
                  >
                    {(Object.keys(safeZonePresets) as SafeZonePlatform[]).map((platform) => (
                      <option key={platform} value={platform}>{safeZonePresets[platform].label}</option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  padding: 3,
                  borderRadius: 8,
                  border: `1px solid ${editorColors.border}`,
                  background: "rgba(26,26,26,0.92)",
                  zIndex: 2,
                }}
              >
                <button
                  onClick={() => zoomBy(1 / ZOOM_STEP)}
                  disabled={zoom <= ZOOM_MIN + 0.001}
                  style={zoomButtonStyle}
                  title="Atitolinti"
                >
                  −
                </button>
                <button
                  onClick={() => setZoom(1)}
                  style={{
                    ...zoomButtonStyle,
                    width: 52,
                    fontSize: 11,
                    fontVariantNumeric: "tabular-nums",
                  }}
                  title="Sutalpinti į langą (100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => zoomBy(ZOOM_STEP)}
                  disabled={zoom >= ZOOM_MAX - 0.001}
                  style={zoomButtonStyle}
                  title="Priartinti"
                >
                  +
                </button>
              </div>
            </div>

            {/* Scene settings and object settings are both reachable at all
                times. They used to be either/or: selecting anything on the
                timeline replaced the scene panel, so the scene's own duration,
                background and transition could only be reached by first
                deselecting — and something is almost always selected. */}
            {selectedTimelineObjectId ? (
              <div
                className="panel-stack"
                style={{
                  // Carries the column's own size, because the panels inside it
                  // no longer can — see the `.panel-stack` rule in GlobalStyles.
                  width: "clamp(300px, 23vw, 480px)",
                  flexShrink: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  // Without this the panel inside overflows the column visibly
                  // instead of scrolling within it.
                  overflow: "hidden",
                  borderLeft: `1px solid ${editorColors.border}`,
                  background: editorColors.panel,
                }}
              >
                <div style={{ display: "flex", gap: 3, padding: "6px 10px 0", flexShrink: 0 }}>
                  {(["object", "scene"] as const).map((id) => (
                    <button
                      key={id}
                      onClick={() => setRightPanel(id)}
                      style={{
                        flex: 1,
                        padding: "4px 0",
                        fontSize: 10,
                        borderRadius: 5,
                        cursor: "pointer",
                        border: `1px solid ${rightPanel === id ? editorColors.accent : editorColors.border}`,
                        background: rightPanel === id ? "rgba(255,112,36,0.10)" : "transparent",
                        color: rightPanel === id ? editorColors.accent : editorColors.textDim,
                      }}
                    >
                      {id === "object" ? "Objektas" : "Scena"}
                    </button>
                  ))}
                </div>
                {rightPanel === "object" ? (
                  <TimelineObjectPanel selectionId={selectedTimelineObjectId} onClose={() => setSelectedTimelineObjectId(null)} />
                ) : (
                  <InspectorPanel />
                )}
              </div>
            ) : (
              <InspectorPanel />
            )}
          </div>

          <SceneTimeline currentFrame={currentFrame} onSeek={(frame) => { playerRef.current?.seekTo(frame); setCurrentFrame(frame); setPlayheadFrame(frame); }} />
          <SceneStrip />
        </>
      )}
    </div>
  );
};

const zoomButtonStyle: React.CSSProperties = {
  width: 26,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 5,
  border: "none",
  background: "transparent",
  color: editorColors.text,
  fontSize: 15,
  lineHeight: 1,
  cursor: "pointer",
};

const topButtonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  fontSize: 12,
  cursor: "pointer",
};
