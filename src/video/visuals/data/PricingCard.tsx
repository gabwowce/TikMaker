import React from "react";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";

type PricingCardProps = {
  title: string;
  price: string;
  period?: string;
  features?: string[];
  highlight?: boolean;
};

export const PricingCard: React.FC<PricingCardProps> = ({ title, price, period, features, highlight }) => (
  <div
    style={{
      width: 560,
      borderRadius: 28,
      padding: 40,
      backgroundColor: highlight ? colors.accentSoft : colors.surface,
      border: `1px solid ${highlight ? colors.accent : colors.border}`,
      display: "flex",
      flexDirection: "column",
      gap: 24,
      boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
    }}
  >
    <div
      style={{
        fontFamily: fontFamilies.clashMedium,
        fontSize: fontSizes.label,
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 2,
      }}
    >
      {title}
    </div>

    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <div style={{ fontFamily: fontFamilies.clashBold, fontSize: fontSizes.title, color: colors.textPrimary }}>
        {price}
      </div>
      {period ? (
        <div style={{ fontFamily: fontFamilies.clashMedium, fontSize: fontSizes.label, color: colors.textSecondary }}>
          {period}
        </div>
      ) : null}
    </div>

    {features && features.length > 0 ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {features.map((feature, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ color: colors.accent, fontSize: 24 }}>✓</div>
            <div style={{ fontFamily: fontFamilies.clashMedium, fontSize: fontSizes.body, color: colors.textPrimary }}>
              {feature}
            </div>
          </div>
        ))}
      </div>
    ) : null}
  </div>
);
