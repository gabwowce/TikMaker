import { interpolate, useCurrentFrame } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { TRANSFORM_ZOOM } from "../../layout/visualMetrics";
import { standardEasing } from "../../motion/easing";
import { VisualRenderer } from "../VisualRenderer";
type TransformProps = {
  from: VisualConfig;
  to: VisualConfig;
  holdFrames?: number;
};
const CROSSFADE_FRAMES = 20;
export function Transform({ from, to, holdFrames = 40 }: TransformProps) {
  const frame = useCurrentFrame();
  const fromOpacity = interpolate(
    frame,
    [holdFrames, holdFrames + CROSSFADE_FRAMES],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: standardEasing,
    },
  );
  const toOpacity = interpolate(
    frame,
    [holdFrames, holdFrames + CROSSFADE_FRAMES],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: standardEasing,
    },
  );
  const scale = interpolate(
    frame,
    [holdFrames, holdFrames + CROSSFADE_FRAMES],
    [1, TRANSFORM_ZOOM],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: standardEasing,
    },
  );

  return (
    <div className="grid place-items-center">
      <div
        className={`[grid-area:1_/_1] flex items-center justify-center ${fromOpacity === 0 ? "[visibility:hidden]" : "[visibility:visible]"}`}
        style={{
          opacity: fromOpacity,
        }}
      >
        <VisualRenderer visual={from} />
      </div>
      <div
        className={`[grid-area:1_/_1] flex items-center justify-center ${toOpacity === 0 ? "[visibility:hidden]" : "[visibility:visible]"}`}
        style={{
          opacity: toOpacity,
          transform: `scale(${scale})`,
        }}
      >
        <VisualRenderer visual={to} />
      </div>
    </div>
  );
}
