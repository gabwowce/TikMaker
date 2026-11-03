import { z } from "zod";

// Stiliaus paketas – kaip kanalo video atrodo (ne ką jie sako). Kol kas tik
// spalvos, šriftai ir ženklas: išdėstymas ir judesys visiems vienodi
// (src/video/stage/). Vėliau čia atsiras tempas ir judesio charakteris, o
// paketą iš kanalo pavyzdinių kadrų galės pasiūlyti DI – tuo pačiu formatu.
// Paruošti paketai: knowledge/shared/style-presets/<id>.json.

const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "spalva – #RRGGBB");

// Šriftai, kuriuos TikMaker turi (src/video/typography/fonts.ts)
export const packFont = z.enum(["clash", "panchang"]);

export const stylePack = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colors: z.object({
    bg: color, // fonas
    bgGlow: color, // šviesesnis fono centras
    surface: color, // kortelės, monetos
    surfaceHi: color, // šviesesnė kortelės dalis
    text: color, // kertiniai žodžiai, antraštės
    textSoft: color, // kiti žodžiai
    accent: color, // ✦, paryškinta kodo eilutė, fono ženklai
    accent2: color, // antra ikona ar akcentas
  }),
  fonts: z.object({ caption: packFont }),
  brand: z.string().max(30), // ženklas apačioje, pvz. "tikmaker"
});

export type StylePack = z.infer<typeof stylePack>;
