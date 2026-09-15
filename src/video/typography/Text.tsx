import type { CSSProperties } from "react";
import { Fragment, type ReactNode } from "react";
import { colors, fontSizes } from "./tokens";
type TextTone = "primary" | "secondary" | "accent";
const toneColor: Record<TextTone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  accent: colors.accent,
};
type BaseTextProps = {
  children: ReactNode;
  tone?: TextTone;
  align?: CSSProperties["textAlign"];
  style?: CSSProperties;
  className?: string;
};
type TextProps = BaseTextProps & { size: number; lineHeight: number };
function Text({
  children,
  tone = "primary",
  align = "center",
  style,
  className = "",
  size,
  lineHeight,
}: TextProps) {
  return (
    <div
      className={`[font-family:Tanker-Regular] [text-wrap:balance] uppercase ${className}`}
      style={{
        fontSize: size,
        lineHeight,
        color: toneColor[tone],
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
export function HeroText(props: BaseTextProps) {
  return <Text {...props} size={fontSizes.hero} lineHeight={0.95} />;
}
export function Headline(props: BaseTextProps) {
  return <Text {...props} size={fontSizes.headline} lineHeight={0.95} />;
}
export function Title(props: BaseTextProps) {
  return <Text {...props} size={fontSizes.title} lineHeight={1.02} />;
}
export function BodyLargeText(props: BaseTextProps) {
  return <Text {...props} size={fontSizes.bodyLarge} lineHeight={1.15} />;
}
export function BodyText(props: BaseTextProps) {
  return <Text {...props} size={fontSizes.body} lineHeight={1.2} />;
}
export function LabelText(props: BaseTextProps) {
  return <Text {...props} size={fontSizes.label} lineHeight={1.2} />;
}
export function ImpactText({
  children,
  tone = "accent",
  align = "center",
  style,
  className = "",
}: BaseTextProps) {
  return (
    <div
      className={`${className} [font-family:Tanker-Regular] text-headline [line-height:1] uppercase`}
      style={{
        color: toneColor[tone],
        textAlign: align,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
// Žodžio paryškinimas visada yra dėžutė (šviesus fonas, tamsus tekstas),
// niekada ne spalvos keitimas. Vienintelė vieta, kur tai aprašyta.
export const pillClassName =
  "inline bg-brand-text text-brand-bg p-[0.05em_0.18em] rounded-md [box-decoration-break:clone] [-webkit-box-decoration-break:clone]";
