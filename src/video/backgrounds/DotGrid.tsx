import React from "react";
import { colors } from "../typography/tokens";

export const DotGrid: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundColor: colors.background,
      backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.38) 2.5px, transparent 2.5px)`,
      backgroundSize: "48px 48px",
    }}
  />
);
