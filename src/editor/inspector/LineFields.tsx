import { Button, Checkbox, NativeSelect } from "@mantine/core";
import type { VisualConfig } from "../../schema/visual";
import { ColorField, Field, SliderField } from "../timeline/ObjectControls";

type Line = Extract<VisualConfig, { type: "line" }>;
type Highlight = Extract<VisualConfig, { type: "highlight" }>;

// Content fields of a line / arrow (B6): it draws itself on when its layer appears.
export function LineFields({
  visual,
  onChange,
}: {
  visual: Line;
  onChange: (visual: Line) => void;
}) {
  const update = (patch: Partial<Line>) => onChange({ ...visual, ...patch });
  return (
    <div className="flex flex-col gap-1">
      <SliderField
        label="Length"
        value={visual.length}
        min={40}
        max={2000}
        step={10}
        suffix="px"
        onChange={(length) => update({ length })}
      />
      <SliderField
        label="Angle"
        value={visual.angle ?? 0}
        min={-180}
        max={180}
        step={1}
        suffix="°"
        onChange={(angle) => update({ angle })}
      />
      <SliderField
        label="Curve"
        value={visual.curve ?? 0}
        min={-1}
        max={1}
        step={0.05}
        suffix=""
        onChange={(curve) => update({ curve })}
      />
      <SliderField
        label="Thickness"
        value={visual.thickness ?? 10}
        min={2}
        max={60}
        step={1}
        suffix="px"
        onChange={(thickness) => update({ thickness })}
      />
      <Field label="Arrow">
        <NativeSelect
          className="w-full"
          value={visual.arrow ?? "none"}
          data={[
            { value: "none", label: "No arrow" },
            { value: "end", label: "Arrow at the end" },
            { value: "both", label: "Arrows at both ends" },
          ]}
          onChange={(event) =>
            update({ arrow: event.target.value as Line["arrow"] })
          }
        />
      </Field>
      <label className="flex items-center gap-2 text-[11px] text-editor-muted cursor-pointer mb-2">
        <Checkbox
          checked={visual.dashed ?? false}
          onChange={(event) =>
            update({ dashed: event.target.checked || undefined })
          }
        />
        Dashed
      </label>
      <ColorField
        label="Color"
        value={visual.color}
        placeholder="auto · orange"
        onChange={(color) => update({ color })}
      />
    </div>
  );
}

// Content fields of a highlight box / circle, which also draws itself on.
export function HighlightBoxFields({
  visual,
  onChange,
}: {
  visual: Highlight;
  onChange: (visual: Highlight) => void;
}) {
  const update = (patch: Partial<Highlight>) =>
    onChange({ ...visual, ...patch });
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1.5 mb-2">
        {(["box", "circle"] as const).map((shape) => (
          <Button
            key={shape}
            variant="default"
            onClick={() => update({ shape })}
            className={`flex-1 capitalize ${(visual.shape ?? "box") === shape ? "bg-[rgba(255,112,36,0.14)] [border:1px_solid_#FF7024] text-editor-accent" : "bg-transparent [border:1px_solid_#2c2c2c] text-editor-text"}`}
          >
            {shape}
          </Button>
        ))}
      </div>
      <SliderField
        label="Width"
        value={visual.width}
        min={40}
        max={1080}
        step={10}
        suffix="px"
        onChange={(width) => update({ width })}
      />
      <SliderField
        label="Height"
        value={visual.height}
        min={40}
        max={1920}
        step={10}
        suffix="px"
        onChange={(height) => update({ height })}
      />
    </div>
  );
}
