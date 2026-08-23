import React from "react";
import { colors } from "../../typography/tokens";

type PhoneMockupProps = {
  children: React.ReactNode;
  scale?: number;
};

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ children, scale = 1 }) => (
  <div
    style={{
      width: 420 * scale,
      aspectRatio: "9 / 19.5",
      borderRadius: 48,
      padding: 14,
      backgroundColor: "#0b0b0b",
      boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
      border: `1px solid ${colors.border}`,
    }}
  >
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 34,
        overflow: "hidden",
        backgroundColor: colors.background,
      }}
    >
      {children}
    </div>
  </div>
);
