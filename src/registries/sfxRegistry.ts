import customSfxManifest from "../config/customSfx.json";
import { assetUrl } from "../utils/assetUrl";
import { generatedSfx } from "./assets.generated";
export type SfxGroup =
  | "ui"
  | "impact"
  | "text"
  | "transition"
  | "reveal"
  | "success"
  | "voice"
  | "misc";
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
type CustomSfxEntry = {
  id: string;
  label: string;
  file: string;
  src: string;
  group: string;
};
export const sfxRegistry: Record<string, SfxDefinition> = Object.fromEntries([
  ...generatedSfx
    .filter((entry) => !removedSfxIds.has(entry.id))
    .map(
      (entry) =>
        [
          entry.id,
          {
            id: entry.id,
            label: entry.label,
            group: groupByFileId[entry.id] ?? "misc",
            src: assetUrl(`/assets/sfx/${entry.file}`),
          },
        ] as const,
    ),
  ...(customSfxManifest as CustomSfxEntry[]).map(
    (entry) =>
      [
        entry.id,
        {
          id: entry.id,
          label: entry.label,
          group: (entry.group as SfxGroup) ?? "misc",
          src: assetUrl(entry.src),
          custom: true,
        },
      ] as const,
  ),
]);
export const sfxList: SfxDefinition[] = Object.values(sfxRegistry);
export function registerSfx(entry: {
  id: string;
  label: string;
  src: string;
  group?: string;
}): SfxDefinition {
  const definition: SfxDefinition = {
    id: entry.id,
    label: entry.label,
    group: (entry.group as SfxGroup) ?? "misc",
    src: assetUrl(entry.src),
    custom: true,
  };
  sfxRegistry[definition.id] = definition;
  const at = sfxList.findIndex((existing) => existing.id === definition.id);
  if (at === -1) sfxList.push(definition);
  else sfxList[at] = definition;
  return definition;
}
export async function primeSfxRegistry(): Promise<void> {
  try {
    const response = await fetch("/api/custom-sfx");
    if (!response.ok) return;
    const entries = (await response.json()) as CustomSfxEntry[];
    if (!Array.isArray(entries)) return;
    for (const entry of entries) registerSfx(entry);
  } catch {}
}
export function getSfx(id: string): SfxDefinition | undefined {
  return sfxRegistry[id];
}
export function sfxByGroup(group: SfxGroup): SfxDefinition[] {
  return sfxList.filter((s) => s.group === group);
}
