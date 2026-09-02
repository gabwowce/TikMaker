import type { LibraryKind } from "./fileLibrary";

/**
 * Moves everything the old localStorage-backed editor was holding onto disk,
 * once, and then never runs again.
 *
 * Storage moved to files, and the browser copy became invisible the moment the
 * stores stopped reading it — which for saved scenes, templates and
 * backgrounds meant a library that had never been anywhere else would look
 * deleted. That work is still sitting in localStorage, so it gets copied out
 * rather than abandoned.
 *
 * Runs BEFORE the editor mounts and reloads the page when it wrote anything:
 * the stores read the disk through `import.meta.glob`, which resolves at page
 * load, so a file written after that would not appear until the next one
 * anyway. One reload is the cheapest way to make the migration visible.
 */

const MIGRATED_FLAG = "tikmaker.migratedToFiles";

/** The old key for each collection, and how its value was shaped: projects and
 * storyboards were a map keyed by id, the rest were plain arrays. */
const LEGACY_KEYS: { key: string; kind: LibraryKind; shape: "map" | "array" }[] = [
  { key: "tikmaker.library", kind: "project", shape: "map" },
  { key: "tikmaker.storyboards", kind: "storyboard", shape: "map" },
  { key: "tikmaker.savedScenes", kind: "scene", shape: "array" },
  { key: "tikmaker.savedTemplates", kind: "template", shape: "array" },
  { key: "tikmaker.savedBackgrounds", kind: "background", shape: "array" },
];

function entriesFrom(raw: string, shape: "map" | "array"): { id?: unknown }[] {
  const parsed = JSON.parse(raw);
  if (shape === "array") return Array.isArray(parsed) ? parsed : [];
  return parsed && typeof parsed === "object" ? Object.values(parsed) : [];
}

/**
 * The ids a collection already has on disk.
 *
 * Projects and storyboards were ALREADY written to files, so the browser copy
 * of one is at best a duplicate and at worst older than a version pulled from
 * git — copying it over the file would be the exact overwrite this whole change
 * exists to prevent. Only the entries that never reached disk are worth
 * migrating. Scenes, templates and backgrounds have nothing on disk to conflict
 * with, so every one of them is new.
 */
async function idsOnDisk(kind: LibraryKind): Promise<Set<string>> {
  try {
    const response = await fetch(`/api/library/list?kind=${kind}`);
    if (!response.ok) return new Set();
    const entries = (await response.json()) as { id?: unknown }[];
    return new Set(entries.map((entry) => entry.id).filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

/** Resolves to true when something was written and the page should reload. */
export async function migrateLegacyStorage(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(MIGRATED_FLAG)) return false;

  let wrote = false;
  for (const { key, kind, shape } of LEGACY_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    let entries: { id?: unknown }[] = [];
    try {
      entries = entriesFrom(raw, shape);
    } catch {
      continue;
    }
    const existing = await idsOnDisk(kind);
    for (const entry of entries) {
      if (!entry || typeof entry.id !== "string") continue;
      if (existing.has(entry.id)) continue;
      try {
        const response = await fetch("/api/library/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, data: entry }),
        });
        if (response.ok) wrote = true;
      } catch {
        // The dev server is not up. Leave the flag unset so the migration is
        // retried on the next load rather than silently skipped forever.
        return wrote;
      }
    }
  }

  // The legacy keys are deliberately NOT removed: if anything about this
  // migration went wrong, the original data is still there to look at.
  window.localStorage.setItem(MIGRATED_FLAG, String(Date.now()));
  if (wrote) console.info("[tikmaker] Sena naršyklės biblioteka perkelta į failus.");
  return wrote;
}
