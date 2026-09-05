import { generatedSfx } from "./assets.generated";
import customSfxManifest from "../config/customSfx.json";
import { assetUrl } from "../utils/assetUrl";

/** `voice` is generated speech (see `scripts/voiceApi.ts`). It sits in the same
 * registry as the sound effects on purpose: an audio clip refers to a registry
 * id, and everything the timeline can do to a sound — waveform, trim, split,
 * volume, drag — it can then do to a voiceover line for free. */
export type SfxGroup = "ui" | "impact" | "text" | "transition" | "reveal" | "success" | "voice" | "misc";

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

export const sfxList: SfxDefinition[] = Object.values(sfxRegistry);

/**
 * Adds a sound that was created while the editor was already running.
 *
 * The manifest is a static import, resolved once at page load, so a file the
 * dev server wrote a second ago is not in it. Without this, a freshly generated
 * voiceover would resolve to `undefined` in `getSfx` — no waveform, no
 * playback, nothing on the timeline — until a reload, and a reload in the
 * middle of generating a line is not a workflow. The manifest on disk is still
 * the source of truth; this is the same entry, arriving early.
 */
export function registerSfx(entry: { id: string; label: string; src: string; group?: string }): SfxDefinition {
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

/** Refreshes the runtime registry from disk before the editor mounts.
 * `customSfx.json` is intentionally ignored by Vite's watcher, so its static
 * import can remain cached across a browser reload while newly generated voice
 * files already exist on disk. The API is current in development; production
 * safely falls back to the bundled manifest. */
export async function primeSfxRegistry(): Promise<void> {
  try {
    const response = await fetch("/api/custom-sfx");
    if (!response.ok) return;
    const entries = (await response.json()) as CustomSfxEntry[];
    if (!Array.isArray(entries)) return;
    for (const entry of entries) registerSfx(entry);
  } catch {
    // No writable dev server: keep the static registry.
  }
}

export function getSfx(id: string): SfxDefinition | undefined {
  return sfxRegistry[id];
}

export function sfxByGroup(group: SfxGroup): SfxDefinition[] {
  return sfxList.filter((s) => s.group === group);
}
