import { z } from "zod";

// A style pack – how a channel's videos look (not what they say). For now only
// colours, fonts, the background grid and the brand mark: layout and motion are the same for all
// (src/video/stage/). Later pace and the character of the motion come here,
// and an AI can propose a pack from a channel's sample frames – in the same
// format. Ready packs: knowledge/shared/style-presets/<id>.json.

const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "colour – #RRGGBB");

// The fonts TikMaker has (src/video/typography/fonts.ts)
export const packFont = z.enum(["clash", "panchang"]);

// The background's grid (src/video/stage/Backdrop.tsx): lines, dots or none;
// `size` – one cell in px, `opacity` – how white the lines or dots are.
export const packGrid = z.object({
  kind: z.enum(["lines", "dots", "none"]),
  size: z.number().int().min(30).max(240),
  opacity: z.number().min(0).max(0.3),
});

export const stylePack = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colors: z.object({
    bg: color, // fonas
    bgGlow: color, // the lighter centre of the background
    surface: color, // cards, coins
    surfaceHi: color, // the lighter part of a card
    text: color, // key words, headings
    textSoft: color, // the other words
    accent: color, // ✦, the highlighted code line
    accent2: color, // a second icon or accent
  }),
  fonts: z.object({ caption: packFont }),
  // A pack written before the grid existed gets the old look: faint lines.
  grid: packGrid.default({ kind: "lines", size: 90, opacity: 0.035 }),
  brand: z.string().max(30), // the brand mark at the bottom, e.g. "tikmaker"
});

export type StylePack = z.infer<typeof stylePack>;
export type PackGrid = z.infer<typeof packGrid>;
