import { Checkbox, NativeSelect } from "@mantine/core";
import {
  entrancePresetSchema,
  exitPresetSchema,
  kenBurnsPresetSchema,
  visualEffectSchema,
} from "../../schema/capabilities";
import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
  VisualEffect,
} from "../../schema/scene";
import { DurationSlider, SliderField } from "./ObjectControls";

export type EffectPatch = {
  entrance?: EntrancePreset;
  exit?: ExitPreset;
  entranceDuration?: number;
  exitDuration?: number;
};

export function renameEntranceField(patch: EffectPatch): {
  animation?: EntrancePreset;
} & Omit<EffectPatch, "entrance"> {
  const { entrance, ...rest } = patch;
  return "entrance" in patch ? { ...rest, animation: entrance } : rest;
}

export function EffectsEditor({
  entrance,
  exit,
  entranceDuration,
  exitDuration,
  autoEntrance,
  windowFrames,
  ownsInDuration = true,
  onChange,
}: EffectPatch & {
  autoEntrance: string;
  windowFrames?: number;
  ownsInDuration?: boolean;
  onChange: (patch: EffectPatch) => void;
}) {
  return (
    <>
      <EffectPicker
        title="IN effect"
        values={entrancePresetSchema.options}
        value={entrance}
        emptyLabel={`auto · ${friendlyEffect(autoEntrance)}`}
        onChange={(value) =>
          onChange({ entrance: value as EntrancePreset | undefined })
        }
      />
      {ownsInDuration ? (
        <DurationSlider
          label="IN duration"
          value={entranceDuration ?? 18}
          windowFrames={windowFrames}
          onChange={(value) => onChange({ entranceDuration: value })}
        />
      ) : null}
      <EffectPicker
        title="OUT effect"
        values={exitPresetSchema.options}
        value={exit}
        emptyLabel="no effect"
        onChange={(value) =>
          onChange({ exit: value as ExitPreset | undefined })
        }
      />
      <DurationSlider
        label="OUT duration"
        value={exitDuration ?? 18}
        windowFrames={windowFrames}
        onChange={(value) => onChange({ exitDuration: value })}
      />
    </>
  );
}

export type LoopEffectEditorProps = {
  kenBurns?: KenBurnsPreset;
  kenBurnsSpeed?: number;
  onChange: (patch: {
    kenBurns?: KenBurnsPreset;
    kenBurnsSpeed?: number;
  }) => void;
};

export function LoopEffectEditor({
  kenBurns,
  kenBurnsSpeed,
  onChange,
}: LoopEffectEditorProps) {
  return (
    <>
      <EffectPicker
        title="Continuous effect"
        values={kenBurnsPresetSchema.options}
        value={kenBurns}
        emptyLabel="no effect"
        onChange={(value) =>
          onChange({ kenBurns: value as KenBurnsPreset | undefined })
        }
      />
      {kenBurns && CYCLIC_KEN_BURNS.has(kenBurns) ? (
        <SliderField
          label="Speed"
          value={kenBurnsSpeed ?? 1}
          min={0.1}
          max={5}
          step={0.05}
          suffix="×"
          onChange={(value) =>
            onChange({ kenBurnsSpeed: value === 1 ? undefined : value })
          }
        />
      ) : null}
    </>
  );
}
export function VisualEffectsEditor({
  effects,
  onChange,
}: {
  effects?: VisualEffect[];
  onChange: (patch: { effects?: VisualEffect[] }) => void;
}) {
  return (
    <Checkbox.Group
      label="Look"
      value={effects ?? []}
      onChange={(value) =>
        onChange({
          effects: value.length ? (value as VisualEffect[]) : undefined,
        })
      }
      className="mb-3"
    >
      <div className="flex gap-3 mt-1">
        {visualEffectSchema.options.map((effect) => (
          <Checkbox
            key={effect}
            value={effect}
            label={friendlyEffect(effect)}
          />
        ))}
      </div>
    </Checkbox.Group>
  );
}
export const CYCLIC_KEN_BURNS = new Set<string>([
  "float",
  "rotateCW",
  "rotateCCW",
]);

export type EffectPickerProps = {
  title: string;
  values: readonly string[];
  value?: string;
  emptyLabel: string;
  onChange: (value?: string) => void;
};

export function EffectPicker({
  title,
  values,
  value,
  emptyLabel,
  onChange,
}: EffectPickerProps) {
  return (
    <NativeSelect
      label={title}
      value={value ?? ""}
      data={[
        { value: "", label: emptyLabel },
        ...values.map((preset) => ({
          value: preset,
          label: friendlyEffect(preset),
        })),
      ]}
      onChange={(event) => onChange(event.currentTarget.value || undefined)}
      className="mb-3"
    />
  );
}

export const EFFECT_LABELS: Record<string, string> = {
  rotateCW: "rotate CW",
  rotateCCW: "rotate CCW",
  none: "no effect",
};

export function friendlyEffect(preset: string) {
  return EFFECT_LABELS[preset] ?? preset.replace(/([A-Z])/g, " $1").trim();
}
