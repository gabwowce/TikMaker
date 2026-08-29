/**
 * Shared type metrics for the code-like visuals (terminal, diff).
 *
 * Monospace at the body token (52px) only fits ~23 characters inside the
 * 820px window, so realistic lines like "Stack: Next.js, Postgres, Tailwind"
 * were silently clipped by the window's `overflow: hidden`. These constants
 * size the text so a normal line of code/CLI output fits instead, and
 * `MAX_LINE_CHARS` is the budget to write content against.
 */

export const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** Small enough that a realistic line fits, large enough to read on a phone. */
export const MONO_SIZE = 34;

export const WINDOW_WIDTH = 820;
export const WINDOW_PADDING_X = 30;

/** Monospace advance width is ~0.6em for this family. */
const CHAR_WIDTH = MONO_SIZE * 0.6;

/** Characters that fit on one line before the window clips them. Content
 * longer than this should be rewritten shorter, not shrunk further. */
export const MAX_LINE_CHARS = Math.floor(
  (WINDOW_WIDTH - WINDOW_PADDING_X * 2 - 34) / CHAR_WIDTH
);

export const LINE_HEIGHT = MONO_SIZE * 1.35;
