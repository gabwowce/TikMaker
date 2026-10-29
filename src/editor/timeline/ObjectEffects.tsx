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
  VisualEffectType,
} from "../../schema/scene";
import { EFFECT_DEFAULTS } from "../../video/visuals/visualEffects";
import { ColorField, DurationSlider, SliderField } from "./ObjectControls";

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
  const list = effects ?? [];
  function save(next: VisualEffect[]) {
    onChange({ effects: next.length ? next : undefined });
  }
  function change(type: VisualEffectType, patch: Partial<VisualEffect>) {
    save(
      list.map((item) => (item.type === type ? { ...item, ...patch } : item)),
    );
  }
  return (
    <div className="mb-3">
      <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em] mb-1.5">
        Look
      </div>
      {visualEffectSchema.options.map((type) => {
        const effect = list.find((item) => item.type === type);
        const defaults = EFFECT_DEFAULTS[type];
        return (
          <div key={type} className="mb-2">
            <Checkbox
              label={friendlyEffect(type)}
              checked={Boolean(effect)}
              onChange={(event) =>
                save(
                  event.currentTarget.checked
                    ? [...list, { type }]
                    : list.filter((item) => item.type !== type),
                )
              }
            />
            {effect ? (
              <div className="pl-6 pt-2">
                <ColorField
                  label="Color"
                  value={effect.color}
                  placeholder={`auto · ${defaults.color}`}
                  onChange={(color) => change(type, { color })}
                />
                <SliderField
                  label="Opacity"
                  value={Math.round((effect.opacity ?? defaults.opacity) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  decimals={0}
                  suffix="%"
                  onChange={(value) => change(type, { opacity: value / 100 })}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
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
