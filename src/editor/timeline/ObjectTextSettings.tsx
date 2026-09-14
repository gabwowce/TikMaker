import {
  Button,
  Checkbox,
  Fieldset,
  NativeSelect,
  TextInput,
} from "@mantine/core";
import type { RichTextFont, TextCase } from "../../schema/scene";
import { richTextSplitBySchema } from "../../schema/scene";
import { formatDuration } from "../../utils/timecode";
import { splitSpan, splitText } from "../../video/typography/splitAnimate";
import {
  TEXT_CASE_OPTIONS,
  TEXT_FONT_OPTIONS,
} from "../../video/typography/textStyle";
import { useProjectStore } from "../state/projectStore";
import { Field, SliderField } from "./ObjectControls";

export const TEXT_COLOR_SWATCHES = [
  "#FFFFFF",
  "#171717",
  "#FF7024",
  "#FFD166",
  "#4ADE80",
  "#60A5FA",
  "#F472B6",
];

export type TypographyFieldsProps = {
  font: RichTextFont | undefined;
  defaultFont: RichTextFont;
  textCase: TextCase | undefined;
  defaultCase: TextCase;
  color: string | undefined;
  defaultColorHint: string;
  letterSpacing: number | undefined;
  onChange: (patch: {
    font?: RichTextFont;
    textCase?: TextCase;
    color?: string;
    letterSpacing?: number;
  }) => void;
};

export function TypographyFields({
  font,
  defaultFont,
  textCase,
  defaultCase,
  color,
  defaultColorHint,
  letterSpacing,
  onChange,
}: TypographyFieldsProps) {
  const resolvedFont = font ?? defaultFont;
  const tankerCapsOnly = resolvedFont === "tanker";
  return (
    <Fieldset legend="Style">
      <Field label="Font">
        <NativeSelect
          className="w-full"
          value={font ?? defaultFont}
          onChange={(event) =>
            onChange({ font: event.target.value as RichTextFont })
          }
        >
          {TEXT_FONT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="mb-3">
        <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em]">
          Text case
        </div>
        <div className="flex gap-1.5">
          {TEXT_CASE_OPTIONS.map((option) => {
            const active = (textCase ?? defaultCase) === option.id;
            const disabled = tankerCapsOnly && option.id !== "upper";
            return (
              <Button
                variant="default"
                key={option.id}
                aria-label={
                  disabled
                    ? "Tanker only displays uppercase letters. Choose Clash or Panchang for lowercase."
                    : option.title
                }
                disabled={disabled}
                onClick={() => onChange({ textCase: option.id })}
                className={`flex-1 ${disabled ? "[cursor:not-allowed]" : "cursor-pointer"} ${disabled ? "opacity-[0.35]" : "opacity-[1]"} ${active ? "bg-[rgba(255,112,36,0.14)]" : "bg-transparent"} ${active ? "[border:1px_solid_#FF7024]" : "[border:1px_solid_#2c2c2c]"} ${active ? "text-editor-accent" : "text-editor-text"}`}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mb-3">
        <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em]">
          Color
        </div>
        <div className="flex gap-1.5 items-center flex-wrap">
          {TEXT_COLOR_SWATCHES.map((swatch) => (
            <Button
              variant="default"
              key={swatch}
              aria-label={swatch}
              onClick={() => onChange({ color: swatch })}
              className={`w-5.5 ${color?.toUpperCase() === swatch ? "[border:2px_solid_#FF7024]" : "[border:2px_solid_rgba(255,255,255,0.18)]"}`}
              style={{
                background: swatch,
              }}
            />
          ))}
          <TextInput
            value={color ?? ""}
            placeholder={defaultColorHint}
            spellCheck={false}
            onChange={(event) => {
              const next = event.target.value.trim();
              onChange({ color: next === "" ? undefined : next });
            }}
            className="w-24"
          />
        </div>
      </div>

      <SliderField
        label="Letter spacing"
        value={letterSpacing ?? 0}
        min={-8}
        max={40}
        step={0.5}
        suffix="px"
        onChange={(value) =>
          onChange({ letterSpacing: value === 0 ? undefined : value })
        }
      />
    </Fieldset>
  );
}

export type TextPlacementFieldsProps = {
  x?: number;
  y?: number;
  sizePx?: number;
  sizeFallback: number;
  onChange: (patch: { x?: number; y?: number; sizePx?: number }) => void;
};

export function TextPlacementFields({
  x,
  y,
  sizePx,
  sizeFallback,
  onChange,
}: TextPlacementFieldsProps) {
  const free = x !== undefined && y !== undefined;
  return (
    <Fieldset legend="Position and size">
      <label className="flex items-center gap-2 text-[11px] text-editor-muted mb-2.5 cursor-pointer">
        <Checkbox
          checked={free}
          onChange={(event) =>
            onChange(
              event.target.checked
                ? { x: x ?? 50, y: y ?? 50 }
                : { x: undefined, y: undefined },
            )
          }
        />
        Free position
      </label>
      {free ? (
        <>
          <SliderField
            label="X"
            value={x ?? 50}
            min={0}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(value) => onChange({ x: value })}
          />
          <SliderField
            label="Y"
            value={y ?? 50}
            min={0}
            max={100}
            step={0.5}
            suffix="%"
            onChange={(value) => onChange({ y: value })}
          />
        </>
      ) : null}
      <SliderField
        label="Size"
        value={sizePx ?? sizeFallback}
        min={12}
        max={220}
        step={1}
        suffix="px"
        onChange={(value) =>
          onChange({
            sizePx:
              Math.round(value) === Math.round(sizeFallback)
                ? undefined
                : value,
          })
        }
      />
    </Fieldset>
  );
}

export type SplitFieldsProps = {
  text: string;
  splitBy?: "word" | "letter" | "line";
  splitDuration?: number;
  onChange: (patch: {
    splitBy?: "word" | "letter" | "line";
    splitDuration?: number;
  }) => void;
};

export function SplitFields({
  text,
  splitBy,
  splitDuration,
  onChange,
}: SplitFieldsProps) {
  const fps = useProjectStore((state) => state.project.fps);
  const resolved = splitBy ?? "word";
  const automatic = splitSpan(text, resolved);
  const visible = splitText(text, resolved).filter(
    (unit) => unit.trim().length > 0,
  ).length;
  return (
    <>
      <Field label="Text splitting">
        <NativeSelect
          className="w-full"
          value={resolved}
          onChange={(event) =>
            onChange({ splitBy: event.target.value as typeof splitBy })
          }
        >
          {richTextSplitBySchema.options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </NativeSelect>
      </Field>
      {resolved === "line" ? null : (
        <>
          <SliderField
            label={`Animation duration (${visible} ${resolved === "letter" ? "letters" : "words"})`}
            value={(splitDuration ?? automatic) / fps}
            min={0}
            max={4}
            step={0.05}
            suffix="s"
            onChange={(seconds) =>
              onChange({ splitDuration: Math.round(seconds * fps) })
            }
          />

          <div className="flex gap-1.5 mb-2.5">
            <Button
              variant="default"
              className="min-w-5"
              aria-label="Reset to automatic timing"
              onClick={() => onChange({ splitDuration: undefined })}
            >
              ↺ Auto
            </Button>
            <span className="text-[10px] text-editor-muted [line-height:1.45] mb-2">
              {splitDuration === undefined
                ? `auto · ${formatDuration(automatic, fps)}`
                : formatDuration(splitDuration, fps)}
            </span>
          </div>
        </>
      )}
    </>
  );
}
