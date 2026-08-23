import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { standardEasing } from "../../motion/easing";

type AppMockupProps = {
  appTitle: string;
  kind: "list" | "stat" | "chart";
  items?: string[];
  stat?: { value: string; label: string };
  chartValues?: number[];
};

const CARD_WIDTH = 640;

const AppFrame: React.FC<{ appTitle: string; children: React.ReactNode }> = ({ appTitle, children }) => (
  <div
    style={{
      width: CARD_WIDTH,
      borderRadius: 28,
      overflow: "hidden",
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
    }}
  >
    <div
      style={{
        padding: "22px 28px",
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: colors.accent }} />
      <div style={{ fontFamily: fontFamilies.clashSemibold, fontSize: fontSizes.body, color: colors.textPrimary }}>
        {appTitle}
      </div>
    </div>
    <div style={{ padding: 28 }}>{children}</div>
  </div>
);

const AppMockupList: React.FC<{ items: string[] }> = ({ items }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    {items.map((item, index) => (
      <div
        key={index}
        style={{
          padding: "16px 20px",
          borderRadius: 14,
          backgroundColor: colors.surfaceElevated,
          fontFamily: fontFamilies.clashMedium,
          fontSize: fontSizes.body,
          color: colors.textPrimary,
        }}
      >
        {item}
      </div>
    ))}
  </div>
);

const AppMockupStat: React.FC<{ stat: { value: string; label: string } }> = ({ stat }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
    <div style={{ fontFamily: fontFamilies.clashBold, fontSize: fontSizes.title, color: colors.textPrimary }}>
      {stat.value}
    </div>
    <div
      style={{
        fontFamily: fontFamilies.clashMedium,
        fontSize: fontSizes.label,
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 2,
      }}
    >
      {stat.label}
    </div>
  </div>
);

const AppMockupChart: React.FC<{ values: number[] }> = ({ values }) => {
  const frame = useCurrentFrame();
  const max = Math.max(...values, 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 220 }}>
      {values.map((v, index) => {
        const targetHeight = (v / max) * 100;
        const height = interpolate(frame - index * 4, [0, 24], [0, targetHeight], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: standardEasing,
        });
        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${height}%`,
              borderRadius: 8,
              backgroundColor: colors.accent,
            }}
          />
        );
      })}
    </div>
  );
};

export const AppMockup: React.FC<AppMockupProps> = ({ appTitle, kind, items, stat, chartValues }) => (
  <AppFrame appTitle={appTitle}>
    {kind === "list" ? <AppMockupList items={items ?? []} /> : null}
    {kind === "stat" && stat ? <AppMockupStat stat={stat} /> : null}
    {kind === "chart" ? <AppMockupChart values={chartValues ?? []} /> : null}
  </AppFrame>
);
