import React, { useEffect, useState } from "react";
import { toolList } from "../../registries/toolRegistry";
import { propList } from "../../registries/propRegistry";
import { visualTemplateRegistry, visualTemplateCategories } from "../../registries/visualTemplateRegistry";
import { useProjectStore } from "../state/projectStore";
import { splitCornerProps } from "../../utils/normalizeProject";
import type { VisualSlot } from "../state/projectStore";
import { useCustomAssetsStore, assetKind } from "../state/customAssetsStore";
import { editorColors } from "../theme";
import { VisualThumb } from "./VisualThumb";
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

/** "main" is gone: a scene no longer has a single privileged visual slot, so
 * the only column-scoped destinations left are the comparison sides. */
const slotOptions: { id: VisualSlot; label: string }[] = [
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
];

/** Where a click in this tab sends the visual. "layer" appends to
 * `content.visuals[]` — the scene's one visual stack, where every entry gets
 * the same position/scale/animation/sound controls. "column" is the comparison
 * scene's genuine exception: its left/right visuals belong to a column and move
 * with it, so they can't be free-floating layers. */
type Target = "layer" | "column";

const targetOptions: { id: Target; label: string; hint: string }[] = [
  { id: "layer", label: "New layer", hint: "Adds a visual to this scene's stack — position, scale and animate it on its own." },
  { id: "column", label: "Comparison column", hint: "Puts the visual inside the left/right column so it moves with that column." },
];

export const VisualLibrary: React.FC = () => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const scene = useProjectStore((s) => s.project.scenes.find((sc) => sc.id === s.selectedSceneId));
  const updateSceneVisual = useProjectStore((s) => s.updateSceneVisual);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const activeVisualSlot = useProjectStore((s) => s.activeVisualSlot);
  const setActiveVisualSlot = useProjectStore((s) => s.setActiveVisualSlot);

  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);

  const [target, setTarget] = useState<Target>("layer");

  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  const disabled = !selectedSceneId;
  const isComparison = scene?.type === "comparison";
  const layerCount = scene?.content.visuals?.length ?? 0;
  const layersFull = layerCount >= 10;
  // The column target only exists on comparison scenes; everywhere else the
  // stack is the only destination, so the picker isn't worth showing.
  const showTargets = isComparison;
  const effectiveTarget: Target = isComparison ? target : "layer";

  function assign(visual: VisualConfig) {
    if (!selectedSceneId || !scene) return;
    if (effectiveTarget === "column") {
      // Guard the stale default: `activeVisualSlot` starts at "main", which no
      // longer has anywhere to go, so a click would silently do nothing.
      if (activeVisualSlot === "main") setActiveVisualSlot("left");
      updateSceneVisual(selectedSceneId, visual);
      return;
    }
    if (layersFull) return;
    const existing = scene.content.visuals ?? [];
    // A corner-props preset is really two props — expand it here the same way
    // loading a project does, so it arrives as two independently editable
    // layers rather than one compound that only splits on the next reload.
    const added = splitCornerProps({
      id: `visual-${Date.now().toString(36)}`,
      visual,
      // Offset each new layer so a second one doesn't land exactly on top
      // of the first and read as nothing having happened.
      x: 50,
      y: 50 - existing.length * 12,
    });
    updateSceneVisuals(selectedSceneId, [...existing, ...added].slice(0, 10));
  }

  return (
    <div style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      {disabled ? (
        <div style={{ fontSize: 12, color: editorColors.textDim }}>Select a scene to assign a visual.</div>
      ) : null}

      <div style={sectionTitleStyle}>Clicking a visual</div>
      {showTargets ? (
        <div style={{ display: "flex", gap: 6 }}>
          {targetOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setTarget(option.id)}
              title={option.hint}
              style={{
                flex: 1,
                padding: "6px 0",
                fontSize: 11,
                borderRadius: 6,
                border: `1px solid ${effectiveTarget === option.id ? editorColors.accent : editorColors.border}`,
                background: effectiveTarget === option.id ? editorColors.panelElevated : "transparent",
                color: effectiveTarget === option.id ? editorColors.accent : editorColors.textDim,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>
        {effectiveTarget === "column"
          ? targetOptions[1].hint
          : layersFull
            ? "10 layers already on this scene — remove one in the Inspector first."
            : `Adds a layer on top of the ${layerCount} already here. Every layer is configured the same way in the Inspector's "Layers" section (position, scale, In/Out, sound, carry to the next scene), or drag it straight on the preview.`}
      </div>

      {isComparison && effectiveTarget === "column" ? (
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
            {customAssets.map((asset) => {
              const isVideo = assetKind(asset) === "video";
              return (
                <button
                  key={asset.id}
                  style={gridButtonStyle}
                  title={isVideo ? "Screen recording — inserted in a browser frame" : asset.label}
                  onClick={() =>
                    assign(
                      isVideo
                        ? { type: "recording", src: asset.src, frame: "browser", fit: "cover", playbackRate: 1 }
                        : { type: "image", src: asset.src }
                    )
                  }
                >
                  {isVideo ? (
                    <video
                      src={asset.src}
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: 28, height: 28, objectFit: "cover", borderRadius: 4 }}
                    />
                  ) : (
                    <img src={asset.src} alt={asset.label} style={{ width: 28, height: 28, objectFit: "contain" }} />
                  )}
                  {asset.label}
                </button>
              );
            })}
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

      {visualTemplateCategories.map((category) => {
        const presets = visualTemplateRegistry.filter((preset) => preset.category === category.id);
        if (presets.length === 0) return null;
        return (
          <React.Fragment key={category.id}>
            <div style={sectionTitleStyle}>{category.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  style={{
                    ...gridButtonStyle,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    textAlign: "left",
                  }}
                  title={preset.description}
                  onClick={() => assign(preset.build())}
                >
                  <VisualThumb visual={preset.build()} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{preset.label}</div>
                    <div style={{ color: editorColors.textDim, fontSize: 9 }}>{preset.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </React.Fragment>
        );
      })}

      {selectedSceneId && isComparison && effectiveTarget === "column" ? (
        <button
          style={{ ...gridButtonStyle, alignItems: "flex-start", marginTop: 10 }}
          onClick={() => updateSceneVisual(selectedSceneId, undefined)}
        >
          Remove this column's visual
        </button>
      ) : null}
    </div>
  );
};
