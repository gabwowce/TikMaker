import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";
import { standardEasing } from "../../motion/easing";
// Defined in visualMetrics (a leaf module) because auto-fit has to reserve
// room for this zoom while normalizing a project, before any component loads.
import { TRANSFORM_ZOOM } from "../../layout/visualMetrics";

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
  const scale = interpolate(frame, [holdFrames, holdFrames + CROSSFADE_FRAMES], [1, TRANSFORM_ZOOM], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });

  // Both states share one grid cell, so the wrapper sizes to the LARGER of the
  // two and neither is clipped by the other's box — absolutely positioning the
  // "to" state inside a container sized only by "from" cropped it whenever the
  // after-state was bigger.
  const cell: React.CSSProperties = {
    gridArea: "1 / 1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <div style={{ ...cell, opacity: fromOpacity, visibility: fromOpacity === 0 ? "hidden" : "visible" }}>
        <VisualRenderer visual={from} />
      </div>
      <div
        style={{
          ...cell,
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
