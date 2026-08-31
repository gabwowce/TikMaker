import React, { useState } from "react";
import { editorColors } from "../theme";
import { TemplateLibrary } from "../library/TemplateLibrary";
import { SceneLibrary } from "../library/SceneLibrary";
import { VisualLibrary } from "../library/VisualLibrary";
import { BackgroundLibrary } from "../library/BackgroundLibrary";
import { AssetLibrary } from "../library/AssetLibrary";
import { SoundLibrary } from "../library/SoundLibrary";
import { TextLibrary } from "../library/TextLibrary";

const tabs = [
  { id: "text", label: "Text", Component: TextLibrary },
  { id: "visuals", label: "Visuals", Component: VisualLibrary },
  { id: "sound", label: "Sound", Component: SoundLibrary },
  { id: "scenes", label: "Scenes", Component: SceneLibrary },
  { id: "templates", label: "Templates", Component: TemplateLibrary },
  { id: "backgrounds", label: "BG", Component: BackgroundLibrary },
  { id: "assets", label: "Assets", Component: AssetLibrary },
] as const;

export const LibraryPanel: React.FC = () => {
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("text");
  const ActiveComponent = tabs.find((t) => t.id === active)!.Component;

  return (
    <div
      style={{
        // Grows with the window instead of squeezing a 3-up asset grid into a
        // fixed 260px: the 9:16 preview is narrow by definition, so the space
        // either side is better spent on the panels than left empty.
        width: "clamp(260px, 19vw, 420px)",
        flexShrink: 0,
        borderRight: `1px solid ${editorColors.border}`,
        background: editorColors.panel,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderBottom: `1px solid ${editorColors.border}`,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              padding: "9px 2px",
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
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
