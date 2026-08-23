import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";

type StackProps = {
  items: VisualConfig[];
  direction?: "vertical" | "horizontal";
};

export const Stack: React.FC<StackProps> = ({ items, direction = "vertical" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vertical = direction === "vertical";

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {items.map((item, index) => {
        const delay = index * 8;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 200, stiffness: 200, mass: 0.7 },
        });
        const offset = interpolate(progress, [0, 1], [40, 0]);
        const opacity = interpolate(frame - delay, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={index}
            style={{
              marginTop: index === 0 ? 0 : vertical ? -28 : 0,
              marginLeft: index === 0 || vertical ? 0 : -28,
              transform: vertical
                ? `translateY(${offset}px) rotate(${(index % 2 === 0 ? -1 : 1) * 1.5}deg)`
                : `translateX(${offset}px) rotate(${(index % 2 === 0 ? -1 : 1) * 1.5}deg)`,
              opacity,
              zIndex: index,
            }}
          >
            <VisualRenderer visual={item} />
          </div>
        );
      })}
    </div>
  );
};
