import React from "react";

export type SafeZonePlatform = "all" | "tiktok" | "instagram" | "youtube";

type SafeZonePreset = {
  label: string;
  color: string;
  /** Safe-content insets on the original 1080 x 1920 canvas. */
  safe: { top: number; right: number; bottom: number; left: number };
};

export const safeZonePresets: Record<SafeZonePlatform, SafeZonePreset> = {
  all: {
    label: "Visos platformos",
    color: "#a8ff78",
    safe: { top: 250, right: 180, bottom: 500, left: 130 },
  },
  tiktok: {
    label: "TikTok",
    color: "#d7ff69",
    // Matches the supplied 1080 x 1920 TikTok guide mockup.
    safe: { top: 108, right: 120, bottom: 320, left: 60 },
  },
  instagram: {
    label: "Instagram Reels",
    color: "#ff78bd",
    safe: { top: 220, right: 160, bottom: 420, left: 64 },
  },
  youtube: {
    label: "YouTube Shorts",
    color: "#ff6b61",
    safe: { top: 160, right: 180, bottom: 380, left: 64 },
  },
};

const pctX = (pixels: number) => (pixels / 1080) * 100;
const pctY = (pixels: number) => (pixels / 1920) * 100;

export const SafeZoneOverlay: React.FC<{ platform: SafeZonePlatform }> = ({ platform }) => {
  const preset = safeZonePresets[platform];
  const top = pctY(preset.safe.top);
  const right = pctX(preset.safe.right);
  const bottom = pctY(preset.safe.bottom);
  const left = pctX(preset.safe.left);
  const safeBottom = 100 - bottom;
  const safeRight = 100 - right;
  const railIcons = ["●", "♥", "●", "↗", "♫"];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 8,
        pointerEvents: "none",
        overflow: "hidden",
        containerType: "inline-size",
        border: `2px solid ${preset.color}`,
        boxSizing: "border-box",
        background: "rgba(191, 234, 69, .08)",
      }}
    >
      <div style={{ position: "absolute", inset: `0 0 auto 0`, height: `${top}%`, background: "rgba(17,34,47,.28)" }} />
      <div style={{ position: "absolute", inset: `auto 0 0 0`, height: `${bottom}%`, background: "rgba(17,34,47,.34)" }} />
      <div style={{ position: "absolute", top: `${top}%`, bottom: `${bottom}%`, left: 0, width: `${left}%`, background: "rgba(17,34,47,.25)" }} />
      <div style={{ position: "absolute", top: `${top}%`, bottom: `${bottom}%`, right: 0, width: `${right}%`, background: "rgba(17,34,47,.32)" }} />

      <div
        style={{
          position: "absolute",
          top: `${top}%`,
          right: `${right}%`,
          bottom: `${bottom}%`,
          left: `${left}%`,
          display: "grid",
          placeItems: "center",
          border: `2px solid ${preset.color}`,
          background: "rgba(223,255,177,.13)",
          boxShadow: "inset 0 0 0 1px rgba(12,42,58,.65)",
        }}
      />

      <div style={{ position: "absolute", right: "2.7%", top: "35%", display: "grid", gap: "2.2cqw" }}>
        {railIcons.map((icon, index) => (
          <span key={index} style={{ width: "9cqw", height: "9cqw", borderRadius: "50%", display: "grid", placeItems: "center", color: "white", background: index === 0 ? "rgba(255,255,255,.88)" : "rgba(20,48,64,.2)", border: "2px solid white", boxShadow: "0 2px 5px rgba(0,0,0,.35)", fontSize: "4.5cqw" }}>
            {index === 0 ? null : icon}
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", left: "6%", right: "6%", bottom: "5%", borderTop: "1px solid rgba(255,255,255,.8)" }} />

      <div style={{ position: "absolute", left: "74%", top: 0, height: `${top}%`, borderLeft: "2px solid #17364b" }} />

      <div style={{ position: "absolute", left: 0, top: `${Math.max(top + 5, 16)}%`, width: `${left}%`, borderTop: "2px solid #17364b" }} />

      <div style={{ position: "absolute", left: `${safeRight}%`, right: 0, top: `${Math.max(top + 5, 16)}%`, borderTop: "2px solid #17364b" }} />

      <div style={{ position: "absolute", left: "66%", top: `${safeBottom}%`, bottom: 0, borderLeft: "2px solid #17364b" }} />

      <div style={{ position: "absolute", left: `${safeRight}%`, top: `${top}%`, height: `${safeBottom - top}%`, borderLeft: "2px solid #17364b" }} />
    </div>
  );
};
