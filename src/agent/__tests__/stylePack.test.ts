import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stylePack } from "../stylePack";

const dir = "knowledge/shared/style-presets";

describe("paruošti stiliaus paketai", () => {
  for (const file of readdirSync(dir)) {
    it(`${file} atitinka schemą`, () => {
      const pack = stylePack.parse(
        JSON.parse(readFileSync(`${dir}/${file}`, "utf8")),
      );
      expect(`${pack.id}.json`).toBe(file);
    });
  }
});
