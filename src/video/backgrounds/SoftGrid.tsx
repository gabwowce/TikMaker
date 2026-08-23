import React from "react";
import { colors } from "../typography/tokens";

export const SoftGrid: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, backgroundColor: colors.background }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `linear-gradient(${colors.border} 1px, transparent 1px), linear-gradient(90deg, ${colors.border} 1px, transparent 1px)`,
        backgroundSize: "90px 90px",
        opacity: 0.5,
      }}
    />
  </div>
);
