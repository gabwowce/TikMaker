import React from "react";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import {
  entrancePresetSchema,
  exitPresetSchema,
  transitionPresetSchema,
  backgroundIdSchema,
  richTextSizeSchema,
  richTextFontSchema,
  richTextSplitBySchema,
} from "../../schema/scene";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import { backgroundRegistry } from "../../registries/backgroundRegistry";
import { propList } from "../../registries/propRegistry";
import { toolList } from "../../registries/toolRegistry";
import { useCustomAssetsStore, type CustomAsset } from "../state/customAssetsStore";
import type { VisualConfig } from "../../schema/visual";
import type { StepItem, Block, PositionedVisualEntry, RichHeadlineLine } from "../../schema/scene";

const labelStyle: React.CSSProperties = {
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
  padding: "4px 10px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  fontSize: 11,
  cursor: "pointer",
};

/** A collapsible group of fields — keeps the Inspector scannable instead of one
 * long wall of every possible field for every scene type. */
const Section: React.FC<{
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div style={{ borderTop: `1px solid ${editorColors.border}`, marginTop: 12, paddingTop: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: editorColors.text, letterSpacing: 0.3 }}>{title}</span>
        <span style={{ fontSize: 11, color: editorColors.textDim }}>{open ? "▾" : "▸"}</span>
      </button>
      {subtitle ? (
        <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 4 }}>{subtitle}</div>
      ) : null}
      {open ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
};

const COMPOUND_VISUAL_TYPES = new Set(["flow", "stack", "transform", "browser", "phone"]);

type AssetOption = { key: string; label: string; src: string; toVisual: () => VisualConfig };

const staticAssetOptions: AssetOption[] = [
  ...propList.map((prop) => ({
    key: `prop:${prop.id}`,
    label: prop.name,
    src: prop.src,
    toVisual: (): VisualConfig => ({ type: "prop", asset: prop.id }),
  })),
  ...toolList.map((tool) => ({
    key: `tool:${tool.id}`,
    label: tool.name,
    src: tool.src,
    toVisual: (): VisualConfig => ({ type: "tool-logo", tool: tool.id }),
  })),
];

// kept as the module-level default (e.g. for "+ Add asset" buttons) — the
// full reactive list including custom imports lives in buildAssetOptions
const assetOptions = staticAssetOptions;

function buildAssetOptions(custom: CustomAsset[]): AssetOption[] {
  return [
    ...staticAssetOptions,
    ...custom.map((asset) => ({
      key: `custom:${asset.id}`,
      label: asset.label,
      src: asset.src,
      toVisual: (): VisualConfig => ({ type: "image", src: asset.src }),
    })),
  ];
}

function assetKeyOf(visual: VisualConfig | undefined, custom: CustomAsset[]): string {
  if (!visual) return "";
  if (visual.type === "prop") return `prop:${visual.asset}`;
  if (visual.type === "tool-logo") return `tool:${visual.tool}`;
  if (visual.type === "image") {
    const match = custom.find((a) => a.src === visual.src);
    if (match) return `custom:${match.id}`;
  }
  return "";
}

const AssetSelect: React.FC<{ value: VisualConfig | undefined; allowNone?: boolean; onChange: (v: VisualConfig | undefined) => void }> = ({
  value,
  allowNone,
  onChange,
}) => {
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);

  React.useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  const options = buildAssetOptions(customAssets);

  return (
    <select
      style={inputStyle}
      value={assetKeyOf(value, customAssets)}
      onChange={(e) => onChange(e.target.value ? options.find((a) => a.key === e.target.value)?.toVisual() : undefined)}
    >
      {allowNone ? <option value="">None</option> : null}
      {customAssets.length > 0 ? (
        <optgroup label="Your Imports">
          {options
            .filter((a) => a.key.startsWith("custom:"))
            .map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
        </optgroup>
      ) : null}
      <optgroup label="Props">
        {options
          .filter((a) => a.key.startsWith("prop:"))
          .map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
      </optgroup>
      <optgroup label="Tool Logos">
        {options
          .filter((a) => a.key.startsWith("tool:"))
          .map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
      </optgroup>
    </select>
  );
};

function summarizeVisual(visual: VisualConfig): string {
  switch (visual.type) {
    case "flow":
      return `flow: ${visual.nodes.map((n) => n.label ?? "node").join(" → ")}`;
    case "node-group":
      return `node-group (${visual.layout}): ${visual.nodes.length} nodes`;
    case "stack":
      return `stack: ${visual.items.length} items`;
    case "transform":
      return `transform: ${visual.from.type} → ${visual.to.type}`;
    case "browser":
      return `browser: ${visual.content.type}`;
    case "phone":
      return `phone: ${visual.content.type}`;
    default:
      return visual.type;
  }
}

const VisualFieldsEditor: React.FC<{ visual: VisualConfig; onChange: (v: VisualConfig) => void }> = ({
  visual,
  onChange,
}) => {
  if (visual.type === "stat-counter") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            style={inputStyle}
            value={visual.from}
            onChange={(e) => onChange({ ...visual, from: Number(e.target.value) })}
            placeholder="From"
          />
          <input
            type="number"
            style={inputStyle}
            value={visual.to}
            onChange={(e) => onChange({ ...visual, to: Number(e.target.value) })}
            placeholder="To"
          />
        </div>
        <input
          style={inputStyle}
          value={visual.label ?? ""}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Label"
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={inputStyle}
            value={visual.prefix ?? ""}
            onChange={(e) => onChange({ ...visual, prefix: e.target.value })}
            placeholder="Prefix"
          />
          <input
            style={inputStyle}
            value={visual.suffix ?? ""}
            onChange={(e) => onChange({ ...visual, suffix: e.target.value })}
            placeholder="Suffix"
          />
        </div>
      </div>
    );
  }

  if (visual.type === "checklist") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <select
            style={rowSelectStyle}
            value={visual.font ?? "clash"}
            onChange={(e) => onChange({ ...visual, font: e.target.value as typeof visual.font })}
          >
            {richTextFontSchema.options.map((f) => (
              <option key={f} value={f}>
                {f} font
              </option>
            ))}
          </select>
          <select
            style={rowSelectStyle}
            value={visual.size ?? "bodyLarge"}
            onChange={(e) => onChange({ ...visual, size: e.target.value as typeof visual.size })}
          >
            {richTextSizeSchema.options.map((s) => (
              <option key={s} value={s}>
                {s} size
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 10, color: editorColors.textDim }}>
          Item pacing — {visual.stagger ?? 6} frames between items
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={visual.stagger ?? 6}
            onChange={(e) => onChange({ ...visual, stagger: Number(e.target.value) })}
          />
          <input
            type="number"
            style={inputStyle}
            value={visual.stagger ?? 6}
            onChange={(e) => onChange({ ...visual, stagger: Number(e.target.value) })}
          />
        </div>

        {visual.items.map((item, index) => (
          <div key={index} style={{ display: "flex", gap: 6 }}>
            <input
              style={inputStyle}
              value={item.label}
              onChange={(e) => {
                const items = [...visual.items];
                items[index] = { ...items[index], label: e.target.value };
                onChange({ ...visual, items });
              }}
            />
            <button
              style={smallButtonStyle}
              onClick={() => onChange({ ...visual, items: visual.items.filter((_, i) => i !== index) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          style={smallButtonStyle}
          onClick={() => onChange({ ...visual, items: [...visual.items, { label: "New item" }] })}
        >
          + Add item
        </button>
      </div>
    );
  }

  if (visual.type === "pricing-card") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          style={inputStyle}
          value={visual.title}
          onChange={(e) => onChange({ ...visual, title: e.target.value })}
          placeholder="Title"
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={inputStyle}
            value={visual.price}
            onChange={(e) => onChange({ ...visual, price: e.target.value })}
            placeholder="Price"
          />
          <input
            style={inputStyle}
            value={visual.period ?? ""}
            onChange={(e) => onChange({ ...visual, period: e.target.value })}
            placeholder="Period"
          />
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit" }}
          value={(visual.features ?? []).join("\n")}
          onChange={(e) => onChange({ ...visual, features: e.target.value.split("\n").filter(Boolean) })}
          placeholder="One feature per line"
        />
        <label style={{ fontSize: 11, color: editorColors.textDim, display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={visual.highlight ?? false}
            onChange={(e) => onChange({ ...visual, highlight: e.target.checked })}
          />
          Highlighted
        </label>
      </div>
    );
  }

  if (visual.type === "app-mockup") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          style={inputStyle}
          value={visual.appTitle}
          onChange={(e) => onChange({ ...visual, appTitle: e.target.value })}
          placeholder="App title"
        />
        <select
          style={inputStyle}
          value={visual.kind}
          onChange={(e) => onChange({ ...visual, kind: e.target.value as typeof visual.kind })}
        >
          <option value="list">list</option>
          <option value="stat">stat</option>
          <option value="chart">chart</option>
        </select>
        {visual.kind === "list" ? (
          <textarea
            style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit" }}
            value={(visual.items ?? []).join("\n")}
            onChange={(e) => onChange({ ...visual, items: e.target.value.split("\n").filter(Boolean) })}
            placeholder="One row per line"
          />
        ) : null}
        {visual.kind === "stat" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inputStyle}
              value={visual.stat?.value ?? ""}
              onChange={(e) => onChange({ ...visual, stat: { value: e.target.value, label: visual.stat?.label ?? "" } })}
              placeholder="Value"
            />
            <input
              style={inputStyle}
              value={visual.stat?.label ?? ""}
              onChange={(e) => onChange({ ...visual, stat: { value: visual.stat?.value ?? "", label: e.target.value } })}
              placeholder="Label"
            />
          </div>
        ) : null}
        {visual.kind === "chart" ? (
          <input
            style={inputStyle}
            value={(visual.chartValues ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                ...visual,
                chartValues: e.target.value
                  .split(",")
                  .map((v) => Number(v.trim()))
                  .filter((v) => !Number.isNaN(v)),
              })
            }
            placeholder="Comma-separated values"
          />
        ) : null}
      </div>
    );
  }

  if (visual.type === "progress") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            style={inputStyle}
            value={visual.value}
            onChange={(e) => onChange({ ...visual, value: Number(e.target.value) })}
            placeholder="Value"
          />
          <input
            type="number"
            style={inputStyle}
            value={visual.max}
            onChange={(e) => onChange({ ...visual, max: Number(e.target.value) })}
            placeholder="Max"
          />
        </div>
        <input
          style={inputStyle}
          value={visual.label ?? ""}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Label"
        />
      </div>
    );
  }

  if (visual.type === "node-group") {
    const radius = visual.radius ?? 300;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select
          style={inputStyle}
          value={visual.layout}
          onChange={(e) => onChange({ ...visual, layout: e.target.value as typeof visual.layout })}
        >
          <option value="orbit">orbit</option>
          <option value="radial">radial</option>
          <option value="one-to-many">one-to-many</option>
        </select>

        <div style={{ fontSize: 10, color: editorColors.textDim }}>Size — radius {radius.toFixed(0)}px</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
          <input
            type="range"
            min={150}
            max={700}
            step={10}
            value={radius}
            onChange={(e) => onChange({ ...visual, radius: Number(e.target.value) })}
          />
          <input
            type="number"
            style={inputStyle}
            value={radius}
            onChange={(e) => onChange({ ...visual, radius: Number(e.target.value) })}
          />
        </div>

        {visual.layout === "orbit" ? (
          <>
            <div style={{ fontSize: 10, color: editorColors.textDim }}>
              Speed — {(visual.speed ?? 0.26).toFixed(2)}°/frame
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
              <input
                type="range"
                min={-2}
                max={2}
                step={0.02}
                value={visual.speed ?? 0.26}
                onChange={(e) => onChange({ ...visual, speed: Number(e.target.value) })}
              />
              <input
                type="number"
                step={0.02}
                style={inputStyle}
                value={visual.speed ?? 0.26}
                onChange={(e) => onChange({ ...visual, speed: Number(e.target.value) })}
              />
            </div>
          </>
        ) : null}

        <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>Center</div>
        <AssetSelect
          value={visual.center}
          allowNone={visual.layout === "orbit"}
          onChange={(center) => onChange({ ...visual, center })}
        />

        <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>
          Orbiting assets ({visual.nodes.length}/6)
        </div>
        {visual.nodes.map((node, index) => (
          <div key={index} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <AssetSelect value={node} onChange={(v) => {
                if (!v) return;
                const nodes = [...visual.nodes];
                nodes[index] = v;
                onChange({ ...visual, nodes });
              }} />
            </div>
            <button
              style={smallButtonStyle}
              disabled={visual.nodes.length <= 1}
              onClick={() => onChange({ ...visual, nodes: visual.nodes.filter((_, i) => i !== index) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          style={smallButtonStyle}
          disabled={visual.nodes.length >= 6}
          onClick={() =>
            onChange({
              ...visual,
              nodes: [...visual.nodes, assetOptions[0].toVisual()],
            })
          }
        >
          + Add asset
        </button>
      </div>
    );
  }

  if (visual.type === "corner-props") {
    const size = visual.size ?? 480;
    const speed = visual.speed ?? 1;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, color: editorColors.textDim }}>Side</div>
        <select
          style={inputStyle}
          value={visual.diagonal ?? "tlbr"}
          onChange={(e) => onChange({ ...visual, diagonal: e.target.value as typeof visual.diagonal })}
        >
          <option value="tlbr">Top-left ↔ Bottom-right</option>
          <option value="trbl">Top-right ↔ Bottom-left</option>
        </select>

        <div style={{ fontSize: 10, color: editorColors.textDim }}>Size — {size.toFixed(0)}px</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
          <input
            type="range"
            min={200}
            max={900}
            step={10}
            value={size}
            onChange={(e) => onChange({ ...visual, size: Number(e.target.value) })}
          />
          <input
            type="number"
            style={inputStyle}
            value={size}
            onChange={(e) => onChange({ ...visual, size: Number(e.target.value) })}
          />
        </div>

        <div style={{ fontSize: 10, color: editorColors.textDim }}>Speed — {speed.toFixed(2)}x</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
          <input
            type="range"
            min={0}
            max={3}
            step={0.05}
            value={speed}
            onChange={(e) => onChange({ ...visual, speed: Number(e.target.value) })}
          />
          <input
            type="number"
            step={0.05}
            style={inputStyle}
            value={speed}
            onChange={(e) => onChange({ ...visual, speed: Number(e.target.value) })}
          />
        </div>

        <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>
          Corner assets ({visual.assets.length}/2)
        </div>
        {visual.assets.map((asset, index) => (
          <div key={index} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <AssetSelect
                value={asset}
                onChange={(v) => {
                  if (!v) return;
                  const assets = [...visual.assets];
                  assets[index] = v;
                  onChange({ ...visual, assets });
                }}
              />
            </div>
            <button
              style={smallButtonStyle}
              disabled={visual.assets.length <= 1}
              onClick={() => onChange({ ...visual, assets: visual.assets.filter((_, i) => i !== index) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          style={smallButtonStyle}
          disabled={visual.assets.length >= 2}
          onClick={() => onChange({ ...visual, assets: [...visual.assets, assetOptions[0].toVisual()] })}
        >
          + Add asset
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12, color: editorColors.textDim }}>
      {summarizeVisual(visual)}
      <div style={{ marginTop: 4, fontStyle: "italic" }}>
        Nested-node editing isn't available in the Inspector yet — use the Visuals tab presets or edit the project
        JSON directly.
      </div>
    </div>
  );
};

const rowSelectStyle: React.CSSProperties = { ...inputStyle, fontSize: 11, padding: "6px 8px" };

const RichHeadlineEditor: React.FC<{
  lines: RichHeadlineLine[];
  onChange: (lines: RichHeadlineLine[]) => void;
}> = ({ lines, onChange }) => {
  function updateLine(index: number, patch: Partial<RichHeadlineLine>) {
    const next = [...lines];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lines.map((line, index) => (
        <div key={index} style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, padding: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              style={inputStyle}
              value={line.text}
              onChange={(e) => updateLine(index, { text: e.target.value })}
              placeholder="Line text"
            />
            <button style={smallButtonStyle} onClick={() => onChange(lines.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <select
              style={rowSelectStyle}
              value={line.size}
              onChange={(e) => updateLine(index, { size: e.target.value as RichHeadlineLine["size"] })}
            >
              {richTextSizeSchema.options.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              style={rowSelectStyle}
              value={line.font ?? ""}
              onChange={(e) =>
                updateLine(index, { font: (e.target.value || undefined) as RichHeadlineLine["font"] })
              }
            >
              <option value="">auto font</option>
              {richTextFontSchema.options.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <select
              style={rowSelectStyle}
              value={line.animation ?? ""}
              onChange={(e) =>
                updateLine(index, {
                  animation: (e.target.value || undefined) as RichHeadlineLine["animation"],
                })
              }
            >
              <option value="">default anim (pop)</option>
              {entrancePresetSchema.options.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              style={rowSelectStyle}
              value={line.splitBy ?? "word"}
              onChange={(e) => updateLine(index, { splitBy: e.target.value as RichHeadlineLine["splitBy"] })}
            >
              {richTextSplitBySchema.options.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <label style={{ fontSize: 11, color: editorColors.textDim, display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={line.pill ?? false}
              onChange={(e) => updateLine(index, { pill: e.target.checked })}
            />
            Pill box highlight
          </label>
        </div>
      ))}
      <button
        style={smallButtonStyle}
        onClick={() => onChange([...lines, { text: "New line", size: "title", splitBy: "word" }])}
      >
        + Add line
      </button>
    </div>
  );
};

function makeBlockId(): string {
  return `block-${Math.random().toString(36).slice(2, 9)}`;
}

const colorSwatches = [
  { label: "White", value: "#FFFFFF" },
  { label: "Secondary", value: "#B8B8B8" },
  { label: "Accent", value: "#FF7024" },
  { label: "Background", value: "#171717" },
];

function isValidHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

const BlocksEditor: React.FC<{ blocks: Block[]; onChange: (blocks: Block[]) => void }> = ({ blocks, onChange }) => {
  function updateBlock(index: number, patch: Partial<Block>) {
    const next = [...blocks];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((block, index) => (
        <div key={block.id} style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, padding: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              style={inputStyle}
              value={block.text}
              onChange={(e) => updateBlock(index, { text: e.target.value })}
              placeholder="Block text"
            />
            <button
              style={smallButtonStyle}
              disabled={index === 0}
              onClick={() => moveBlock(index, "up")}
              title="Move up"
            >
              ↑
            </button>
            <button
              style={smallButtonStyle}
              disabled={index === blocks.length - 1}
              onClick={() => moveBlock(index, "down")}
              title="Move down"
            >
              ↓
            </button>
            <button style={smallButtonStyle} onClick={() => onChange(blocks.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <select
              style={rowSelectStyle}
              value={block.type}
              onChange={(e) => updateBlock(index, { type: e.target.value as Block["type"] })}
            >
              <option value="text">text</option>
              <option value="badge">badge</option>
            </select>
            <select
              style={rowSelectStyle}
              value={block.font ?? "tanker"}
              onChange={(e) => updateBlock(index, { font: e.target.value as Block["font"] })}
            >
              {richTextFontSchema.options.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 2 }}>
            Position — x {block.x.toFixed(0)}%, y {block.y.toFixed(0)}%
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <input
              type="range"
              min={0}
              max={100}
              value={block.x}
              onChange={(e) => updateBlock(index, { x: Number(e.target.value) })}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={block.y}
              onChange={(e) => updateBlock(index, { y: Number(e.target.value) })}
            />
          </div>

          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 2 }}>
            Size — {block.size ?? 52}px
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <input
              type="range"
              min={16}
              max={220}
              step={1}
              value={block.size ?? 52}
              onChange={(e) => updateBlock(index, { size: Number(e.target.value) })}
            />
            <input
              type="number"
              style={inputStyle}
              value={block.size ?? 52}
              onChange={(e) => updateBlock(index, { size: Number(e.target.value) })}
            />
          </div>

          <input
            type="number"
            style={{ ...inputStyle, marginBottom: 6 }}
            value={block.letterSpacing ?? 0}
            onChange={(e) => updateBlock(index, { letterSpacing: Number(e.target.value) })}
            placeholder="Letter spacing (px)"
          />

          <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <input
              type="color"
              value={isValidHex(block.color ?? "") ? (block.color as string) : "#ffffff"}
              onChange={(e) => updateBlock(index, { color: e.target.value })}
              style={{ width: 32, height: 28, padding: 0, border: `1px solid ${editorColors.border}`, borderRadius: 6, flexShrink: 0 }}
            />
            <input
              style={inputStyle}
              value={block.color ?? "#FFFFFF"}
              onChange={(e) => updateBlock(index, { color: e.target.value })}
              placeholder="#RRGGBB"
            />
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.value}
                title={swatch.label}
                onClick={() => updateBlock(index, { color: swatch.value })}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `1px solid ${editorColors.border}`,
                  background: swatch.value,
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>

          <input
            type="number"
            style={{ ...inputStyle, marginBottom: 6 }}
            min={0}
            value={block.delay ?? 0}
            onChange={(e) => updateBlock(index, { delay: Number(e.target.value) })}
            placeholder="Start delay (frames)"
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <select
              style={rowSelectStyle}
              value={block.animation ?? ""}
              onChange={(e) => updateBlock(index, { animation: (e.target.value || undefined) as Block["animation"] })}
            >
              <option value="">default anim (pop)</option>
              {entrancePresetSchema.options.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              style={rowSelectStyle}
              value={block.splitBy ?? "word"}
              onChange={(e) => updateBlock(index, { splitBy: e.target.value as Block["splitBy"] })}
            >
              {richTextSplitBySchema.options.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button
        style={smallButtonStyle}
        onClick={() =>
          onChange([
            ...blocks,
            { id: makeBlockId(), type: "text", text: "New block", x: 50, y: 50, splitBy: "word" },
          ])
        }
      >
        + Add block
      </button>
    </div>
  );
};

function makeVisualEntryId(): string {
  return `pvis-${Math.random().toString(36).slice(2, 9)}`;
}

const PositionedVisualsEditor: React.FC<{
  visuals: PositionedVisualEntry[];
  onChange: (visuals: PositionedVisualEntry[]) => void;
}> = ({ visuals, onChange }) => {
  function updateEntry(index: number, patch: Partial<PositionedVisualEntry>) {
    const next = [...visuals];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function moveEntry(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visuals.length) return;
    const next = [...visuals];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visuals.map((entry, index) => (
        <div key={entry.id} style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, padding: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <AssetSelect
                value={entry.visual}
                onChange={(v) => v && updateEntry(index, { visual: v })}
              />
            </div>
            <button style={smallButtonStyle} disabled={index === 0} onClick={() => moveEntry(index, "up")} title="Move up">
              ↑
            </button>
            <button
              style={smallButtonStyle}
              disabled={index === visuals.length - 1}
              onClick={() => moveEntry(index, "down")}
              title="Move down"
            >
              ↓
            </button>
            <button style={smallButtonStyle} onClick={() => onChange(visuals.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>

          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 2 }}>
            Position — x {entry.x.toFixed(0)}%, y {entry.y.toFixed(0)}% — or drag on the Player preview
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <input
              type="range"
              min={0}
              max={100}
              value={entry.x}
              onChange={(e) => updateEntry(index, { x: Number(e.target.value) })}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={entry.y}
              onChange={(e) => updateEntry(index, { y: Number(e.target.value) })}
            />
          </div>

          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 2 }}>
            Scale — {(entry.scale ?? 1).toFixed(2)}x
          </div>
          <input
            type="range"
            min={0.2}
            max={2.5}
            step={0.05}
            style={{ marginBottom: 6, width: "100%" }}
            value={entry.scale ?? 1}
            onChange={(e) => updateEntry(index, { scale: Number(e.target.value) })}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <select
              style={rowSelectStyle}
              value={entry.entrance ?? ""}
              onChange={(e) =>
                updateEntry(index, { entrance: (e.target.value || undefined) as PositionedVisualEntry["entrance"] })
              }
            >
              <option value="">default anim (pop)</option>
              {entrancePresetSchema.options.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              style={rowSelectStyle}
              value={entry.exit ?? ""}
              onChange={(e) =>
                updateEntry(index, { exit: (e.target.value || undefined) as PositionedVisualEntry["exit"] })
              }
            >
              <option value="">no exit (stays)</option>
              {exitPresetSchema.options.map((e_) => (
                <option key={e_} value={e_}>
                  {e_}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            min={0}
            style={inputStyle}
            value={entry.delay ?? 0}
            onChange={(e) => updateEntry(index, { delay: Number(e.target.value) })}
            placeholder="Start delay (frames)"
          />
        </div>
      ))}
      <button
        style={smallButtonStyle}
        onClick={() =>
          onChange([
            ...visuals,
            {
              id: makeVisualEntryId(),
              visual: { type: "prop", asset: "idea" },
              x: 50,
              y: 50,
            },
          ])
        }
      >
        + Add visual
      </button>
    </div>
  );
};

export const InspectorPanel: React.FC = () => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const scene = useProjectStore((s) => s.project.scenes.find((sc) => sc.id === s.selectedSceneId));
  const updateSceneContent = useProjectStore((s) => s.updateSceneContent);
  const updateScene = useProjectStore((s) => s.updateScene);
  const updateSceneBackground = useProjectStore((s) => s.updateSceneBackground);
  const updateSceneEntrance = useProjectStore((s) => s.updateSceneEntrance);
  const updateSceneExit = useProjectStore((s) => s.updateSceneExit);
  const updateSceneExitDuration = useProjectStore((s) => s.updateSceneExitDuration);
  const updateSceneTransition = useProjectStore((s) => s.updateSceneTransition);
  const updateSceneStagger = useProjectStore((s) => s.updateSceneStagger);
  const updateSceneVisual = useProjectStore((s) => s.updateSceneVisual);
  const updateSceneVisualPosition = useProjectStore((s) => s.updateSceneVisualPosition);
  const updateSceneVisualEntrance = useProjectStore((s) => s.updateSceneVisualEntrance);
  const updateSceneVisualExit = useProjectStore((s) => s.updateSceneVisualExit);
  const updateSceneVisualExitDuration = useProjectStore((s) => s.updateSceneVisualExitDuration);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const updateSceneBadge = useProjectStore((s) => s.updateSceneBadge);
  const updateSceneHighlights = useProjectStore((s) => s.updateSceneHighlights);
  const updateSceneRichHeadline = useProjectStore((s) => s.updateSceneRichHeadline);
  const updateSceneLeftRight = useProjectStore((s) => s.updateSceneLeftRight);
  const updateSceneItems = useProjectStore((s) => s.updateSceneItems);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
  const removeScene = useProjectStore((s) => s.removeScene);
  const setActiveVisualSlot = useProjectStore((s) => s.setActiveVisualSlot);

  if (!scene || !selectedSceneId) {
    return (
      <div
        style={{
          width: 300,
          borderLeft: `1px solid ${editorColors.border}`,
          background: editorColors.panel,
          padding: 16,
          color: editorColors.textDim,
          fontSize: 13,
        }}
      >
        Select a scene to edit its properties.
      </div>
    );
  }

  const def = getSceneDefinition(scene.type);
  const isComparison = scene.type === "comparison";
  const isSteps = scene.type === "steps";

  function updateItem(index: number, patch: Partial<StepItem>) {
    const items = [...(scene!.content.items ?? [])];
    items[index] = { ...items[index], ...patch };
    updateSceneItems(selectedSceneId!, items);
  }

  return (
    <div
      style={{
        width: 300,
        borderLeft: `1px solid ${editorColors.border}`,
        background: editorColors.panel,
        padding: 16,
        overflowY: "auto",
        color: editorColors.text,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700 }}>{def.name}</div>
      <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 2 }}>{def.description}</div>

      <Section title="Content" defaultOpen>
        <div style={labelStyle}>Badge</div>
        <input
          style={inputStyle}
          value={scene.content.badge ?? ""}
          onChange={(e) => updateSceneBadge(selectedSceneId, e.target.value)}
          placeholder="Optional small label above the headline"
        />

        {!isComparison ? (
          <>
            <div style={labelStyle}>Eyebrow</div>
            <input
              style={inputStyle}
              value={scene.content.eyebrow ?? ""}
              onChange={(e) => updateSceneContent(selectedSceneId, { eyebrow: e.target.value })}
            />
          </>
        ) : null}

        {!isSteps ? (
          <>
            <div style={labelStyle}>Headline</div>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
              value={scene.content.headline ?? ""}
              onChange={(e) => updateSceneContent(selectedSceneId, { headline: e.target.value })}
            />

            <div style={labelStyle}>Highlighted words</div>
            <input
              style={inputStyle}
              value={(scene.content.highlights ?? []).join(", ")}
              onChange={(e) =>
                updateSceneHighlights(
                  selectedSceneId,
                  e.target.value
                    .split(",")
                    .map((w) => w.trim())
                    .filter(Boolean)
                )
              }
              placeholder="Comma-separated words to pill-highlight"
            />

            <Section
              title="Rich Headline"
              subtitle='Stacked, independently-sized/animated lines — overrides Headline above. Only used by Hook Centered, Hook With Visual and Takeaway.'
            >
              <RichHeadlineEditor
                lines={scene.content.richHeadline ?? []}
                onChange={(lines) => updateSceneRichHeadline(selectedSceneId, lines)}
              />
            </Section>
          </>
        ) : null}

        {!isComparison && !isSteps ? (
          <>
            <div style={labelStyle}>Supporting Text</div>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
              value={scene.content.body ?? ""}
              onChange={(e) => updateSceneContent(selectedSceneId, { body: e.target.value })}
            />
          </>
        ) : null}

        {isComparison ? (
          <>
            {(["left", "right"] as const).map((side) => (
              <div key={side}>
                <div style={labelStyle}>{side === "left" ? "Left column" : "Right column"}</div>
                <input
                  style={{ ...inputStyle, marginBottom: 6 }}
                  value={scene.content[side]?.label ?? ""}
                  onChange={(e) => updateSceneLeftRight(selectedSceneId, side, { label: e.target.value })}
                  placeholder="Label"
                />
                <input
                  style={{ ...inputStyle, marginBottom: 6 }}
                  value={scene.content[side]?.headline ?? ""}
                  onChange={(e) => updateSceneLeftRight(selectedSceneId, side, { headline: e.target.value })}
                  placeholder="Headline"
                />
                <textarea
                  style={{ ...inputStyle, minHeight: 44, fontFamily: "inherit" }}
                  value={scene.content[side]?.body ?? ""}
                  onChange={(e) => updateSceneLeftRight(selectedSceneId, side, { body: e.target.value })}
                  placeholder="Body"
                />
                <button style={{ ...smallButtonStyle, marginTop: 6 }} onClick={() => setActiveVisualSlot(side)}>
                  Assign visual from Visuals tab →
                </button>
              </div>
            ))}
          </>
        ) : null}

        {isSteps ? (
          <>
            <div style={labelStyle}>Items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(scene.content.items ?? []).map((item, index) => (
                <div key={index} style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, padding: 8 }}>
                  <input
                    style={{ ...inputStyle, marginBottom: 6 }}
                    value={item.label}
                    onChange={(e) => updateItem(index, { label: e.target.value })}
                    placeholder="Label"
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      style={inputStyle}
                      value={item.value ?? ""}
                      onChange={(e) => updateItem(index, { value: e.target.value })}
                      placeholder="Optional value"
                    />
                    <button
                      style={smallButtonStyle}
                      onClick={() =>
                        updateSceneItems(
                          selectedSceneId,
                          (scene.content.items ?? []).filter((_, i) => i !== index)
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                style={smallButtonStyle}
                onClick={() =>
                  updateSceneItems(selectedSceneId, [...(scene.content.items ?? []), { label: "New step" }])
                }
              >
                + Add item
              </button>
            </div>
          </>
        ) : null}
      </Section>

      <Section title="Background" defaultOpen>
        <select
          style={inputStyle}
          value={scene.background}
          onChange={(e) => updateSceneBackground(selectedSceneId, backgroundIdSchema.parse(e.target.value))}
        >
          {backgroundRegistry.map((bg) => (
            <option key={bg.id} value={bg.id}>
              {bg.name}
            </option>
          ))}
        </select>
      </Section>

      {!isComparison ? (
        <Section title="Visual" subtitle="This scene's main image/graphic">
          {scene.visual ? (
            <>
              {COMPOUND_VISUAL_TYPES.has(scene.visual.type) ? (
                <div style={{ fontSize: 12, color: editorColors.textDim, marginBottom: 8 }}>
                  {summarizeVisual(scene.visual)}
                </div>
              ) : (
                <VisualFieldsEditor
                  visual={scene.visual}
                  onChange={(v) => {
                    setActiveVisualSlot("main");
                    updateSceneVisual(selectedSceneId, v);
                  }}
                />
              )}
              <button
                style={{ ...inputStyle, marginTop: 8, cursor: "pointer" }}
                onClick={() => {
                  setActiveVisualSlot("main");
                  updateSceneVisual(selectedSceneId, undefined);
                }}
              >
                Remove visual
              </button>

              <div style={labelStyle}>Position</div>
              <label
                style={{ fontSize: 11, color: editorColors.textDim, display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}
              >
                <input
                  type="checkbox"
                  checked={!!scene.visualPosition}
                  onChange={(e) =>
                    updateSceneVisualPosition(selectedSceneId, e.target.checked ? { x: 50, y: 65 } : undefined)
                  }
                />
                Custom position (default: centered in normal layout)
              </label>
              {scene.visualPosition ? (
                <>
                  <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 2 }}>
                    x {scene.visualPosition.x.toFixed(0)}%, y {scene.visualPosition.y.toFixed(0)}% — or drag the
                    marker directly on the Player preview
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={scene.visualPosition.x}
                      onChange={(e) =>
                        updateSceneVisualPosition(selectedSceneId, {
                          x: Number(e.target.value),
                          y: scene.visualPosition!.y,
                        })
                      }
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={scene.visualPosition.y}
                      onChange={(e) =>
                        updateSceneVisualPosition(selectedSceneId, {
                          x: scene.visualPosition!.x,
                          y: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </>
              ) : null}

              <div style={labelStyle}>Entrance / Exit</div>
              <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
                Independent from the scene's own Entrance/Exit — this visual can come in and leave on its own
                schedule.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                <select
                  style={rowSelectStyle}
                  value={scene.visualEntrance ?? ""}
                  onChange={(e) =>
                    updateSceneVisualEntrance(
                      selectedSceneId,
                      (e.target.value || undefined) as (typeof entrancePresetSchema)["options"][number] | undefined
                    )
                  }
                >
                  <option value="">follow scene entrance</option>
                  {entrancePresetSchema.options.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
                <select
                  style={rowSelectStyle}
                  value={scene.visualExit ?? ""}
                  onChange={(e) =>
                    updateSceneVisualExit(
                      selectedSceneId,
                      (e.target.value || undefined) as (typeof exitPresetSchema)["options"][number] | undefined
                    )
                  }
                >
                  <option value="">no exit (stays)</option>
                  {exitPresetSchema.options.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </div>
              {scene.visualExit ? (
                <input
                  type="number"
                  min={1}
                  max={60}
                  style={inputStyle}
                  value={scene.visualExitDuration ?? 18}
                  onChange={(e) => updateSceneVisualExitDuration(selectedSceneId, Number(e.target.value))}
                  placeholder="Exit duration (frames)"
                />
              ) : null}
            </>
          ) : (
            <div style={{ fontSize: 12, color: editorColors.textDim }}>None — pick one from the Visuals tab</div>
          )}
        </Section>
      ) : null}

      <Section title="Blocks" subtitle="Freeform positioned text/badge — available on every template">
        <BlocksEditor
          blocks={scene.content.blocks ?? []}
          onChange={(blocks) => updateSceneBlocks(selectedSceneId, blocks)}
        />
      </Section>

      <Section title="Positioned Visuals" subtitle="Freeform images/icons — available on every template">
        <PositionedVisualsEditor
          visuals={scene.content.visuals ?? []}
          onChange={(visuals) => updateSceneVisuals(selectedSceneId, visuals)}
        />
      </Section>

      <Section title="Timing & Motion" defaultOpen>
        <div style={labelStyle}>Duration (seconds)</div>
        <input
          type="number"
          step={0.1}
          min={0.5}
          style={inputStyle}
          value={scene.durationSeconds}
          onChange={(e) => updateScene(selectedSceneId, { durationSeconds: Number(e.target.value) })}
        />

        <div style={labelStyle}>Entrance</div>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          How badge/eyebrow/headline/visual/body come in, one after another. Rich Headline lines and Blocks use their
          own animation setting instead.
        </div>
        <select
          style={inputStyle}
          value={scene.motion?.entrance ?? "fade"}
          onChange={(e) => updateSceneEntrance(selectedSceneId, entrancePresetSchema.parse(e.target.value))}
        >
          {entrancePresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>

        <div style={labelStyle}>Exit</div>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          How the whole scene (all text + visual together) leaves, in the last moments before it ends. Leave as
          "none" for a hard cut.
        </div>
        <select
          style={{ ...inputStyle, marginBottom: 6 }}
          value={scene.motion?.exit ?? ""}
          onChange={(e) =>
            updateSceneExit(
              selectedSceneId,
              (e.target.value || undefined) as (typeof exitPresetSchema)["options"][number] | undefined
            )
          }
        >
          <option value="">none (hard cut)</option>
          {exitPresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
        {scene.motion?.exit ? (
          <input
            type="number"
            min={1}
            max={60}
            style={inputStyle}
            value={scene.motion?.exitDuration ?? 18}
            onChange={(e) => updateSceneExitDuration(selectedSceneId, Number(e.target.value))}
            placeholder="Exit duration (frames)"
          />
        ) : null}

        <div style={labelStyle}>Stagger (frames between elements)</div>
        <input
          type="number"
          min={0}
          style={inputStyle}
          value={scene.motion?.stagger ?? 6}
          onChange={(e) => updateSceneStagger(selectedSceneId, Number(e.target.value))}
        />

        <div style={labelStyle}>Transition</div>
        <select
          style={inputStyle}
          value={scene.motion?.transition ?? "cut"}
          onChange={(e) => updateSceneTransition(selectedSceneId, transitionPresetSchema.parse(e.target.value))}
        >
          {transitionPresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
      </Section>

      <button
        style={{
          ...inputStyle,
          marginTop: 24,
          cursor: "pointer",
          borderColor: "#5a2a1a",
          color: "#ff8a65",
        }}
        onClick={() => removeScene(selectedSceneId)}
      >
        Delete Scene
      </button>
    </div>
  );
};
