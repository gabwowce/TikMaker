import React from "react";
import { colors } from "../typography/tokens";

/**
 * The two grid textures every background can be topped with — extracted from
 * `SoftGrid`/`DotGrid` (which now just render `GridOverlay` over a solid
 * fill) so a custom background can layer the SAME texture over any fill
 * instead of the grid only existing baked into those two fixed presets.
 */
export const GridOverlay: React.FC<{ variant: "lines" | "dots" }> = ({ variant }) =>
  variant === "lines" ? (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `linear-gradient(${colors.border} 1px, transparent 1px), linear-gradient(90deg, ${colors.border} 1px, transparent 1px)`,
        backgroundSize: "90px 90px",
        opacity: 0.5,
      }}
    />
  ) : (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.38) 2.5px, transparent 2.5px)`,
        backgroundSize: "48px 48px",
      }}
    />
  );
