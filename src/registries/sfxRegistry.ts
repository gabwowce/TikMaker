import { generatedSfx } from "./assets.generated";
import customSfxManifest from "../config/customSfx.json";
import { assetUrl } from "../utils/assetUrl";

export type SfxGroup = "ui" | "impact" | "text" | "transition" | "reveal" | "success" | "misc";

const groupByFileId: Record<string, SfxGroup> = {
  "d-tick": "ui",
  "d-select": "ui",
  check: "ui",
  "d-mark": "ui",

  "d-enter": "impact",
  "d-ping": "impact",
  "d-pop": "impact",
  "d-break": "impact",

  "d-word": "text",
  "type-word": "text",

  "soft-whoosh": "transition",
  "paper-slide": "transition",
  "whoop-click": "transition",

  riser: "reveal",
  splash: "reveal",

  "d-done": "success",
  "d-fix": "success",

  "msg-in": "ui",
  "msg-out": "ui",
  "d-msg-in": "ui",
  "d-msg-out": "ui",
  "counter-short": "ui",
  counter: "ui",
  "d-count": "ui",
  "d-count-short": "ui",
};

/** Sound pack cleanup (2026-08-24): these built-ins were flagged as
 * low-quality/off-brand and pulled from the picker. They still live in the
 * synced source folder (`npm run assets:sync` would bring the raw files back
 * into `public/assets/sfx`), so this is a registry-level exclusion, not a
 * file deletion — it survives a re-sync. `getSfx`/`sfxList` treat these ids
 * as if they don't exist; anything that still names one (old project JSON,
 * hardcoded fallbacks) should be updated to a replacement below rather than
 * relying on this filter to silently redirect it. */
const removedSfxIds = new Set([
  "whoosh",
  "type",
  "tick",
  "swipe",
  "snap",
  "slam",
  "select",
  "bloom",
  "drop",
  "riser-2",
]);

export type SfxDefinition = {
  id: string;
  label: string;
  group: SfxGroup;
  src: string;
  custom?: boolean;
};

type CustomSfxEntry = { id: string; label: string; file: string; src: string; group: string };

export const sfxRegistry: Record<string, SfxDefinition> = Object.fromEntries([
  ...generatedSfx
    .filter((entry) => !removedSfxIds.has(entry.id))
    .map((entry) => [
      entry.id,
      {
        id: entry.id,
        label: entry.label,
        group: groupByFileId[entry.id] ?? "misc",
        src: assetUrl(`/assets/sfx/${entry.file}`),
      },
    ] as const),
  ...(customSfxManifest as CustomSfxEntry[]).map((entry) => [
    entry.id,
    {
      id: entry.id,
      label: entry.label,
      group: (entry.group as SfxGroup) ?? "misc",
      src: assetUrl(entry.src),
      custom: true,
    },
  ] as const),
]);

export const sfxList = Object.values(sfxRegistry);

export function getSfx(id: string): SfxDefinition | undefined {
  return sfxRegistry[id];
}

export function sfxByGroup(group: SfxGroup): SfxDefinition[] {
  return sfxList.filter((s) => s.group === group);
}
