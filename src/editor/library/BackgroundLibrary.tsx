import React from "react";
import { backgroundRegistry } from "../../registries/backgroundRegistry";
import { useProjectStore } from "../state/projectStore";
import { useSavedBackgroundsStore } from "../state/savedBackgroundsStore";
import { useCustomAssetsStore, assetKind } from "../state/customAssetsStore";
import { editorColors } from "../theme";
import { backgroundFillStyle } from "../../video/backgrounds/customBackgroundStyle";
import { GridOverlay } from "../../video/backgrounds/GridOverlay";
import type { BackgroundFill, BackgroundGrid, CustomBackground } from "../../schema/scene";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: editorColors.textDim,
  margin: "16px 0 6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  fontSize: 13,
  boxSizing: "border-box",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  cursor: "pointer",
  fontSize: 11,
};

/** Live preview of a fill+grid combination — literally renders the same
 * `backgroundFillStyle`/`GridOverlay` the actual video uses, so the swatch can
 * never drift from what applying it actually looks like. */
export const BackgroundSwatch: React.FC<{ fill: BackgroundFill; grid?: BackgroundGrid; height?: number }> = ({
  fill,
  grid,
  height = 64,
}) => (
  <div
    style={{
      position: "relative",
      height,
      borderRadius: 8,
      overflow: "hidden",
      border: `1px solid ${editorColors.border}`,
      ...backgroundFillStyle(fill),
    }}
  >
    {grid && grid !== "none" ? <GridOverlay variant={grid} /> : null}
  </div>
);

const fillTabs: { id: BackgroundFill["kind"]; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "gradient", label: "Gradient" },
  { id: "image", label: "Image" },
];

const gridOptions: { id: BackgroundGrid; label: string }[] = [
  { id: "none", label: "None" },
  { id: "lines", label: "Lines" },
  { id: "dots", label: "Dots" },
];

const DEFAULT_GRADIENT = ["#FF7024", "#171717"];

/** The custom-background builder: pick a fill (solid/gradient/image from your
 * imports), an optional grid overlay, preview it live, then apply it to the
 * selected scene or save it under a name for reuse across projects. */
const CustomBackgroundBuilder: React.FC<{ onApply: (bg: CustomBackground) => void }> = ({ onApply }) => {
  const images = useCustomAssetsStore((s) => s.assets).filter((a) => assetKind(a) === "image");
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);
  const saveBackground = useSavedBackgroundsStore((s) => s.save);

  const [fillKind, setFillKind] = React.useState<BackgroundFill["kind"]>("solid");
  const [solidColor, setSolidColor] = React.useState("#171717");
  const [gradientColors, setGradientColors] = React.useState<string[]>(DEFAULT_GRADIENT);
  const [gradientShape, setGradientShape] = React.useState<"linear" | "radial">("linear");
  const [gradientAngle, setGradientAngle] = React.useState(135);
  const [imageSrc, setImageSrc] = React.useState<string | undefined>(undefined);
  const [grid, setGrid] = React.useState<BackgroundGrid>("none");
  const [saveName, setSaveName] = React.useState("");

  React.useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  const fill: BackgroundFill | null =
    fillKind === "solid"
      ? { kind: "solid", color: solidColor }
      : fillKind === "gradient"
        ? { kind: "gradient", colors: gradientColors, shape: gradientShape, angle: gradientAngle }
        : imageSrc
          ? { kind: "image", src: imageSrc }
          : null;

  function updateGradientColor(index: number, color: string) {
    setGradientColors((prev) => prev.map((c, i) => (i === index ? color : c)));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 6 }}>
        {fillTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFillKind(tab.id)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: `1px solid ${fillKind === tab.id ? editorColors.accent : editorColors.border}`,
              background: fillKind === tab.id ? editorColors.panelElevated : "transparent",
              color: fillKind === tab.id ? editorColors.accent : editorColors.textDim,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        {fillKind === "solid" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="color"
              value={solidColor}
              onChange={(e) => setSolidColor(e.target.value)}
              style={{ width: 44, height: 36, padding: 0, border: `1px solid ${editorColors.border}`, borderRadius: 6, background: "none" }}
            />
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={solidColor}
              onChange={(e) => setSolidColor(e.target.value)}
              placeholder="#171717"
            />
          </div>
        ) : null}

        {fillKind === "gradient" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {gradientColors.map((color, index) => (
              <div key={index} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => updateGradientColor(index, e.target.value)}
                  style={{ width: 44, height: 36, padding: 0, border: `1px solid ${editorColors.border}`, borderRadius: 6, background: "none" }}
                />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={color}
                  onChange={(e) => updateGradientColor(index, e.target.value)}
                />
                <button
                  style={smallButtonStyle}
                  disabled={gradientColors.length <= 2}
                  onClick={() => setGradientColors((prev) => prev.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              style={smallButtonStyle}
              disabled={gradientColors.length >= 3}
              onClick={() => setGradientColors((prev) => [...prev, "#FF7024"])}
            >
              + Add color
            </button>

            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {(["linear", "radial"] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setGradientShape(shape)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    fontSize: 11,
                    borderRadius: 6,
                    border: `1px solid ${gradientShape === shape ? editorColors.accent : editorColors.border}`,
                    background: gradientShape === shape ? editorColors.panelElevated : "transparent",
                    color: gradientShape === shape ? editorColors.accent : editorColors.textDim,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {shape === "radial" ? "Radial circle" : "Linear"}
                </button>
              ))}
            </div>
            {gradientShape === "linear" ? (
              <div>
                <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 2 }}>
                  Angle — {gradientAngle}°
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  style={{ width: "100%" }}
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(Number(e.target.value))}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {fillKind === "image" ? (
          images.length === 0 ? (
            <div style={{ fontSize: 11, color: editorColors.textDim }}>
              No images imported yet — add one from the Assets tab, then it'll show up here.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {images.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setImageSrc(asset.src)}
                  title={asset.label}
                  style={{
                    padding: 0,
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: "pointer",
                    border: `2px solid ${imageSrc === asset.src ? editorColors.accent : editorColors.border}`,
                    background: "none",
                  }}
                >
                  <img src={asset.src} alt={asset.label} style={{ width: "100%", height: 60, objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>

      <div style={sectionTitleStyle}>Grid overlay</div>
      <div style={{ display: "flex", gap: 6 }}>
        {gridOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setGrid(option.id)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 11,
              borderRadius: 6,
              border: `1px solid ${grid === option.id ? editorColors.accent : editorColors.border}`,
              background: grid === option.id ? editorColors.panelElevated : "transparent",
              color: grid === option.id ? editorColors.accent : editorColors.textDim,
              cursor: "pointer",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={sectionTitleStyle}>Preview</div>
      {fill ? <BackgroundSwatch fill={fill} grid={grid} height={110} /> : (
        <div style={{ fontSize: 11, color: editorColors.textDim }}>Pick an image above to preview it.</div>
      )}

      <button
        style={{ ...smallButtonStyle, width: "100%", marginTop: 10, opacity: fill ? 1 : 0.5 }}
        disabled={!fill}
        onClick={() => fill && onApply({ type: "custom", fill, grid: grid === "none" ? undefined : grid })}
      >
        Apply to this scene
      </button>

      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Name this background to save it…"
        />
        <button
          style={{ ...smallButtonStyle, opacity: fill && saveName.trim() ? 1 : 0.5 }}
          disabled={!fill || !saveName.trim()}
          onClick={() => {
            if (!fill) return;
            const bg: CustomBackground = { type: "custom", fill, grid: grid === "none" ? undefined : grid };
            saveBackground(saveName, bg);
            onApply(bg);
            setSaveName("");
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export const BackgroundLibrary: React.FC = () => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const updateSceneBackground = useProjectStore((s) => s.updateSceneBackground);
  const savedBackgrounds = useSavedBackgroundsStore((s) => s.backgrounds);
  const removeSavedBackground = useSavedBackgroundsStore((s) => s.remove);
  const disabled = !selectedSceneId;

  return (
    <div style={{ opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? "none" : "auto" }}>
      {disabled ? (
        <div style={{ fontSize: 12, color: editorColors.textDim, marginBottom: 8 }}>
          Select a scene to change its background.
        </div>
      ) : null}

      <div style={sectionTitleStyle}>Presets</div>
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

      {savedBackgrounds.length > 0 ? (
        <>
          <div style={sectionTitleStyle}>Your Backgrounds</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {savedBackgrounds.map((saved) => (
              <div
                key={saved.id}
                style={{
                  border: `1px solid ${editorColors.border}`,
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => selectedSceneId && updateSceneBackground(selectedSceneId, saved.background)}
                  style={{ display: "block", width: "100%", padding: 0, border: "none", cursor: "pointer", background: "none" }}
                >
                  <BackgroundSwatch fill={saved.background.fill} grid={saved.background.grid} height={48} />
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px" }}>
                  <div style={{ fontSize: 12, color: editorColors.text }}>{saved.name}</div>
                  <button
                    style={{ ...smallButtonStyle, padding: "2px 8px" }}
                    onClick={() => removeSavedBackground(saved.id)}
                    title="Delete this saved background"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div style={sectionTitleStyle}>Build your own</div>
      <CustomBackgroundBuilder
        onApply={(bg) => selectedSceneId && updateSceneBackground(selectedSceneId, bg)}
      />
    </div>
  );
};
