export const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";
export const MONO_SIZE = 34;
export const WINDOW_WIDTH = 820;
export const WINDOW_PADDING_X = 30;
const CHAR_WIDTH = MONO_SIZE * 0.6;
export const MAX_LINE_CHARS = Math.floor(
  (WINDOW_WIDTH - WINDOW_PADDING_X * 2 - 34) / CHAR_WIDTH,
);
export const LINE_HEIGHT = MONO_SIZE * 1.35;
