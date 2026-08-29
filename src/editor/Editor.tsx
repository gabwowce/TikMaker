import React, { useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { useProjectStore } from "./state/projectStore";
import { editorColors } from "./theme";
import { LibraryPanel } from "./panels/LibraryPanel";
import { InspectorPanel } from "./panels/InspectorPanel";
import { SceneStrip } from "./panels/SceneStrip";
import { TikTokVideo } from "../video/TikTokVideo";
import { videoDefaults } from "../video/typography/tokens";
import { projectDurationInFrames } from "../utils/duration";
import { parseProject } from "../utils/normalizeProject";
import { BlockPositionOverlay } from "./BlockPositionOverlay";
import { RenderButton } from "./RenderButton";

/** The preview sizes itself to whatever room the middle column has, instead of
 * sitting at a fixed 380px while the space around it goes unused. Capped so it
 * doesn't turn into a wall on a very tall window. */
const PREVIEW_MIN_WIDTH = 300;
const PREVIEW_MAX_WIDTH = 620;
const STAGE_PADDING = 24;

const VIDEO_RATIO = videoDefaults.height / videoDefaults.width;

export const Editor: React.FC = () => {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [preview, setPreview] = React.useState({
    width: PREVIEW_MIN_WIDTH,
    height: Math.round(PREVIEW_MIN_WIDTH * VIDEO_RATIO),
  });

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const availableWidth = stage.clientWidth - STAGE_PADDING * 2;
      const availableHeight = stage.clientHeight - STAGE_PADDING * 2;
      const width = Math.round(
        Math.max(PREVIEW_MIN_WIDTH, Math.min(PREVIEW_MAX_WIDTH, availableWidth, availableHeight / VIDEO_RATIO))
      );
      setPreview({ width, height: Math.round(width * VIDEO_RATIO) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const project = useProjectStore((s) => s.project);
  const saveProject = useProjectStore((s) => s.saveProject);
  const exportProjectJson = useProjectStore((s) => s.exportProjectJson);
  const loadProject = useProjectStore((s) => s.loadProject);
  const updateProjectTitle = useProjectStore((s) => s.updateProjectTitle);
  const libraryIndex = useProjectStore((s) => s.libraryIndex);
  const openProject = useProjectStore((s) => s.openProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const createProject = useProjectStore((s) => s.createProject);
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const selectedScene = project.scenes.find((s) => s.id === selectedSceneId);
  const selectedSceneBlocks = selectedScene?.content.blocks ?? [];
  const selectedSceneVisuals = selectedScene?.content.visuals ?? [];

  const durationInFrames = useMemo(() => projectDurationInFrames(project), [project]);
  const totalSeconds = useMemo(() => durationInFrames / videoDefaults.fps, [durationInFrames]);

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

  async function handleImportFile(file: File) {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = parseProject(JSON.parse(text));
      loadProject(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Invalid project JSON.");
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
          {libraryIndex.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button onClick={() => createProject("Untitled project")} style={topButtonStyle}>
          New
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Delete "${project.title}"? This cannot be undone.`)) deleteProject(project.id);
          }}
          style={topButtonStyle}
        >
          Delete
        </button>

        <div style={{ flex: 1 }} />
        {importError ? (
          <span style={{ fontSize: 11, color: "#ff8a65", maxWidth: 320 }} title={importError}>
            Import failed: {importError}
          </span>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInputRef.current?.click()} style={topButtonStyle}>
          Import JSON
        </button>
        <button onClick={saveProject} style={topButtonStyle}>
          Save
        </button>
        <button onClick={handleExport} style={topButtonStyle}>
          Export JSON
        </button>
        <RenderButton style={topButtonStyle} />
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <LibraryPanel />

        <div
          ref={stageRef}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            padding: STAGE_PADDING,
            overflow: "hidden",
          }}
        >
          {project.scenes.length > 0 ? (
            <div style={{ position: "relative", width: preview.width, height: preview.height, flexShrink: 0 }}>
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
                  component={TikTokVideo}
                  inputProps={{ project }}
                  durationInFrames={durationInFrames}
                  fps={videoDefaults.fps}
                  compositionWidth={videoDefaults.width}
                  compositionHeight={videoDefaults.height}
                  style={{ width: preview.width, height: preview.height, display: "block" }}
                  controls
                  initiallyShowControls
                  loop
                  acknowledgeRemotionLicense
                  // Rich Headlines fire one SFX per word, and push-transition scenes now
                  // briefly overlap (see SCENE_OVERLAP_FRAMES in utils/duration.ts) — both
                  // can stack past the Player's default shared-audio-tag limit and crash
                  // the preview. Raised well above worst case; doesn't affect real
                  // exports, which don't go through this browser-audio-tag limit at all.
                  numberOfSharedAudioTags={40}
                />
              </div>
              <BlockPositionOverlay
                blocks={selectedSceneBlocks}
                visuals={selectedSceneVisuals}
                visualPosition={selectedScene?.visualPosition}
                width={preview.width}
                height={preview.height}
              />
            </div>
          ) : (
            <div style={{ color: editorColors.textDim, fontSize: 13 }}>
              Add a scene from the Library to preview your video.
            </div>
          )}
        </div>

        <InspectorPanel />
      </div>

      <SceneStrip />
    </div>
  );
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
