import { ActionIcon, Button, Fieldset, Slider, TextInput } from "@mantine/core";
import { type ReactNode } from "react";
import { frameStep, framesToSeconds } from "../../utils/timecode";
import { SfxSelect } from "../inspector/SfxSelect";
import { useProjectStore } from "../state/projectStore";
import {
  confirmDeleteTimelineObject,
  describeTimelineObject,
} from "./deleteTimelineObject";

export type DeleteObjectButtonProps = {
  selectionId: string;
  onDeleted: () => void;
};

export function DeleteObjectButton({
  selectionId,
  onDeleted,
}: DeleteObjectButtonProps) {
  const { label, deletable } = describeTimelineObject(selectionId);
  if (!deletable) return null;
  return (
    <Button
      variant="default"
      className="w-full mt-3"
      aria-label="Delete object"
      onClick={() => {
        if (confirmDeleteTimelineObject(selectionId)) onDeleted();
      }}
    >
      Remove · {label.length > 24 ? `${label.slice(0, 24)}…` : label}
    </Button>
  );
}

export type DurationSliderProps = {
  label: string;
  value: number;
  windowFrames?: number;
  onChange: (frames: number) => void;
};

export function DurationSlider({
  label,
  value,
  windowFrames,
  onChange,
}: DurationSliderProps) {
  const fps = useProjectStore((state) => state.project.fps);
  const maxSeconds = Math.max(
    0.3,
    Math.min(60, (windowFrames ?? 2 * fps) / fps),
  );
  return (
    <SliderField
      label={label}
      value={framesToSeconds(value, fps)}
      min={frameStep(fps)}
      max={maxSeconds}
      step={frameStep(fps)}
      suffix="s"
      decimals={3}
      onChange={(next) => onChange(Math.max(1, Math.round(next * fps)))}
    />
  );
}

export type TimingFieldsProps = {
  start: number;
  end: number;
  max: number;
  onChange: (start: number, end: number) => void;
};

export function TimingFields({ start, end, max, onChange }: TimingFieldsProps) {
  const fps = useProjectStore((state) => state.project.fps);
  return (
    <Fieldset legend="Timing">
      <FrameSlider
        label="IN"
        value={start}
        min={0}
        max={Math.max(0, end - 1)}
        fps={fps}
        onChange={(value) => onChange(value, end)}
      />
      <FrameSlider
        label="OUT"
        value={end}
        min={Math.min(max, start + 1)}
        max={max}
        fps={fps}
        onChange={(value) => onChange(start, value)}
      />
    </Fieldset>
  );
}

export type TimePointProps = {
  value: number;
  max: number;
  onChange: (value: number) => void;
};

export function TimePoint({ value, max, onChange }: TimePointProps) {
  const fps = useProjectStore((state) => state.project.fps);
  return (
    <Fieldset legend="Timing">
      <FrameSlider
        label="Position"
        value={value}
        min={0}
        max={Math.max(1, max - 1)}
        fps={fps}
        onChange={onChange}
      />
    </Fieldset>
  );
}

export type FrameSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  fps: number;
  onChange: (value: number) => void;
};

export function FrameSlider({
  label,
  value,
  min,
  max,
  fps,
  onChange,
}: FrameSliderProps) {
  return (
    <SliderField
      label={label}
      value={framesToSeconds(value, fps)}
      min={framesToSeconds(min, fps)}
      max={framesToSeconds(max, fps)}
      step={frameStep(fps)}
      suffix="s"
      decimals={3}
      onChange={(seconds) =>
        onChange(Math.max(min, Math.min(max, Math.round(seconds * fps))))
      }
    />
  );
}

export type PositionFieldsProps = {
  x: number;
  y: number;
  scale: number;
  scaleMin: number;
  scaleMax: number;
  scaleLabel: string;
  onChange: (patch: { x?: number; y?: number; scale?: number }) => void;
};

export function PositionFields({
  x,
  y,
  scale,
  scaleMin,
  scaleMax,
  scaleLabel,
  onChange,
}: PositionFieldsProps) {
  return (
    <Fieldset legend="Position">
      <SliderField
        label="X"
        value={x}
        min={0}
        max={100}
        step={0.5}
        suffix="%"
        onChange={(value) => onChange({ x: value })}
      />
      <SliderField
        label="Y"
        value={y}
        min={0}
        max={100}
        step={0.5}
        suffix="%"
        onChange={(value) => onChange({ y: value })}
      />
      <SliderField
        label={scaleLabel}
        value={scale}
        min={scaleMin}
        max={scaleMax}
        step={scaleMax > 10 ? 1 : 0.05}
        suffix={scaleMax > 10 ? "px" : "×"}
        onChange={(value) => onChange({ scale: value })}
      />
    </Fieldset>
  );
}

export type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  decimals?: number;
  onChange: (value: number) => void;
};

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  decimals = 2,
  onChange,
}: SliderFieldProps) {
  const begin = useProjectStore((state) => state.beginHistoryTransaction);
  const end = useProjectStore((state) => state.endHistoryTransaction);
  return (
    <div className="mb-3.5">
      <div className="flex justify-between items-center mb-[5px]">
        <span className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em]">
          {label}
        </span>
        <label className="flex items-center gap-[3px] p-[2px_6px] rounded-[5px] border border-solid border-editor-border bg-[#222] text-editor-muted text-[10px]">
          <TextInput
            type="number"
            min={min}
            max={max}
            step={step}
            value={Number(value.toFixed(decimals))}
            aria-label={label}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-20"
          />
          <span>{suffix}</span>
        </label>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        thumbLabel={label}
        onChangeEnd={end}
        onPointerDown={begin}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={begin}
        onKeyUp={end}
        onChange={(value) => onChange(Number(value))}
        className="w-full m-0"
      />
    </div>
  );
}

export type AudioPairProps = {
  entrance?: string;
  exit?: string;
  mode: "auto" | "explicit";
  autoEntranceSfx?: string;
  onEntrance: (value?: string) => void;
  onExit?: (value?: string) => void;
};

export function AudioPair({
  entrance,
  exit,
  mode,
  autoEntranceSfx,
  onEntrance,
  onExit,
}: AudioPairProps) {
  return (
    <Fieldset legend="Sounds">
      <Field label="IN sound">
        <SfxSelect
          mode={mode}
          autoResolvesTo={autoEntranceSfx}
          value={entrance}
          onChange={onEntrance}
        />
      </Field>
      {onExit ? (
        <Field label="OUT sound">
          <SfxSelect mode={mode} value={exit} onChange={onExit} />
        </Field>
      ) : null}
    </Fieldset>
  );
}

export type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <label className="block mb-3">
      <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em]">
        {label}
      </div>
      {children}
    </label>
  );
}

export function EmptyTab() {
  return (
    <div className="p-[24px_8px] text-editor-muted text-center text-[11px]">
      This object has no settings in this tab.
    </div>
  );
}

export type EmptyInspectorProps = {
  onClose: () => void;
};

export function EmptyInspector({ onClose }: EmptyInspectorProps) {
  return (
    <aside className="w-[clamp(300px,_23vw,_480px)] shrink-0 min-h-0 flex flex-col border-0 border-l border-solid border-editor-border bg-editor-panel text-editor-text">
      <div className="flex justify-between items-start p-[16px_16px_12px] shrink-0">
        <div className="text-editor-muted">Object not found.</div>
        <ActionIcon variant="default" onClick={onClose} className="w-7">
          ×
        </ActionIcon>
      </div>
    </aside>
  );
}
