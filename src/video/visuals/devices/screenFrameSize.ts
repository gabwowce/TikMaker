/** Shapes a chrome-less screen card can take. A recording is almost always
 * landscape, but the same frame is the right home for a phone screenshot or a
 * square crop, and forcing those into 16:10 letterboxed them inside their own
 * card. */
export type ScreenAspect = "16:9" | "16:10" | "4:3" | "1:1" | "9:16";

export const SCREEN_ASPECT_RATIOS: Record<ScreenAspect, number> = {
  "16:9": 16 / 9,
  "16:10": 16 / 10,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
};

export const DEFAULT_SCREEN_ASPECT: ScreenAspect = "16:10";

/** Matches `BrowserMockup`'s own content width, so swapping a recording between
 * the two frames doesn't resize it on screen. */
const FRAME_WIDTH = 860;
/** Portrait ratios would blow past the 1920 canvas at the landscape width, so
 * they're sized by HEIGHT instead and the width follows from the ratio. */
const PORTRAIT_HEIGHT = 940;

/**
 * Width/height a `ScreenFrame` of this aspect occupies at scale 1.
 *
 * A leaf module with no React in it, for the same reason `visualMetrics` is one
 * (see its TRANSFORM_ZOOM note): the auto-layout asks for this size while a
 * project is being normalized at import time, and reaching into the component
 * would drag the whole `VisualRenderer` graph into that path.
 */
export function screenFrameSize(aspect: ScreenAspect = DEFAULT_SCREEN_ASPECT): { width: number; height: number } {
  const ratio = SCREEN_ASPECT_RATIOS[aspect];
  if (ratio >= 1) return { width: FRAME_WIDTH, height: Math.round(FRAME_WIDTH / ratio) };
  return { width: Math.round(PORTRAIT_HEIGHT * ratio), height: PORTRAIT_HEIGHT };
}
