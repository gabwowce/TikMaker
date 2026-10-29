import type { TalkingHeadPlacement } from "../../schema/visual";
import { safeArea, videoDefaults } from "../typography/tokens";

// A talking head (B5) is an ordinary layer — the clip at its own size, moved
// and scaled like an image — seen through a MASK: a fixed region of the frame
// (whole frame, top or bottom half, or a circle in a corner). Moving the clip
// never moves the mask. React-free like visualMetrics: auto-fit reads it while
// a project is normalized. Corner circles keep to the safe area, clear of
// TikTok's own UI.
const CIRCLE = 360;

export type MaskRect = { left: number; top: number; width: number; height: number };

export function talkingHeadMaskRect(placement: TalkingHeadPlacement): MaskRect {
  const { width, height } = videoDefaults;
  if (placement === "full") return { left: 0, top: 0, width, height };
  if (placement === "top") return { left: 0, top: 0, width, height: height / 2 };
  if (placement === "bottom")
    return { left: 0, top: height / 2, width, height: height / 2 };
  const right = placement.endsWith("r");
  const bottom = placement.startsWith("circle-b");
  return {
    left: right ? width - safeArea.right - CIRCLE : safeArea.left,
    top: bottom ? height - safeArea.bottom - CIRCLE : safeArea.top,
    width: CIRCLE,
    height: CIRCLE,
  };
}

// The mask as a CSS clip-path on a frame-sized wrapper; undefined = no mask.
export function talkingHeadClipPath(
  placement: TalkingHeadPlacement,
): string | undefined {
  if (placement === "full") return undefined;
  const { left, top, width, height } = talkingHeadMaskRect(placement);
  const right = videoDefaults.width - left - width;
  const bottom = videoDefaults.height - top - height;
  // In px: a % radius would resolve against the whole frame, not the mask.
  const round = placement.startsWith("circle") ? ` round ${width / 2}px` : "";
  return `inset(${top}px ${right}px ${bottom}px ${left}px${round})`;
}

// Where the clip starts: centred on its mask, just covering it.
export function talkingHeadCoverPose(
  placement: TalkingHeadPlacement,
  clip: { width: number; height: number },
): { x: number; y: number; scale: number } {
  const mask = talkingHeadMaskRect(placement);
  return {
    x: ((mask.left + mask.width / 2) / videoDefaults.width) * 100,
    y: ((mask.top + mask.height / 2) / videoDefaults.height) * 100,
    scale: Math.max(mask.width / clip.width, mask.height / clip.height),
  };
}
