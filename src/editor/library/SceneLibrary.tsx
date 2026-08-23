import React from "react";
import { sceneRegistry } from "../../registries/sceneRegistry";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";

export const SceneLibrary: React.FC = () => {
  const addScene = useProjectStore((s) => s.addScene);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sceneRegistry.map((scene) => (
        <button
          key={scene.type}
          onClick={() => addScene(scene.type)}
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
          <div style={{ fontSize: 13, fontWeight: 600 }}>{scene.name}</div>
          <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 2 }}>{scene.description}</div>
        </button>
      ))}
    </div>
  );
};
