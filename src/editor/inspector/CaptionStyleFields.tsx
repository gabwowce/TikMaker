import { Button, Checkbox, NativeSelect } from "@mantine/core";
import { highlightStyleSchema } from "../../schema/capabilities";
import type { RichTextFont } from "../../schema/scene";
import { DEFAULT_CAPTION_Y } from "../../video/typography/CaptionLayer";
import { TEXT_FONT_OPTIONS } from "../../video/typography/textStyle";
import { fontSizes } from "../../video/typography/tokens";
import { useProjectStore } from "../state/projectStore";
import { ColorField, Field, SliderField } from "../timeline/ObjectControls";

// How the captions look (B7): font, size, colour, outline, height, and how the
// word being spoken stands out (the same pill / color / bold as text highlights).
export function CaptionStyleFields() {
  const captions = useProjectStore((state) => state.project.captions) ?? {};
  const update = useProjectStore((state) => state.updateProjectCaptions);
  const activeStyle = captions.activeStyle ?? "pill";
  return (
    <div className="flex flex-col gap-2 mt-3">
      <Field label="Caption font">
        <NativeSelect
          className="w-full"
          value={captions.font ?? "tanker"}
          onChange={(event) =>
            update({ font: event.target.value as RichTextFont })
          }
        >
          {TEXT_FONT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <SliderField
        label="Size"
        value={captions.size ?? fontSizes.title}
        min={24}
        max={200}
        step={1}
        suffix="px"
        onChange={(size) => update({ size })}
      />
      <SliderField
        label="Height"
        value={captions.y ?? DEFAULT_CAPTION_Y}
        min={0}
        max={100}
        step={0.5}
        suffix="%"
        onChange={(y) => update({ y })}
      />
      <ColorField
        label="Text colour"
        value={captions.color}
        placeholder="auto · white"
        onChange={(color) => update({ color })}
      />
      <label className="flex items-center gap-2 text-[11px] text-editor-muted cursor-pointer">
        <Checkbox
          checked={captions.outline ?? false}
          onChange={(event) =>
            update({ outline: event.target.checked || undefined })
          }
        />
        Outline (dark edge around the letters)
      </label>
      <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em]">
        Spoken word
      </div>
      <div className="flex gap-1.5">
        {highlightStyleSchema.options.map((style) => (
          <Button
            variant="default"
            key={style}
            onClick={() => update({ activeStyle: style })}
            className={`flex-1 capitalize ${activeStyle === style ? "bg-[rgba(255,112,36,0.14)] [border:1px_solid_#FF7024] text-editor-accent" : "bg-transparent [border:1px_solid_#2c2c2c] text-editor-text"}`}
          >
            {style}
          </Button>
        ))}
      </div>
      {activeStyle !== "bold" ? (
        <ColorField
          label="Spoken word colour"
          value={captions.activeColor}
          placeholder={
            activeStyle === "pill" ? "auto · white" : "auto · orange"
          }
          onChange={(activeColor) => update({ activeColor })}
        />
      ) : null}
    </div>
  );
}
