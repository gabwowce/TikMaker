import { Thumbnail } from "@remotion/player";
import { AbsoluteFill } from "remotion";
import type { VisualConfig } from "../../schema/visual";
import { naturalVisualSize } from "../../video/layout/visualMetrics";
import { VisualRenderer } from "../../video/visuals/VisualRenderer";
const THUMB_CANVAS = 1100;
const THUMB_PADDING = 60;
const THUMB_FRAME = 110;
type ThumbCompositionProps = {
  visual: VisualConfig;
};
function ThumbComposition({ visual }: ThumbCompositionProps) {
  const size = naturalVisualSize(visual);
  const box = THUMB_CANVAS - THUMB_PADDING * 2;
  const scale = Math.min(1, box / size.width, box / size.height);
  return (
    <AbsoluteFill className="bg-[#171717] items-center justify-center overflow-hidden">
      <div style={{ transform: `scale(${scale})` }}>
        <VisualRenderer visual={visual} />
      </div>
    </AbsoluteFill>
  );
}
type VisualThumbProps = {
  visual: VisualConfig;
  height?: number;
};
export function VisualThumb({ visual, height = 84 }: VisualThumbProps) {
  return (
    <Thumbnail
      component={ThumbComposition}
      inputProps={{ visual }}
      compositionWidth={THUMB_CANVAS}
      compositionHeight={THUMB_CANVAS}
      frameToDisplay={THUMB_FRAME}
      durationInFrames={THUMB_FRAME + 1}
      fps={30}
      className={`rounded-[6px] overflow-hidden shrink-0`}
      style={{
        width: height,
        height,
      }}
      errorFallback={() => (
        <div
          className={`rounded-[6px] bg-editor-panel [border:1px_solid_#2c2c2c]`}
          style={{
            width: height,
            height,
          }}
        />
      )}
    />
  );
}
