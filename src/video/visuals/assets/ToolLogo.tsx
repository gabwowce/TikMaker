import React from "react";
import { Img } from "remotion";
import { getTool } from "../../../registries/toolRegistry";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";

type ToolLogoProps = {
  tool: string;
  size?: number;
  showName?: boolean;
};

/**
 * Just the logo artwork, at the requested size — same as `PropAsset`. These
 * files already carry their own shape and padding, so the rounded plate this
 * used to draw behind them read as a second, unwanted container around a mark
 * that was already a tile.
 */
export const ToolLogo: React.FC<ToolLogoProps> = ({ tool, size = 220, showName }) => {
  const definition = getTool(tool);
  if (!definition) return null;

  const image = <Img src={definition.src} style={{ width: size, height: size, objectFit: "contain" }} />;
  if (!showName) return image;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {image}
      <div style={{ fontFamily: fontFamilies.clashMedium, fontSize: fontSizes.label, color: colors.textSecondary }}>
        {definition.name}
      </div>
    </div>
  );
};
