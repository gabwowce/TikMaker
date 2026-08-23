import React from "react";
import { backgroundRegistry } from "../../registries/backgroundRegistry";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";

export const BackgroundLibrary: React.FC = () => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const updateSceneBackground = useProjectStore((s) => s.updateSceneBackground);
  const disabled = !selectedSceneId;

  return (
    <div style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      {disabled ? (
        <div style={{ fontSize: 12, color: editorColors.textDim, marginBottom: 8 }}>
          Select a scene to change its background.
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {backgroundRegistry.map((bg) => (
          <button
            key={bg.id}
            onClick={() => selectedSceneId && updateSceneBackground(selectedSceneId, bg.id)}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${editorColors.border}`,
              background: editorColors.panelElevated,
              color: editorColors.text,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>{bg.name}</div>
            <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 2 }}>{bg.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
