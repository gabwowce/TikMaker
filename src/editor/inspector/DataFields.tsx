import { NativeSelect, TextInput, Textarea } from "@mantine/core";
import { type VisualConfig } from "../../schema/visual";
import { SfxSelect } from "./SfxSelect";
type Props = { visual: VisualConfig; onChange: (visual: VisualConfig) => void };
export function DataFields({ visual, onChange }: Props) {
  if (visual.type === "stat-counter") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <TextInput
            type="number"
            className="w-full"
            value={visual.from}
            onChange={(e) =>
              onChange({ ...visual, from: Number(e.target.value) })
            }
            placeholder="From"
          />
          <TextInput
            type="number"
            className="w-full"
            value={visual.to}
            onChange={(e) =>
              onChange({ ...visual, to: Number(e.target.value) })
            }
            placeholder="To"
          />
        </div>
        <TextInput
          className="w-full"
          value={visual.label ?? ""}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Label"
        />
        <div className="flex gap-2">
          <TextInput
            className="w-full"
            value={visual.prefix ?? ""}
            onChange={(e) => onChange({ ...visual, prefix: e.target.value })}
            placeholder="Prefix"
          />
          <TextInput
            className="w-full"
            value={visual.suffix ?? ""}
            onChange={(e) => onChange({ ...visual, suffix: e.target.value })}
            placeholder="Suffix"
          />
        </div>
        <div className="text-[10px] text-editor-muted">
          Tick sound (as the count rises)
        </div>
        <SfxSelect
          mode="auto"
          value={visual.sfx}
          onChange={(sfx) => onChange({ ...visual, sfx })}
        />
      </div>
    );
  }
  if (visual.type === "checkpoint") {
    return (
      <div className="flex flex-col gap-2">
        <TextInput
          className="w-full"
          value={visual.label}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Checkpoint text"
        />
        <Textarea
          className="w-full"
          rows={2}
          value={visual.detail ?? ""}
          onChange={(e) =>
            onChange({ ...visual, detail: e.target.value || undefined })
          }
          placeholder="Optional detail"
        />
        <div className="grid [grid-template-columns:1fr_1fr] gap-1.5">
          <NativeSelect
            className="w-full"
            value={visual.variant ?? "card"}
            onChange={(e) =>
              onChange({
                ...visual,
                variant: e.target.value as typeof visual.variant,
              })
            }
          >
            <option value="card">Card</option>
            <option value="compact">Compact</option>
            <option value="pill">Pill</option>
            <option value="outline">Outline</option>
          </NativeSelect>
          <NativeSelect
            className="w-full"
            value={visual.state ?? "done"}
            onChange={(e) =>
              onChange({
                ...visual,
                state: e.target.value as typeof visual.state,
              })
            }
          >
            <option value="done">Done ✓</option>
            <option value="pending">Pending ○</option>
            <option value="warning">Warning !</option>
          </NativeSelect>
        </div>
      </div>
    );
  }
  if (visual.type === "progress") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <TextInput
            type="number"
            className="w-full"
            value={visual.value}
            onChange={(e) =>
              onChange({ ...visual, value: Number(e.target.value) })
            }
            placeholder="Value"
          />
          <TextInput
            type="number"
            className="w-full"
            value={visual.max}
            onChange={(e) =>
              onChange({ ...visual, max: Number(e.target.value) })
            }
            placeholder="Max"
          />
        </div>
        <TextInput
          className="w-full"
          value={visual.label ?? ""}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Label"
        />
      </div>
    );
  }
  return null;
}
