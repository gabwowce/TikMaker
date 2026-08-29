import React from "react";
import { Img } from "remotion";
import { colors } from "../typography/tokens";
import { assetUrl } from "../../utils/assetUrl";

export const PerspectiveDataGrid: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, backgroundColor: colors.background }}>
    <Img
      src={assetUrl("/assets/bg/PerspectiveDataGrid.png")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </div>
);
