// Text that must stay on one line (a list row, a big number) shrinks to fit
// its width instead of running off the frame. A leaf module: every stage
// component that needs it imports it from here.

// The largest font size, at most `base`, at which the longest of `texts`
// fits in `width` px on one line. Estimated from the character count (a
// glyph of the caption fonts averages ~0.58 of the font size, a little on the
// wide side so the estimate errs towards fitting) rather than measured, so it
// is the same in the editor and in a render. A heavier weight is wider:
// pass its own `glyphWidth` (the bold display numbers run ~0.7).
export function fitFontSize(
  texts: string[],
  base: number,
  width: number,
  glyphWidth = GLYPH_WIDTH,
) {
  const longest = Math.max(1, ...texts.map((text) => text.length));
  return Math.min(base, width / (longest * glyphWidth));
}
const GLYPH_WIDTH = 0.58;
export const BOLD_GLYPH_WIDTH = 0.7;
