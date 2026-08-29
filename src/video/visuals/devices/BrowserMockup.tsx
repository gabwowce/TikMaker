import React from "react";
import { colors } from "../../typography/tokens";

type BrowserMockupProps = {
  title?: string;
  url?: string;
  /** Extra tab labels shown to the right of the active one. */
  tabs?: string[];
  children: React.ReactNode;
  scale?: number;
};

/** The real macOS traffic lights — a screenshot of a browser reads as fake the
 * moment these are grey, which is the single most recognisable detail of the
 * whole frame. */
const TRAFFIC_LIGHTS = ["#ff5f57", "#febc2e", "#28c840"];

const CHROME_BG = "#2b2b2e";
const TAB_ACTIVE_BG = "#3c3c40";
const CHROME_TEXT = "#c9c9cf";
const CHROME_DIM = "#8a8a92";

const Tab: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      maxWidth: 260,
      padding: "10px 18px",
      borderRadius: "10px 10px 0 0",
      background: active ? TAB_ACTIVE_BG : "transparent",
      color: active ? CHROME_TEXT : CHROME_DIM,
      fontFamily: "ClashDisplay-Medium",
      fontSize: 22,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        flexShrink: 0,
        background: active ? colors.accent : CHROME_DIM,
      }}
    />
    {label}
  </div>
);

/**
 * A browser window that looks like an actual browser: coloured traffic lights,
 * a tab strip with a favicon and an active tab, and a real address bar with a
 * lock. The old version was three grey circles and an optional pill, which read
 * as a placeholder rather than as "this is a screenshot of a website".
 */
export const BrowserMockup: React.FC<BrowserMockupProps> = ({ url, title, tabs, children, scale = 1 }) => {
  const activeTab = title ?? (url ? url.replace(/^https?:\/\//, "").split("/")[0] : "New Tab");

  return (
    <div
      style={{
        width: 860 * scale,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: colors.surface,
        boxShadow: "0 40px 80px rgba(0,0,0,0.45)",
        border: `1px solid ${colors.border}`,
      }}
    >
      <div style={{ backgroundColor: CHROME_BG, paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, padding: "0 20px" }}>
          <div style={{ display: "flex", gap: 9, paddingBottom: 12, marginRight: 10 }}>
            {TRAFFIC_LIGHTS.map((color) => (
              <div key={color} style={{ width: 15, height: 15, borderRadius: "50%", background: color }} />
            ))}
          </div>
          <Tab label={activeTab} active />
          {(tabs ?? []).slice(0, 2).map((label, index) => (
            <Tab key={index} label={label} />
          ))}
          <div style={{ color: CHROME_DIM, fontSize: 26, paddingBottom: 10, paddingLeft: 6 }}>+</div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 20px",
            backgroundColor: TAB_ACTIVE_BG,
          }}
        >
          <span style={{ color: CHROME_DIM, fontSize: 24, fontFamily: "ClashDisplay-Medium" }}>‹</span>
          <span style={{ color: CHROME_DIM, fontSize: 24, fontFamily: "ClashDisplay-Medium" }}>›</span>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 18px",
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.35)",
              color: CHROME_TEXT,
              fontSize: 22,
              fontFamily: "ClashDisplay-Medium",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <span style={{ color: CHROME_DIM, fontSize: 18 }}>🔒</span>
            {url ?? "yourapp.com"}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 10", backgroundColor: colors.background }}>
        {children}
      </div>
    </div>
  );
};
