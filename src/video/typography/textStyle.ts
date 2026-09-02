import { fontFamilies } from "./tokens";
import type { RichTextFont, TextCase } from "../../schema/scene";

/**
 * Turning a text element's `font`/`textCase` fields into CSS, in ONE place.
 *
 * `RichHeadline` and `BlockLayer` each used to answer this for themselves, and
 * they answered differently: the headline ignored `font` entirely and always
 * drew Tanker in uppercase, while a block mapped `"clash"` to Clash Medium and
 * uppercased only when it was Tanker. So the same two fields on two elements
 * meant two different things, and one of them meant nothing at all.
 *
 * A React-free leaf module for the same reason `visualMetrics` is one: it is
 * read while a project is being measured, before any component mounts.
 */

const FONT_FAMILY: Record<RichTextFont, string> = {
  tanker: fontFamilies.tanker,
  // The original loose name. Semibold is the weight the headline system was
  // designed around, so that is what it resolves to.
  clash: fontFamilies.clashSemibold,
  clashMedium: fontFamilies.clashMedium,
  clashSemibold: fontFamilies.clashSemibold,
  clashBold: fontFamilies.clashBold,
  panchangMedium: fontFamilies.panchangMedium,
  panchangSemibold: fontFamilies.panchangSemibold,
};

/** What the picker offers, in the order it offers it. */
export const TEXT_FONT_OPTIONS: { id: RichTextFont; label: string }[] = [
  { id: "tanker", label: "Tanker" },
  { id: "clashMedium", label: "Clash Medium" },
  { id: "clashSemibold", label: "Clash Semibold" },
  { id: "clashBold", label: "Clash Bold" },
  { id: "panchangMedium", label: "Panchang Medium" },
  { id: "panchangSemibold", label: "Panchang Semibold" },
];

export const TEXT_CASE_OPTIONS: { id: TextCase; label: string; title: string }[] = [
  { id: "upper", label: "AA", title: "DIDŽIOSIOMIS" },
  { id: "none", label: "Aa", title: "Kaip parašyta" },
  { id: "lower", label: "aa", title: "mažosiomis" },
];

export function fontFamilyFor(font: RichTextFont | undefined, fallback: RichTextFont): string {
  return FONT_FAMILY[font ?? fallback];
}

/**
 * `defaultCase` carries each element's historical behaviour, so adding the
 * field changed nothing that was already authored: a headline line has always
 * been uppercase, and a block only when it was set in Tanker.
 */
export function textTransformFor(
  textCase: TextCase | undefined,
  defaultCase: TextCase
): "uppercase" | "lowercase" | undefined {
  const resolved = textCase ?? defaultCase;
  if (resolved === "upper") return "uppercase";
  if (resolved === "lower") return "lowercase";
  return undefined;
}
