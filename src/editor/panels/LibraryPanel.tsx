import React, { useState } from "react";
import { editorColors } from "../theme";
import { SceneLibrary } from "../library/SceneLibrary";
import { VisualLibrary } from "../library/VisualLibrary";
import { BackgroundLibrary } from "../library/BackgroundLibrary";
import { AssetLibrary } from "../library/AssetLibrary";

const tabs = [
  { id: "scenes", label: "Scenes", Component: SceneLibrary },
  { id: "visuals", label: "Visuals", Component: VisualLibrary },
  { id: "backgrounds", label: "BG", Component: BackgroundLibrary },
  { id: "assets", label: "Assets", Component: AssetLibrary },
] as const;

export const LibraryPanel: React.FC = () => {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("scenes");
  const ActiveComponent = tabs.find((t) => t.id === active)!.Component;

  return (
    <div
      style={{
        width: 260,
        borderRight: `1px solid ${editorColors.border}`,
        background: editorColors.panel,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", borderBottom: `1px solid ${editorColors.border}` }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 12,
              fontWeight: 600,
              background: active === tab.id ? editorColors.panelElevated : "transparent",
              color: active === tab.id ? editorColors.accent : editorColors.textDim,
              border: "none",
              borderBottom: active === tab.id ? `2px solid ${editorColors.accent}` : "2px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        <ActiveComponent />
      </div>
    </div>
  );
};
