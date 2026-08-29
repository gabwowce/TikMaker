import React from "react";
import type { CustomBackground as CustomBackgroundConfig } from "../../schema/scene";
import { backgroundFillStyle } from "./customBackgroundStyle";
import { GridOverlay } from "./GridOverlay";

export const CustomBackground: React.FC<{ config: CustomBackgroundConfig }> = ({ config }) => (
  <div style={{ position: "absolute", inset: 0, ...backgroundFillStyle(config.fill) }}>
    {config.grid && config.grid !== "none" ? <GridOverlay variant={config.grid} /> : null}
  </div>
);
