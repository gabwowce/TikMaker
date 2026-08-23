import React from "react";
import { colors } from "../typography/tokens";

export const Spotlight: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, backgroundColor: colors.background, overflow: "hidden" }}>
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "42%",
        width: 1400,
        height: 1400,
        marginLeft: -700,
        marginTop: -700,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 60%)`,
      }}
    />
  </div>
);
