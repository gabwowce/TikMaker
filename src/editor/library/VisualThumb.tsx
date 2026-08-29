import React from "react";
import { AbsoluteFill } from "remotion";
import { Thumbnail } from "@remotion/player";
import { VisualRenderer } from "../../video/visuals/VisualRenderer";
import { naturalVisualSize } from "../../video/layout/visualMetrics";
import { colors } from "../../video/typography/tokens";
import { editorColors } from "../theme";
import type { VisualConfig } from "../../schema/visual";

/** Square canvas the preview renders into — big enough that a full-size visual
 * (a browser mockup is ~820px wide) fits without the fit-scale below having to
 * shrink it into illegibility. */
const THUMB_CANVAS = 1100;
const THUMB_PADDING = 60;
/** Late enough that staggered reveals (checklist rows, terminal typing, a stat
 * counting up) have played out, so the still shows the visual's END state
 * rather than a half-built frame. */
const THUMB_FRAME = 110;

const ThumbComposition: React.FC<{ visual: VisualConfig }> = ({ visual }) => {
  const size = naturalVisualSize(visual);
  const box = THUMB_CANVAS - THUMB_PADDING * 2;
  const scale = Math.min(1, box / size.width, box / size.height);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div style={{ transform: `scale(${scale})` }}>
        <VisualRenderer visual={visual} />
      </div>
    </AbsoluteFill>
  );
};

/** A real, rendered still of a visual — the library used to list templates by
 * name only, which made picking one a guessing game. Rendering the ACTUAL
 * component (rather than hand-drawn icons) means the preview can't drift out of
 * sync with what the visual looks like in the video. */
export const VisualThumb: React.FC<{ visual: VisualConfig; height?: number }> = ({ visual, height = 84 }) => (
  <Thumbnail
    component={ThumbComposition}
    inputProps={{ visual }}
    compositionWidth={THUMB_CANVAS}
    compositionHeight={THUMB_CANVAS}
    frameToDisplay={THUMB_FRAME}
    durationInFrames={THUMB_FRAME + 1}
    fps={30}
    style={{ width: height, height, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}
    errorFallback={() => (
      <div
        style={{
          width: height,
          height,
          borderRadius: 6,
          background: editorColors.panel,
          border: `1px solid ${editorColors.border}`,
        }}
      />
    )}
  />
);
