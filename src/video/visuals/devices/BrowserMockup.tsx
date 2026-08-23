import React from "react";
import { colors } from "../../typography/tokens";

type BrowserMockupProps = {
  title?: string;
  url?: string;
  children: React.ReactNode;
  scale?: number;
};

export const BrowserMockup: React.FC<BrowserMockupProps> = ({ url, children, scale = 1 }) => (
  <div
    style={{
      width: 860 * scale,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.surface,
      boxShadow: "0 40px 80px rgba(0,0,0,0.45)",
      border: `1px solid ${colors.border}`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "18px 24px",
        backgroundColor: colors.surfaceElevated,
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#5f5f5f" }} />
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#5f5f5f" }} />
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#5f5f5f" }} />
      </div>
      {url ? (
        <div
          style={{
            flex: 1,
            marginLeft: 12,
            padding: "8px 18px",
            borderRadius: 999,
            backgroundColor: colors.background,
            color: colors.textSecondary,
            fontSize: 24,
            fontFamily: "ClashDisplay-Medium",
          }}
        >
          {url}
        </div>
      ) : null}
    </div>
    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", backgroundColor: colors.background }}>
      {children}
    </div>
  </div>
);
