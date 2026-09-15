import type { LibraryKind } from "./fileLibrary";
const MIGRATED_FLAG = "tikmaker.migratedToFiles";
const LEGACY_KEYS: {
  key: string;
  kind: LibraryKind;
  shape: "map" | "array";
}[] = [
  { key: "tikmaker.library", kind: "project", shape: "map" },
  { key: "tikmaker.savedScenes", kind: "scene", shape: "array" },
  { key: "tikmaker.savedBackgrounds", kind: "background", shape: "array" },
];
function entriesFrom(
  raw: string,
  shape: "map" | "array",
): {
  id?: unknown;
}[] {
  const parsed = JSON.parse(raw);
  if (shape === "array") return Array.isArray(parsed) ? parsed : [];
  return parsed && typeof parsed === "object" ? Object.values(parsed) : [];
}
async function idsOnDisk(kind: LibraryKind): Promise<Set<string>> {
  try {
    const response = await fetch(`/api/library/list?kind=${kind}`);
    if (!response.ok) return new Set();
    const entries = (await response.json()) as {
      id?: unknown;
    }[];
    return new Set(
      entries
        .map((entry) => entry.id)
        .filter((id): id is string => typeof id === "string"),
    );
  } catch {
    return new Set();
  }
}
export async function migrateLegacyStorage(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.localStorage.getItem(MIGRATED_FLAG)) return false;
  let wrote = false;
  for (const { key, kind, shape } of LEGACY_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    let entries: {
      id?: unknown;
    }[] = [];
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
        return wrote;
      }
    }
  }
  window.localStorage.setItem(MIGRATED_FLAG, String(Date.now()));
  if (wrote)
    console.info("[tikmaker] Legacy browser library migrated to files.");
  return wrote;
}
