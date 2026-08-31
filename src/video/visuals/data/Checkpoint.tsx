import React from "react";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";

type Props = {
  label: string;
  detail?: string;
  state?: "done" | "pending" | "warning";
  variant?: "card" | "compact" | "pill" | "outline";
};

export const Checkpoint: React.FC<Props> = ({ label, detail, state = "done", variant = "card" }) => {
  const accent = state === "warning" ? "#ff9d3d" : state === "pending" ? colors.textSecondary : colors.accent;
  const symbol = state === "done" ? "✓" : state === "warning" ? "!" : "";
  const compact = variant === "compact" || variant === "pill";
  const pill = variant === "pill";
  return (
    <div style={{
      width: pill ? "max-content" : compact ? 520 : 680,
      minWidth: pill ? 280 : undefined,
      display: "flex",
      alignItems: "center",
      gap: compact ? 14 : 20,
      padding: pill ? "12px 22px" : compact ? "14px 20px" : "20px 26px",
      borderRadius: pill ? 999 : variant === "outline" ? 12 : 16,
      background: variant === "outline" ? "transparent" : colors.surface,
      border: `2px solid ${variant === "outline" ? accent : colors.border}`,
      boxShadow: variant === "card" ? "0 16px 38px rgba(0,0,0,.22)" : undefined,
      boxSizing: "border-box",
    }}>
      <div style={{ width: compact ? 28 : 36, height: compact ? 28 : 36, flexShrink: 0, borderRadius: "50%", border: `2px solid ${accent}`, background: state === "done" ? `${accent}22` : "transparent", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontFamilies.clashMedium, fontWeight: 700, fontSize: compact ? 15 : 19 }}>{symbol}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: fontFamilies.tanker, fontSize: compact ? fontSizes.body : fontSizes.bodyLarge, color: colors.textPrimary, textTransform: "uppercase", lineHeight: 1 }}>{label}</div>
        {detail && !pill ? <div style={{ fontFamily: fontFamilies.clashMedium, fontSize: fontSizes.label, color: colors.textSecondary, marginTop: 6 }}>{detail}</div> : null}
      </div>
    </div>
  );
};
