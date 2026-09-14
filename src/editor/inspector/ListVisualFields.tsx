import {
  Button,
  Checkbox,
  NativeSelect,
  TextInput,
  Textarea,
} from "@mantine/core";
import { richTextSizeSchema } from "../../schema/scene";
import { type VisualConfig } from "../../schema/visual";
import { SfxSelect } from "./SfxSelect";
import { SecondsSlider } from "./controls";
type Props = { visual: VisualConfig; onChange: (visual: VisualConfig) => void };
export function ListVisualFields({ visual, onChange }: Props) {
  if (visual.type === "checklist") {
    return (
      <div className="flex flex-col gap-2">
        <NativeSelect
          className="w-full"
          value={visual.size ?? "bodyLarge"}
          onChange={(e) =>
            onChange({ ...visual, size: e.target.value as typeof visual.size })
          }
        >
          {richTextSizeSchema.options.map((s) => (
            <option key={s} value={s}>
              {s} size
            </option>
          ))}
        </NativeSelect>

        <SecondsSlider
          label="Item stagger"
          frames={visual.stagger ?? 6}
          maxFrames={60}
          onChange={(stagger) => onChange({ ...visual, stagger })}
        />

        <div className="text-[10px] text-editor-muted">
          Sound per item revealing
        </div>
        <SfxSelect
          mode="auto"
          value={visual.sfx}
          onChange={(sfx) => onChange({ ...visual, sfx })}
        />

        {visual.items.map((item, index) => (
          <div key={index} className="flex gap-1.5">
            <TextInput
              className="w-full"
              value={item.label}
              onChange={(e) => {
                const items = [...visual.items];
                items[index] = { ...items[index], label: e.target.value };
                onChange({ ...visual, items });
              }}
            />
            <Button
              variant="default"
              onClick={() =>
                onChange({
                  ...visual,
                  items: visual.items.filter((_, i) => i !== index),
                })
              }
            >
              ✕
            </Button>
          </div>
        ))}
        <Button
          variant="default"
          onClick={() =>
            onChange({
              ...visual,
              items: [...visual.items, { label: "New item" }],
            })
          }
        >
          + Add item
        </Button>
      </div>
    );
  }
  if (visual.type === "pricing-card") {
    return (
      <div className="flex flex-col gap-2">
        <TextInput
          className="w-full"
          value={visual.title}
          onChange={(e) => onChange({ ...visual, title: e.target.value })}
          placeholder="Title"
        />
        <div className="flex gap-2">
          <TextInput
            className="w-full"
            value={visual.price}
            onChange={(e) => onChange({ ...visual, price: e.target.value })}
            placeholder="Price"
          />
          <TextInput
            className="w-full"
            value={visual.period ?? ""}
            onChange={(e) => onChange({ ...visual, period: e.target.value })}
            placeholder="Period"
          />
        </div>
        <Textarea
          className="w-full"
          value={(visual.features ?? []).join("\n")}
          onChange={(e) =>
            onChange({
              ...visual,
              features: e.target.value.split("\n").filter(Boolean),
            })
          }
          placeholder="One feature per line"
        />
        <label className="text-[11px] text-editor-muted flex gap-1.5 items-center">
          <Checkbox
            checked={visual.highlight ?? false}
            onChange={(e) =>
              onChange({ ...visual, highlight: e.target.checked })
            }
          />
          Highlighted
        </label>
      </div>
    );
  }
  if (visual.type === "app-mockup") {
    return (
      <div className="flex flex-col gap-2">
        <TextInput
          className="w-full"
          value={visual.appTitle}
          onChange={(e) => onChange({ ...visual, appTitle: e.target.value })}
          placeholder="App title"
        />
        <NativeSelect
          className="w-full"
          value={visual.kind}
          onChange={(e) =>
            onChange({ ...visual, kind: e.target.value as typeof visual.kind })
          }
        >
          <option value="list">list</option>
          <option value="stat">stat</option>
          <option value="chart">chart</option>
        </NativeSelect>
        {visual.kind === "list" ? (
          <Textarea
            className="w-full"
            value={(visual.items ?? []).join("\n")}
            onChange={(e) =>
              onChange({
                ...visual,
                items: e.target.value.split("\n").filter(Boolean),
              })
            }
            placeholder="One row per line"
          />
        ) : null}
        {visual.kind === "stat" ? (
          <div className="flex gap-2">
            <TextInput
              className="w-full"
              value={visual.stat?.value ?? ""}
              onChange={(e) =>
                onChange({
                  ...visual,
                  stat: {
                    value: e.target.value,
                    label: visual.stat?.label ?? "",
                  },
                })
              }
              placeholder="Value"
            />
            <TextInput
              className="w-full"
              value={visual.stat?.label ?? ""}
              onChange={(e) =>
                onChange({
                  ...visual,
                  stat: {
                    value: visual.stat?.value ?? "",
                    label: e.target.value,
                  },
                })
              }
              placeholder="Label"
            />
          </div>
        ) : null}
        {visual.kind === "chart" ? (
          <TextInput
            className="w-full"
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
  return null;
}
