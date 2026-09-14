import { Button, NativeSelect, Slider, TextInput } from "@mantine/core";
import { type VisualConfig } from "../../schema/visual";
import { AssetSelect, assetOptions } from "./AssetSelect";
type Props = { visual: VisualConfig; onChange: (visual: VisualConfig) => void };
export function DiagramFields({ visual, onChange }: Props) {
  if (visual.type === "node-group") {
    const radius = visual.radius ?? 300;
    return (
      <div className="flex flex-col gap-2">
        <NativeSelect
          className="w-full"
          value={visual.layout}
          onChange={(e) =>
            onChange({
              ...visual,
              layout: e.target.value as typeof visual.layout,
            })
          }
        >
          <option value="orbit">orbit</option>
          <option value="radial">radial</option>
          <option value="one-to-many">one-to-many</option>
        </NativeSelect>

        <div className="text-[10px] text-editor-muted">
          Size — radius {radius.toFixed(0)}px
        </div>
        <div className="grid [grid-template-columns:2fr_1fr] gap-1.5 items-center">
          <Slider
            min={150}
            max={700}
            step={10}
            value={radius}
            onChange={(value) => onChange({ ...visual, radius: Number(value) })}
          />
          <TextInput
            type="number"
            className="w-full"
            value={radius}
            onChange={(e) =>
              onChange({ ...visual, radius: Number(e.target.value) })
            }
          />
        </div>

        {visual.layout === "orbit" ? (
          <>
            <div className="text-[10px] text-editor-muted">
              Speed — {(visual.speed ?? 0.26).toFixed(2)}°/frame
            </div>
            <div className="grid [grid-template-columns:2fr_1fr] gap-1.5 items-center">
              <Slider
                min={-2}
                max={2}
                step={0.02}
                value={visual.speed ?? 0.26}
                onChange={(value) =>
                  onChange({ ...visual, speed: Number(value) })
                }
              />
              <TextInput
                type="number"
                step={0.02}
                className="w-full"
                value={visual.speed ?? 0.26}
                onChange={(e) =>
                  onChange({ ...visual, speed: Number(e.target.value) })
                }
              />
            </div>
          </>
        ) : null}

        <div className="text-[10px] text-editor-muted mt-1">Center</div>
        <AssetSelect
          value={visual.center}
          allowNone={visual.layout === "orbit"}
          onChange={(center) => onChange({ ...visual, center })}
        />

        <div className="text-[10px] text-editor-muted mt-1">
          Orbiting assets ({visual.nodes.length}/6)
        </div>
        {visual.nodes.map((node, index) => (
          <div key={index} className="flex gap-1.5 items-center">
            <div className="flex-1">
              <AssetSelect
                value={node}
                onChange={(v) => {
                  if (!v) return;
                  const nodes = [...visual.nodes];
                  nodes[index] = v;
                  onChange({ ...visual, nodes });
                }}
              />
            </div>
            <Button
              variant="default"
              disabled={visual.nodes.length <= 1}
              onClick={() =>
                onChange({
                  ...visual,
                  nodes: visual.nodes.filter((_, i) => i !== index),
                })
              }
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="default"
          disabled={visual.nodes.length >= 6}
          onClick={() =>
            onChange({
              ...visual,
              nodes: [...visual.nodes, assetOptions[0].toVisual()],
            })
          }
        >
          + Add asset
        </Button>
      </div>
    );
  }
  if (visual.type === "keycap") {
    const keys = visual.keys;
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[10px] text-editor-muted">Keys</div>
        {keys.map((key, index) => (
          <div key={index} className="flex gap-1.5">
            <TextInput
              className="w-full"
              value={key}
              onChange={(e) => {
                const next = [...keys];
                next[index] = e.target.value;
                onChange({ ...visual, keys: next });
              }}
              placeholder="ESC"
            />
            <Button
              variant="default"
              disabled={keys.length <= 1}
              onClick={() =>
                onChange({
                  ...visual,
                  keys: keys.filter((_, i) => i !== index),
                })
              }
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="default"
          disabled={keys.length >= 3}
          onClick={() => onChange({ ...visual, keys: [...keys, "R"] })}
        >
          + Add key
        </Button>
        <TextInput
          className="w-full"
          value={visual.caption ?? ""}
          onChange={(e) =>
            onChange({ ...visual, caption: e.target.value || undefined })
          }
          placeholder="Caption (optional)"
        />
      </div>
    );
  }
  return null;
}
