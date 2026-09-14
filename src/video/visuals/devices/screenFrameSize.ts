export type ScreenAspect = "16:9" | "16:10" | "4:3" | "1:1" | "9:16";
export const SCREEN_ASPECT_RATIOS: Record<ScreenAspect, number> = {
  "16:9": 16 / 9,
  "16:10": 16 / 10,
  "4:3": 4 / 3,
  "1:1": 1,
  "9:16": 9 / 16,
};
export const DEFAULT_SCREEN_ASPECT: ScreenAspect = "16:10";
const FRAME_WIDTH = 860;
const PORTRAIT_HEIGHT = 940;
export function screenFrameSize(aspect: ScreenAspect = DEFAULT_SCREEN_ASPECT): {
  width: number;
  height: number;
} {
  const ratio = SCREEN_ASPECT_RATIOS[aspect];
  if (ratio >= 1)
    return { width: FRAME_WIDTH, height: Math.round(FRAME_WIDTH / ratio) };
  return {
    width: Math.round(PORTRAIT_HEIGHT * ratio),
    height: PORTRAIT_HEIGHT,
  };
}
