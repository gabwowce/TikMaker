import React from "react";
import { safeArea } from "./tokens";
import type { CSSProperties } from "react";

export const safeAreaPadding: CSSProperties = {
  paddingLeft: safeArea.left,
  paddingRight: safeArea.right,
  paddingTop: safeArea.top,
  paddingBottom: safeArea.bottom,
};

export const SafeArea: React.FC<{ debug?: boolean }> = ({ debug }) => {
  if (!debug) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        top: safeArea.top,
        left: safeArea.left,
        right: safeArea.right,
        bottom: safeArea.bottom,
        border: "2px dashed rgba(255,112,36,0.6)",
        pointerEvents: "none",
      }}
    />
  );
};
