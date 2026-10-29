import type { CSSProperties } from "react";
import { AbsoluteFill } from "remotion";
import type { TalkingHeadPlacement } from "../../../schema/visual";
import { colors, safeArea, videoDefaults } from "../../typography/tokens";
import { ScreenRecording } from "./ScreenRecording";

// A face on camera (B5). Full-bleed like corner-props: it places itself
// against the whole frame, so the layer's x/y/scale do nothing here. Corner
// circles keep to the safe area, clear of TikTok's own UI.
const CIRCLE = 360;
const RING = 8;

function boxFor(placement: TalkingHeadPlacement): CSSProperties {
  const { width, height } = videoDefaults;
  if (placement === "full") return { left: 0, top: 0, width, height };
  if (placement === "top")
    return { left: 0, top: 0, width, height: height / 2 };
  if (placement === "bottom")
    return { left: 0, top: height / 2, width, height: height / 2 };
  const right = placement.endsWith("r");
  const bottom = placement.startsWith("circle-b");
  return {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: "50%",
    border: `${RING}px solid ${colors.accent}`,
    left: right ? undefined : safeArea.left,
    right: right ? safeArea.right : undefined,
    top: bottom ? undefined : safeArea.top,
    bottom: bottom ? safeArea.bottom : undefined,
  };
}

type TalkingHeadProps = {
  src: string;
  placement: TalkingHeadPlacement;
  startFrom?: number;
  endAt?: number;
  playbackRate?: number;
};
export function TalkingHead({ placement, ...clip }: TalkingHeadProps) {
  return (
    <AbsoluteFill>
      <div className="absolute overflow-hidden" style={boxFor(placement)}>
        <ScreenRecording {...clip} fit="cover" />
      </div>
    </AbsoluteFill>
  );
}
