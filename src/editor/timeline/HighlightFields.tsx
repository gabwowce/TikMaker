import { Button, UnstyledButton } from "@mantine/core";
import { highlightStyleSchema } from "../../schema/capabilities";
import type { HighlightStyle } from "../../schema/scene";
import { COLOR_SWATCHES } from "./ObjectControls";

type HighlightFieldsProps = {
  text: string;
  highlights?: string[];
  highlightStyle?: HighlightStyle;
  highlightColor?: string;
  onChange: (patch: {
    highlights?: string[];
    highlightStyle?: HighlightStyle;
    highlightColor?: string;
  }) => void;
};

// Click a word to highlight it, then pick how highlighted words look.
export function HighlightFields({
  text,
  highlights,
  highlightStyle,
  highlightColor,
  onChange,
}: HighlightFieldsProps) {
  const current = highlightStyle ?? "pill";
  const words = text.split(/\s+/).filter(Boolean);
  const chosen = new Set((highlights ?? []).map((word) => word.toLowerCase()));
  function toggle(word: string) {
    const key = word.toLowerCase();
    const next = chosen.has(key)
      ? [...chosen].filter((w) => w !== key)
      : [...chosen, key];
    onChange({ highlights: next.length > 0 ? next : undefined });
  }
  return (
    <div className="flex flex-col gap-2 mt-3">
      <div className="text-[10px] text-editor-muted uppercase [letter-spacing:.05em]">
        Highlighted words
      </div>
      <div className="flex flex-wrap gap-1.5">
        {words.map((word, index) => (
          <UnstyledButton
            key={index}
            onClick={() => toggle(word)}
            className={`rounded px-2 py-1 text-[12px] border border-solid ${
              chosen.has(word.toLowerCase())
                ? "bg-editor-accent border-editor-accent text-white"
                : "border-editor-border text-editor-muted"
            }`}
          >
            {word}
          </UnstyledButton>
        ))}
      </div>
      {chosen.size > 0 ? (
        <div className="flex gap-1.5">
          {highlightStyleSchema.options.map((style) => {
            const active = current === style;
            return (
              <Button
                variant="default"
                key={style}
                onClick={() => onChange({ highlightStyle: style })}
                className={`flex-1 capitalize ${active ? "bg-[rgba(255,112,36,0.14)] [border:1px_solid_#FF7024] text-editor-accent" : "bg-transparent [border:1px_solid_#2c2c2c] text-editor-text"}`}
              >
                {style}
              </Button>
            );
          })}
        </div>
      ) : null}
      {chosen.size > 0 && current !== "bold" ? (
        // small colour dots; the first one goes back to the default
        <div className="flex gap-1 items-center">
          <button
            type="button"
            aria-label="Default highlight colour"
            title="Default"
            onClick={() => onChange({ highlightColor: undefined })}
            className={`w-4 h-4 rounded-full text-[9px] leading-none text-editor-muted bg-transparent cursor-pointer ${highlightColor ? "[border:1px_solid_rgba(255,255,255,0.18)]" : "[border:1px_solid_#FF7024]"}`}
          >
            ×
          </button>
          {COLOR_SWATCHES.map((swatch) => (
            <button
              type="button"
              key={swatch}
              aria-label={swatch}
              onClick={() => onChange({ highlightColor: swatch })}
              className={`w-4 h-4 rounded-full cursor-pointer ${highlightColor?.toUpperCase() === swatch ? "[border:2px_solid_#FF7024]" : "[border:1px_solid_rgba(255,255,255,0.18)]"}`}
              style={{ background: swatch }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
