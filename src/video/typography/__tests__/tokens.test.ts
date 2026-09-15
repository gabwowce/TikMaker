import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colors, fontSizes } from "../tokens";

// Tokenai gyvena dviejose vietose: tokens.ts (inline stiliams ir
// skaičiavimams) ir styles.css @theme (Tailwind klasėms). Šis testas yra
// vienintelis dalykas, neleidžiantis joms nukrypti.
const css = fs.readFileSync(
  path.resolve(__dirname, "../../../styles.css"),
  "utf-8",
);
function themeValue(name: string): string | undefined {
  return css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
}

describe("brand tokens", () => {
  const colorPairs: [string, string][] = [
    ["color-brand-bg", colors.background],
    ["color-brand-surface", colors.surface],
    ["color-brand-surface-raised", colors.surfaceElevated],
    ["color-brand-text", colors.textPrimary],
    ["color-brand-muted", colors.textSecondary],
    ["color-brand-accent", colors.accent],
  ];
  it.each(colorPairs)("%s matches tokens.ts", (name, value) => {
    expect(themeValue(name)?.toLowerCase()).toBe(value.toLowerCase());
  });

  const sizePairs: [string, number][] = [
    ["text-hero", fontSizes.hero],
    ["text-headline", fontSizes.headline],
    ["text-title", fontSizes.title],
    ["text-body-large", fontSizes.bodyLarge],
    ["text-body", fontSizes.body],
    ["text-label", fontSizes.label],
  ];
  it.each(sizePairs)("%s matches tokens.ts", (name, value) => {
    expect(themeValue(name)).toBe(`${value}px`);
  });

  it("no component hardcodes a token value in a utility class", () => {
    const offenders: string[] = [];
    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".tsx")) continue;
        const source = fs.readFileSync(full, "utf-8");
        const hits = source.match(
          /(?:text|bg|border)-\[#(?:FF7024|171717|FFFFFF|B8B8B8|222222|292929)\]|text-\[(?:136|104|80|62|52|42)px\]/gi,
        );
        if (hits) offenders.push(`${full}: ${hits.join(", ")}`);
      }
    }
    walk(path.resolve(__dirname, "../.."));
    expect(offenders).toEqual([]);
  });
});
