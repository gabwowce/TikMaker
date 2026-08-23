import React from "react";
import { Img } from "remotion";
import { getTool } from "../../../registries/toolRegistry";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";

type ToolLogoProps = {
  tool: string;
  size?: number;
  showName?: boolean;
};

export const ToolLogo: React.FC<ToolLogoProps> = ({ tool, size = 220, showName }) => {
  const definition = getTool(tool);

  if (!definition) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 32,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 32,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: size * 0.22,
        }}
      >
        <Img src={definition.src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
      {showName ? (
        <div style={{ fontFamily: fontFamilies.clashMedium, fontSize: fontSizes.label, color: colors.textSecondary }}>
          {definition.name}
        </div>
      ) : null}
    </div>
  );
};
