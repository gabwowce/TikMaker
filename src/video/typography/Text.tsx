import React from "react";
import type { CSSProperties } from "react";
import { colors, fontFamilies, fontSizes } from "./tokens";

type TextTone = "primary" | "secondary" | "accent";

const toneColor: Record<TextTone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  accent: colors.accent,
};

type BaseTextProps = {
  children: React.ReactNode;
  tone?: TextTone;
  align?: CSSProperties["textAlign"];
  style?: CSSProperties;
};

/** Every text scale uses Tanker, uppercase — only the size token differs
 * between hero/headline/title/etc. See the Sound/Design rules in CLAUDE.md. */
function makeTextComponent(size: number, lineHeight: number) {
  return function TextComponent({ children, tone = "primary", align = "center", style }: BaseTextProps) {
    return (
      <div
        style={{
          fontFamily: fontFamilies.tanker,
          fontSize: size,
          lineHeight,
          color: toneColor[tone],
          textAlign: align,
          textWrap: "balance",
          textTransform: "uppercase",
          ...style,
        }}
      >
        {children}
      </div>
    );
  };
}

export const HeroText = makeTextComponent(fontSizes.hero, 0.95);
export const Headline = makeTextComponent(fontSizes.headline, 0.95);
export const Title = makeTextComponent(fontSizes.title, 1.02);
export const BodyLargeText = makeTextComponent(fontSizes.bodyLarge, 1.15);
export const BodyText = makeTextComponent(fontSizes.body, 1.2);
export const LabelText = makeTextComponent(fontSizes.label, 1.2);

export const ImpactText: React.FC<BaseTextProps> = ({ children, tone = "accent", align = "center", style }) => (
  <div
    style={{
      fontFamily: fontFamilies.tanker,
      fontSize: fontSizes.headline,
      lineHeight: 1,
      color: toneColor[tone],
      textAlign: align,
      textTransform: "uppercase",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Inline box-highlight style — a solid contrast box behind text, not a color swap. */
export const pillInlineStyle: CSSProperties = {
  display: "inline",
  backgroundColor: colors.textPrimary,
  color: colors.background,
  padding: "0.05em 0.18em",
  borderRadius: 6,
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
} as CSSProperties;

/** Block box-highlight style — used for a whole RichHeadline line. */
export const pillBlockStyle: CSSProperties = {
  display: "inline-block",
  backgroundColor: colors.textPrimary,
  color: colors.background,
  padding: "0.12em 0.35em",
  borderRadius: 10,
};

/** Splits `text` on any of `highlights` (case-insensitive) and wraps matches in a
 * contrast pill box (not a color swap — the design system no longer highlights via color). */
export function renderHighlighted(text: string | undefined, highlights?: string[]): React.ReactNode {
  if (!text) return text;
  if (!highlights || highlights.length === 0) return text;

  const pattern = new RegExp(`(${highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    highlights.some((h) => h.toLowerCase() === part.toLowerCase()) ? (
      <span key={index} style={pillInlineStyle}>
        {part}
      </span>
    ) : (
      <React.Fragment key={index}>{part}</React.Fragment>
    )
  );
}
