export const colors = {
  background: "#171717",
  surface: "#222222",
  surfaceElevated: "#292929",

  textPrimary: "#FFFFFF",
  textSecondary: "#B8B8B8",

  accent: "#FF7024",
  accentSoft: "rgba(255, 112, 36, 0.15)",

  border: "rgba(255,255,255,0.10)",
} as const;

export const fontSizes = {
  hero: 136,
  headline: 104,
  title: 80,
  bodyLarge: 62,
  body: 52,
  label: 42,
} as const;

export const fontFamilies = {
  clashBold: "ClashDisplay-Bold",
  clashSemibold: "ClashDisplay-Semibold",
  clashMedium: "ClashDisplay-Medium",
  panchangSemibold: "Panchang-Semibold",
  panchangMedium: "Panchang-Medium",
  tanker: "Tanker-Regular",
} as const;

export const videoDefaults = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const safeArea = {
  left: 130,
  right: 130,
  top: 220,
  bottom: 500,
} as const;

/** Safe area expressed as % of the full 1080x1920 canvas — used to clamp
 * freeform text (Blocks) so it can never drift outside the TikTok-safe zone.
 * Visuals are exempt (see BlocksEditor/BlockPositionOverlay for why). */
export const safeAreaPercent = {
  left: (safeArea.left / videoDefaults.width) * 100,
  right: 100 - (safeArea.right / videoDefaults.width) * 100,
  top: (safeArea.top / videoDefaults.height) * 100,
  bottom: 100 - (safeArea.bottom / videoDefaults.height) * 100,
} as const;
