import type { VisualEffect } from "../../schema/scene";
import { colors } from "../typography/tokens";

// A layer's effects (B4) as one CSS filter. drop-shadow follows the artwork's
// own shape — a logo's outline, not its box. Sizes are canvas pixels: the
// filter sits inside the layer's scale, so each one is divided by it.
export function effectsFilter(
  effects: VisualEffect[] | undefined,
  scale = 1,
): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const px = (value: number) => `${value / scale}px`;
  const parts: string[] = [];
  if (effects.includes("outline")) {
    const line = colors.textPrimary;
    parts.push(
      `drop-shadow(${px(6)} 0 0 ${line})`,
      `drop-shadow(${px(-6)} 0 0 ${line})`,
      `drop-shadow(0 ${px(6)} 0 ${line})`,
      `drop-shadow(0 ${px(-6)} 0 ${line})`,
    );
  }
  if (effects.includes("glow")) {
    parts.push(
      `drop-shadow(0 0 ${px(18)} ${colors.accent})`,
      `drop-shadow(0 0 ${px(42)} ${colors.accent})`,
    );
  }
  if (effects.includes("shadow")) {
    parts.push(`drop-shadow(0 ${px(18)} ${px(36)} rgba(0, 0, 0, 0.55))`);
  }
  return parts.join(" ");
}
