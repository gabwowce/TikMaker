import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors } from "../typography/tokens";

export const OrangeGlow: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(Math.sin(frame / 90), [-1, 1], [-40, 40]);

  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: colors.background, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: `calc(50% + ${drift}px)`,
          top: "30%",
          width: 900,
          height: 900,
          marginLeft: -450,
          marginTop: -450,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.accentSoft} 0%, rgba(255,112,36,0) 70%)`,
        }}
      />
    </div>
  );
};
