import { createContext, useContext, type ReactNode } from "react";
import midnightJson from "../../../knowledge/shared/style-presets/midnight.json";
import { stylePack, type StylePack } from "../../agent/stylePack";
import { fontFamilies } from "../typography/tokens";

// The style pack for a scene (src/agent/stylePack.ts). Every "stage" component
// takes its colours and font from here (usePack), so the same video in another
// pack looks different while the layout and motion stay the same.
export const defaultPack: StylePack = stylePack.parse(midnightJson);

const PackContext = createContext<StylePack>(defaultPack);

export function PackProvider({
  pack,
  children,
}: {
  pack?: StylePack;
  children: ReactNode;
}) {
  return (
    <PackContext.Provider value={pack ?? defaultPack}>
      {children}
    </PackContext.Provider>
  );
}

const fonts = {
  clash: {
    strong: fontFamilies.clashBold,
    semi: fontFamilies.clashSemibold,
    regular: fontFamilies.clashMedium,
  },
  panchang: {
    strong: fontFamilies.panchangSemibold,
    semi: fontFamilies.panchangSemibold,
    regular: fontFamilies.panchangMedium,
  },
};

const UI_FONT =
  '"Inter", "Segoe UI", -apple-system, "Helvetica Neue", Arial, sans-serif';

// Colours and fonts in one place; `border` – a thin light line.
export function usePack() {
  const pack = useContext(PackContext);
  const font = fonts[pack.fonts.caption];
  return {
    ...pack.colors,
    border: "rgba(255,255,255,0.09)",
    fontStrong: font.strong,
    fontSemi: font.semi,
    fontRegular: font.regular,
    // A plain app font for what imitates an app's own text (chat bubbles,
    // comments): a display face there reads as a poster, not a message.
    // Inter when it is in fonts/, otherwise the system's UI font.
    fontUi: UI_FONT,
    brand: pack.brand,
    grid: pack.grid,
    // A wide font (Panchang) takes ~25 % more room – the text is made smaller
    // so the lines break the same as with Clash.
    widthFactor: pack.fonts.caption === "panchang" ? 0.78 : 1,
  };
}
