import { createContext, useContext, type ReactNode } from "react";
import midnightJson from "../../../knowledge/shared/style-presets/midnight.json";
import { stylePack, type StylePack } from "../../agent/stylePack";
import { fontFamilies } from "../typography/tokens";

// Stiliaus paketas scenai (src/agent/stylePack.ts). Visi „stage“ komponentai
// spalvas ir šriftą ima iš čia (usePack), todėl tas pats video kitu paketu
// atrodo kitaip, o išdėstymas ir judesys lieka tie patys.
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

// Spalvos ir šriftai vienoje vietoje; `border` – plona šviesi linija.
export function usePack() {
  const pack = useContext(PackContext);
  const font = fonts[pack.fonts.caption];
  return {
    ...pack.colors,
    border: "rgba(255,255,255,0.09)",
    fontStrong: font.strong,
    fontSemi: font.semi,
    fontRegular: font.regular,
    brand: pack.brand,
    // Platus šriftas (Panchang) užima ~25 % daugiau vietos – tekstas mažinamas,
    // kad eilutės lūžtų taip pat kaip su Clash.
    widthFactor: pack.fonts.caption === "panchang" ? 0.78 : 1,
  };
}
