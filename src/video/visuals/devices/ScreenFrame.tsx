import React from "react";
import { colors } from "../../typography/tokens";
import { DEFAULT_SCREEN_ASPECT, screenFrameSize, type ScreenAspect } from "./screenFrameSize";

const RADIUS = 24;

/**
 * A screen with NO device chrome — just the media itself on a rounded, shadowed
 * card. This is the frame you want when the point is the content rather than
 * "this is a website": `BrowserMockup`'s tab strip and address bar are a claim
 * about where the footage came from, and on a recording of an app, a terminal,
 * or a plain photo that claim is simply false.
 *
 * Deliberately shares `BrowserMockup`'s width, shadow and border so the two are
 * interchangeable in a layout — switching frames should change what the media
 * says, not where it sits. Its sizes live in `screenFrameSize.ts` so the
 * auto-layout can measure this box without importing a component.
 */
export const ScreenFrame: React.FC<{
  children: React.ReactNode;
  aspect?: ScreenAspect;
  scale?: number;
}> = ({ children, aspect = DEFAULT_SCREEN_ASPECT, scale = 1 }) => {
  const { width, height } = screenFrameSize(aspect);

  return (
    <div
      style={{
        width: width * scale,
        height: height * scale,
        borderRadius: RADIUS,
        overflow: "hidden",
        backgroundColor: colors.background,
        boxShadow: "0 40px 80px rgba(0,0,0,0.45)",
        border: `1px solid ${colors.border}`,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
};
