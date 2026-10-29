import { useId } from "react";
import type { VisualEffect, VisualEffectType } from "../../schema/scene";
import { colors } from "../typography/tokens";

// A layer's effects (B4): shadow, glow and outline, each with its own colour
// and opacity. Unset = the brand default below, so a layer follows the brand
// colours unless the author picked one.
export const EFFECT_DEFAULTS: Record<
  VisualEffectType,
  { color: string; opacity: number }
> = {
  outline: { color: colors.textPrimary, opacity: 1 },
  glow: { color: colors.accent, opacity: 0.9 },
  shadow: { color: "#000000", opacity: 0.55 },
};
const OUTLINE_WIDTH = 6;

function resolveEffect(
  effects: VisualEffect[] | undefined,
  type: VisualEffectType,
) {
  const effect = effects?.find((item) => item.type === type);
  if (!effect) return undefined;
  return {
    color: effect.color ?? EFFECT_DEFAULTS[type].color,
    opacity: effect.opacity ?? EFFECT_DEFAULTS[type].opacity,
  };
}

function tint(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

// The CSS filter for a layer plus the SVG the outline needs. Sizes are canvas
// pixels: the filter sits inside the layer's scale, so each is divided by it.
// The outline is an SVG filter, not drop-shadows: it keeps only the solid
// shape (a card's own soft box-shadow is dropped), grows it and paints it
// behind the original — a line, not a haze.
export function useVisualEffects(
  effects: VisualEffect[] | undefined,
  scale = 1,
) {
  const outlineId = `outline-${useId().replace(/:/g, "")}`;
  const px = (value: number) => value / scale;
  const outline = resolveEffect(effects, "outline");
  const glow = resolveEffect(effects, "glow");
  const shadow = resolveEffect(effects, "shadow");
  const parts: string[] = [];
  if (outline) parts.push(`url(#${outlineId})`);
  if (glow) {
    const color = tint(glow.color, glow.opacity);
    parts.push(
      `drop-shadow(0 0 ${px(18)}px ${color})`,
      `drop-shadow(0 0 ${px(42)}px ${color})`,
    );
  }
  if (shadow) {
    const color = tint(shadow.color, shadow.opacity);
    parts.push(`drop-shadow(0 ${px(18)}px ${px(36)}px ${color})`);
  }
  const defs = outline ? (
    <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
      <filter
        id={outlineId}
        x="-10%"
        y="-10%"
        width="120%"
        height="120%"
        colorInterpolationFilters="sRGB"
      >
        <feComponentTransfer in="SourceAlpha" result="shape">
          <feFuncA type="discrete" tableValues="0 0 0 1" />
        </feComponentTransfer>
        <feMorphology
          in="shape"
          operator="dilate"
          radius={px(OUTLINE_WIDTH)}
          result="grown"
        />
        <feFlood floodColor={outline.color} floodOpacity={outline.opacity} />
        <feComposite in2="grown" operator="in" result="line" />
        <feMerge>
          <feMergeNode in="line" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </svg>
  ) : null;
  return { filter: parts.length ? parts.join(" ") : undefined, defs };
}
