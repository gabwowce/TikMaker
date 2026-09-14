import type { RichTextFont, TextCase } from "../../schema/scene";
import { fontFamilies } from "./tokens";
const FONT_FAMILY: Record<RichTextFont, string> = {
  tanker: fontFamilies.tanker,
  clash: fontFamilies.clashSemibold,
  clashMedium: fontFamilies.clashMedium,
  clashSemibold: fontFamilies.clashSemibold,
  clashBold: fontFamilies.clashBold,
  panchangMedium: fontFamilies.panchangMedium,
  panchangSemibold: fontFamilies.panchangSemibold,
};
export const TEXT_FONT_OPTIONS: {
  id: RichTextFont;
  label: string;
}[] = [
  { id: "tanker", label: "Tanker" },
  { id: "clashMedium", label: "Clash Medium" },
  { id: "clashSemibold", label: "Clash Semibold" },
  { id: "clashBold", label: "Clash Bold" },
  { id: "panchangMedium", label: "Panchang Medium" },
  { id: "panchangSemibold", label: "Panchang Semibold" },
];
export const TEXT_CASE_OPTIONS: {
  id: TextCase;
  label: string;
  title: string;
}[] = [
  { id: "upper", label: "AA", title: "UPPERCASE" },
  { id: "none", label: "Aa", title: "As typed" },
  { id: "lower", label: "aa", title: "lowercase" },
];
export function fontFamilyFor(
  font: RichTextFont | undefined,
  fallback: RichTextFont,
): string {
  return FONT_FAMILY[font ?? fallback];
}
export function textTransformFor(
  textCase: TextCase | undefined,
  defaultCase: TextCase,
): "uppercase" | "lowercase" | undefined {
  const resolved = textCase ?? defaultCase;
  if (resolved === "upper") return "uppercase";
  if (resolved === "lower") return "lowercase";
  return undefined;
}
