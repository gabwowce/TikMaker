import React, { useEffect } from "react";
import { toolList } from "../../registries/toolRegistry";
import { propList } from "../../registries/propRegistry";
import { visualTemplateRegistry } from "../../registries/visualTemplateRegistry";
import { useProjectStore } from "../state/projectStore";
import type { VisualSlot } from "../state/projectStore";
import { useCustomAssetsStore } from "../state/customAssetsStore";
import { editorColors } from "../theme";
import type { VisualConfig } from "../../schema/visual";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: editorColors.textDim,
  margin: "12px 0 6px",
};

const gridButtonStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  padding: 8,
  borderRadius: 8,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  cursor: "pointer",
  fontSize: 10,
};

const slotOptions: { id: VisualSlot; label: string }[] = [
  { id: "main", label: "Main" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

export const VisualLibrary: React.FC = () => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const selectedSceneType = useProjectStore((s) => s.project.scenes.find((sc) => sc.id === s.selectedSceneId)?.type);
  const updateSceneVisual = useProjectStore((s) => s.updateSceneVisual);
  const activeVisualSlot = useProjectStore((s) => s.activeVisualSlot);
  const setActiveVisualSlot = useProjectStore((s) => s.setActiveVisualSlot);

  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);

  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  const disabled = !selectedSceneId;
  const isComparison = selectedSceneType === "comparison";

  function assign(visual: VisualConfig) {
    if (!selectedSceneId) return;
    updateSceneVisual(selectedSceneId, visual);
  }

  return (
    <div style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      {disabled ? (
        <div style={{ fontSize: 12, color: editorColors.textDim }}>Select a scene to assign a visual.</div>
      ) : null}

      {isComparison ? (
        <>
          <div style={sectionTitleStyle}>Assign visual to</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {slotOptions.map((slot) => (
              <button
                key={slot.id}
                onClick={() => setActiveVisualSlot(slot.id)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  fontSize: 11,
                  borderRadius: 6,
                  border: `1px solid ${activeVisualSlot === slot.id ? editorColors.accent : editorColors.border}`,
                  background: activeVisualSlot === slot.id ? editorColors.panelElevated : "transparent",
                  color: activeVisualSlot === slot.id ? editorColors.accent : editorColors.textDim,
                  cursor: "pointer",
                }}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {customAssets.length > 0 ? (
        <>
          <div style={sectionTitleStyle}>Your Imports</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {customAssets.map((asset) => (
              <button
                key={asset.id}
                style={gridButtonStyle}
                onClick={() => assign({ type: "image", src: asset.src })}
              >
                <img src={asset.src} alt={asset.label} style={{ width: 28, height: 28, objectFit: "contain" }} />
                {asset.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div style={sectionTitleStyle}>Tool Logos</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {toolList.map((tool) => (
          <button key={tool.id} style={gridButtonStyle} onClick={() => assign({ type: "tool-logo", tool: tool.id })}>
            <img src={tool.src} alt={tool.name} style={{ width: 28, height: 28, objectFit: "contain" }} />
            {tool.name}
          </button>
        ))}
      </div>

      <div style={sectionTitleStyle}>Props</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {propList.map((prop) => (
          <button key={prop.id} style={gridButtonStyle} onClick={() => assign({ type: "prop", asset: prop.id })}>
            <img src={prop.src} alt={prop.name} style={{ width: 28, height: 28, objectFit: "contain" }} />
            {prop.name}
          </button>
        ))}
      </div>

      <div style={sectionTitleStyle}>Templates</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visualTemplateRegistry.map((preset) => (
          <button
            key={preset.id}
            style={{ ...gridButtonStyle, alignItems: "flex-start", textAlign: "left" }}
            title={preset.description}
            onClick={() => assign(preset.build())}
          >
            <div style={{ fontWeight: 600 }}>{preset.label}</div>
            <div style={{ color: editorColors.textDim, fontSize: 9 }}>{preset.description}</div>
          </button>
        ))}
        {selectedSceneId ? (
          <button
            style={{ ...gridButtonStyle, alignItems: "flex-start" }}
            onClick={() => updateSceneVisual(selectedSceneId, undefined)}
          >
            Remove visual
          </button>
        ) : null}
      </div>
    </div>
  );
};
