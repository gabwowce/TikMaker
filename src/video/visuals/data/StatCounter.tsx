import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { standardEasing } from "../../motion/easing";

type StatCounterProps = {
  from: number;
  to: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
};

const COUNT_FRAMES = 50;

export const StatCounter: React.FC<StatCounterProps> = ({ from, to, label, prefix = "", suffix = "", decimals = 0 }) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [0, COUNT_FRAMES], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        style={{
          fontFamily: fontFamilies.clashBold,
          fontSize: fontSizes.hero,
          color: colors.textPrimary,
          lineHeight: 1,
        }}
      >
        {prefix}
        {formatted}
        {suffix}
      </div>
      {label ? (
        <div
          style={{
            fontFamily: fontFamilies.clashMedium,
            fontSize: fontSizes.label,
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
