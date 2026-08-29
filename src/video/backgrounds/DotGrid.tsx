import React from "react";
import { colors } from "../typography/tokens";
import { GridOverlay } from "./GridOverlay";

export const DotGrid: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, backgroundColor: colors.background }}>
    <GridOverlay variant="dots" />
  </div>
);
