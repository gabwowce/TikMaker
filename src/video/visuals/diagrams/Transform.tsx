import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";
import { standardEasing } from "../../motion/easing";

type TransformProps = {
  from: VisualConfig;
  to: VisualConfig;
  holdFrames?: number;
};

const CROSSFADE_FRAMES = 20;

export const Transform: React.FC<TransformProps> = ({ from, to, holdFrames = 40 }) => {
  const frame = useCurrentFrame();

  const fromOpacity = interpolate(frame, [holdFrames, holdFrames + CROSSFADE_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const toOpacity = interpolate(frame, [holdFrames, holdFrames + CROSSFADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const scale = interpolate(frame, [holdFrames, holdFrames + CROSSFADE_FRAMES], [1, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: fromOpacity, visibility: fromOpacity === 0 ? "hidden" : "visible" }}>
        <VisualRenderer visual={from} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: toOpacity,
          visibility: toOpacity === 0 ? "hidden" : "visible",
          transform: `scale(${scale})`,
        }}
      >
        <VisualRenderer visual={to} />
      </div>
    </div>
  );
};
