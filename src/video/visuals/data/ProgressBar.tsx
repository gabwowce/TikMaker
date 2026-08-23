import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { standardEasing } from "../../motion/easing";

type ProgressBarProps = {
  value: number;
  max: number;
  label?: string;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, label }) => {
  const frame = useCurrentFrame();
  const targetRatio = Math.min(1, Math.max(0, value / max));
  const ratio = interpolate(frame, [0, 40], [0, targetRatio], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 640 }}>
      {label ? (
        <div style={{ fontFamily: fontFamilies.clashMedium, fontSize: fontSizes.label, color: colors.textSecondary }}>
          {label}
        </div>
      ) : null}
      <div
        style={{
          height: 28,
          borderRadius: 999,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${ratio * 100}%`,
            borderRadius: 999,
            backgroundColor: colors.accent,
          }}
        />
      </div>
    </div>
  );
};
