import { NativeSelect, Slider, TextInput } from "@mantine/core";
import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
} from "../../schema/scene";
import {
  entrancePresetSchema,
  exitPresetSchema,
  kenBurnsPresetSchema,
} from "../../schema/scene";
import { DistanceControl, SecondsSlider } from "./controls";
import { SfxSelect } from "./SfxSelect";

const DISTANCE_ENTRANCES = new Set([
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "zoomSettleRight",
  "zoomSettleLeft",
  "zoomSettleTop",
  "zoomSettleBottom",
  "dropIn",
  "rollIn",
]);

const DISTANCE_EXITS = new Set([
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "dropOut",
  "rollOut",
]);

const CYCLIC_KEN_BURNS = new Set(["float", "rotateCW", "rotateCCW"]);

function kenBurnsPresetLabel(preset: KenBurnsPreset): string {
  switch (preset) {
    case "float":
      return "float (drift + tilt, loops)";
    case "rotateCW":
      return "rotate clockwise (spins, loops)";
    case "rotateCCW":
      return "rotate counter-clockwise (spins, loops)";
    default:
      return preset;
  }
}

export type VisualMotionValue = {
  entrance?: EntrancePreset;
  entranceDuration?: number;
  exit?: ExitPreset;
  exitDuration?: number;
  entranceDistance?: number;
  exitDistance?: number;
  kenBurns?: KenBurnsPreset;
  kenBurnsSpeed?: number;
  scale?: number;
  sfx?: string;
  exitSfx?: string;
};

type VisualMotionEditorProps = {
  value: VisualMotionValue;
  onChange: (patch: Partial<VisualMotionValue>) => void;
  entranceFallbackLabel: string;
  showScale?: boolean;
  sfxMode?: "auto" | "explicit";
  entranceApplies?: boolean;
  exitApplies?: boolean;
};

export function VisualMotionEditor({
  value,
  onChange,
  entranceFallbackLabel,
  showScale,
  sfxMode = "auto",
  entranceApplies = true,
  exitApplies = true,
}: VisualMotionEditorProps) {
  return (
    <>
      <div className="grid [grid-template-columns:1fr_1fr] gap-1.5 mb-1.5">
        <div>
          <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
            In
          </div>
          {entranceApplies ? (
            <NativeSelect
              className="w-full"
              value={value.entrance ?? ""}
              onChange={(e) =>
                onChange({
                  entrance: (e.target.value || undefined) as
                    | EntrancePreset
                    | undefined,
                })
              }
            >
              <option value="">{entranceFallbackLabel}</option>
              {entrancePresetSchema.options.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </NativeSelect>
          ) : null}
        </div>
        <div>
          <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
            Out
          </div>
          {exitApplies ? (
            <NativeSelect
              className="w-full"
              value={value.exit ?? ""}
              onChange={(e) =>
                onChange({
                  exit: (e.target.value || undefined) as ExitPreset | undefined,
                })
              }
            >
              <option value="">no exit (stays)</option>
              {exitPresetSchema.options.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </NativeSelect>
          ) : null}
        </div>
      </div>

      {entranceApplies && value.entrance && value.entrance !== "none" ? (
        <>
          <SecondsSlider
            label="Entrance duration"
            frames={value.entranceDuration ?? 18}
            minFrames={1}
            maxFrames={60}
            onChange={(entranceDuration) => onChange({ entranceDuration })}
          />

          {DISTANCE_ENTRANCES.has(value.entrance) ? (
            <DistanceControl
              label="In distance"
              value={value.entranceDistance}
              onChange={(entranceDistance) => onChange({ entranceDistance })}
            />
          ) : null}
        </>
      ) : null}

      {exitApplies && value.exit ? (
        <>
          <SecondsSlider
            label="Exit duration"
            frames={value.exitDuration ?? 18}
            minFrames={1}
            maxFrames={60}
            onChange={(exitDuration) => onChange({ exitDuration })}
          />
          {DISTANCE_EXITS.has(value.exit) ? (
            <DistanceControl
              label="Out distance"
              value={value.exitDistance}
              onChange={(exitDistance) => onChange({ exitDistance })}
            />
          ) : null}
        </>
      ) : null}

      {showScale ? (
        <>
          <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
            Scale — {(value.scale ?? 1).toFixed(2)}x
          </div>
          <div className="grid [grid-template-columns:2fr_1fr] gap-1.5 items-center mb-1.5">
            <Slider
              min={0.2}
              max={2.5}
              step={0.05}
              value={value.scale ?? 1}
              onChange={(value) => onChange({ scale: Number(value) })}
            />
            <TextInput
              type="number"
              step={0.05}
              min={0.1}
              className="w-full"
              value={value.scale ?? 1}
              onChange={(e) =>
                onChange({ scale: Number(e.target.value) || undefined })
              }
            />
          </div>
        </>
      ) : null}

      <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
        Ken Burns (continuous zoom/pan)
      </div>
      {entranceApplies ? (
        <>
          <NativeSelect
            className="w-full mb-1.5"
            value={value.kenBurns ?? ""}
            onChange={(e) =>
              onChange({
                kenBurns: (e.target.value || undefined) as
                  | KenBurnsPreset
                  | undefined,
              })
            }
          >
            <option value="">static (no drift)</option>
            {kenBurnsPresetSchema.options.map((preset) => (
              <option key={preset} value={preset}>
                {kenBurnsPresetLabel(preset)}
              </option>
            ))}
          </NativeSelect>

          {value.kenBurns && CYCLIC_KEN_BURNS.has(value.kenBurns) ? (
            <div className="mb-1.5">
              <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
                Speed — {(value.kenBurnsSpeed ?? 1).toFixed(2)}x
              </div>
              <div className="grid [grid-template-columns:2fr_1fr] gap-1.5 items-center">
                <Slider
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={value.kenBurnsSpeed ?? 1}
                  onChange={(value) =>
                    onChange({ kenBurnsSpeed: Number(value) })
                  }
                />
                <TextInput
                  type="number"
                  step={0.1}
                  min={0.1}
                  className="w-full"
                  value={value.kenBurnsSpeed ?? 1}
                  onChange={(e) =>
                    onChange({
                      kenBurnsSpeed: Number(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
        Sound
      </div>
      <div className="grid [grid-template-columns:1fr_1fr] gap-1.5">
        <div>
          <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
            In
          </div>
          {entranceApplies ? (
            <SfxSelect
              mode={sfxMode}
              value={value.sfx}
              onChange={(sfx) => onChange({ sfx })}
            />
          ) : null}
        </div>
        <div>
          <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
            Out
          </div>
          {exitApplies ? (
            <SfxSelect
              mode={sfxMode}
              value={value.exitSfx}
              onChange={(exitSfx) => onChange({ exitSfx })}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
