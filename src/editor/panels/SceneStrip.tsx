import React from "react";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import { getSceneDefinition } from "../../registries/sceneRegistry";

export const SceneStrip: React.FC = () => {
  const scenes = useProjectStore((s) => s.project.scenes);
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const selectScene = useProjectStore((s) => s.selectScene);
  const duplicateScene = useProjectStore((s) => s.duplicateScene);
  const removeScene = useProjectStore((s) => s.removeScene);
  const moveScene = useProjectStore((s) => s.moveScene);

  return (
    <div
      style={{
        height: 110,
        borderTop: `1px solid ${editorColors.border}`,
        background: editorColors.panel,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 16px",
        overflowX: "auto",
      }}
    >
      {scenes.length === 0 ? (
        <div style={{ color: editorColors.textDim, fontSize: 13 }}>
          No scenes yet — add one from the Scenes tab.
        </div>
      ) : null}

      {scenes.map((scene, index) => {
        const def = getSceneDefinition(scene.type);
        const isSelected = scene.id === selectedSceneId;
        return (
          <div
            key={scene.id}
            onClick={() => selectScene(scene.id)}
            style={{
              minWidth: 150,
              padding: 10,
              borderRadius: 8,
              border: `1px solid ${isSelected ? editorColors.accent : editorColors.border}`,
              background: editorColors.panelElevated,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 11, color: editorColors.textDim }}>
              {String(index + 1).padStart(2, "0")} {def.name.toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: editorColors.text, marginTop: 2 }}>
              {scene.durationSeconds.toFixed(1)}s
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              <button
                title="Move up"
                onClick={(e) => {
                  e.stopPropagation();
                  moveScene(scene.id, "up");
                }}
                style={miniButtonStyle}
              >
                ↑
              </button>
              <button
                title="Move down"
                onClick={(e) => {
                  e.stopPropagation();
                  moveScene(scene.id, "down");
                }}
                style={miniButtonStyle}
              >
                ↓
              </button>
              <button
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateScene(scene.id);
                }}
                style={miniButtonStyle}
              >
                ⧉
              </button>
              <button
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeScene(scene.id);
                }}
                style={miniButtonStyle}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const miniButtonStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 11,
  padding: "3px 0",
  borderRadius: 4,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  cursor: "pointer",
};
