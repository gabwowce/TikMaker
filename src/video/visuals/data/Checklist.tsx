import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";

type ChecklistProps = {
  items: { label: string; done?: boolean }[];
  font?: "tanker" | "clash";
  size?: "hero" | "headline" | "title" | "bodyLarge" | "body" | "label";
  /** frames between one item revealing and the next — matches the pace of a
   * voiceover reading items one at a time */
  stagger?: number;
};

export const Checklist: React.FC<ChecklistProps> = ({ items, font, size = "bodyLarge", stagger = 6 }) => {
  const frame = useCurrentFrame();
  const family = font === "tanker" ? fontFamilies.tanker : fontFamilies.clashMedium;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 640 }}>
      {items.map((item, index) => {
        const delay = index * stagger;
        const opacity = interpolate(frame - delay, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const translateX = interpolate(frame - delay, [0, 12], [-30, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              opacity,
              transform: `translateX(${translateX}px)`,
              padding: "18px 24px",
              borderRadius: 16,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: item.done === false ? "transparent" : colors.accentSoft,
                border: `2px solid ${item.done === false ? colors.border : colors.accent}`,
                color: colors.accent,
                fontSize: 20,
              }}
            >
              {item.done === false ? "" : "✓"}
            </div>
            <div
              style={{
                fontFamily: family,
                fontSize: fontSizes[size],
                color: colors.textPrimary,
                textTransform: font === "tanker" ? "uppercase" : undefined,
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};
