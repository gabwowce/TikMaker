import { create } from "zustand";
export type LibraryKind =
  | "project"
  | "scene"
  | "template"
  | "background"
  | "voiceVariant";
const globs: Record<
  LibraryKind,
  Record<
    string,
    {
      default: unknown;
    }
  >
> = {
  project: import.meta.glob<{
    default: unknown;
  }>("../../../projects/*.json", { eager: true }),
  scene: import.meta.glob<{
    default: unknown;
  }>("../../../library/scenes/*.json", { eager: true }),
  template: import.meta.glob<{
    default: unknown;
  }>("../../../library/templates/*.json", { eager: true }),
  background: import.meta.glob<{
    default: unknown;
  }>("../../../library/backgrounds/*.json", { eager: true }),
  voiceVariant: import.meta.glob<{
    default: unknown;
  }>("../../../library/voice-variants/*.json", { eager: true }),
};
const diskCache = new Map<LibraryKind, unknown[]>();
const SAVE_JOURNAL_KEY = "tikmaker.pending-save-journal.v1";
const ALL_KINDS: LibraryKind[] = [
  "project",
  "scene",
  "template",
  "background",
  "voiceVariant",
];
export async function primeDiskCache(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const journal = JSON.parse(
        window.localStorage.getItem(SAVE_JOURNAL_KEY) ?? "{}",
      ) as Record<
        string,
        {
          kind: LibraryKind;
          data: {
            id: string;
          };
        }
      >;
      for (const [key, entry] of Object.entries(journal)) {
        try {
          await postJson("/api/library/save", {
            kind: entry.kind,
            data: entry.data,
          });
          delete journal[key];
        } catch {}
      }
      if (Object.keys(journal).length)
        window.localStorage.setItem(SAVE_JOURNAL_KEY, JSON.stringify(journal));
      else window.localStorage.removeItem(SAVE_JOURNAL_KEY);
    } catch {}
  }
  await Promise.all(
    ALL_KINDS.map(async (kind) => {
      try {
        const response = await fetch(`/api/library/list?kind=${kind}`);
        if (!response.ok) return;
        const entries = (await response.json()) as unknown[];
        if (Array.isArray(entries)) diskCache.set(kind, entries);
      } catch {}
    }),
  );
  try {
    const response = await fetch("/api/library/preferences");
    if (response.ok)
      primedPreferences = (await response.json()) as Partial<EditorPreferences>;
  } catch {}
}
export function readDisk<T>(
  kind: LibraryKind,
  parse: (json: unknown) => T | null,
): T[] {
  const raw =
    diskCache.get(kind) ??
    Object.values(globs[kind]).map((module) => module.default);
  const entries: T[] = [];
  for (const value of raw) {
    try {
      const parsed = parse(value);
      if (parsed) entries.push(parsed);
    } catch {}
  }
  return entries;
}
export type SaveState = "idle" | "saving" | "saved" | "error";
type SaveStatus = {
  state: SaveState;
  lastSavedAt: number | null;
  error: string | null;
  pending: number;
};
export const useSaveStatus = create<SaveStatus>(() => ({
  state: "idle",
  lastSavedAt: null,
  error: null,
  pending: 0,
}));
function setStatus(patch: Partial<SaveStatus>) {
  useSaveStatus.setState(patch);
}
const RETRY_DELAYS = [400, 1200, 3000];
async function postJson(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `${response.status} ${response.statusText}`);
  }
}
const unsaved = new Map<
  string,
  {
    kind: LibraryKind;
    data: {
      id: string;
    };
  }
>();
function persistSaveJournal() {
  if (typeof window === "undefined") return;
  if (!unsaved.size) {
    window.localStorage.removeItem(SAVE_JOURNAL_KEY);
    return;
  }
  window.localStorage.setItem(
    SAVE_JOURNAL_KEY,
    JSON.stringify(Object.fromEntries(unsaved)),
  );
}
async function writeEntry(
  kind: LibraryKind,
  data: {
    id: string;
  },
): Promise<void> {
  const key = `${kind}:${data.id}`;
  unsaved.set(key, { kind, data });
  setStatus({ state: "saving", pending: unsaved.size });
  for (let attempt = 0; ; attempt++) {
    try {
      await postJson("/api/library/save", { kind, data });
      if (unsaved.get(key)?.data === data) unsaved.delete(key);
      persistSaveJournal();
      setStatus({
        state: unsaved.size ? "saving" : "saved",
        lastSavedAt: Date.now(),
        error: null,
        pending: unsaved.size,
      });
      return;
    } catch (err) {
      if (attempt >= RETRY_DELAYS.length) {
        setStatus({
          state: "error",
          error: `Failed to save (${kind}): ${err instanceof Error ? err.message : String(err)}`,
          pending: unsaved.size,
        });
        return;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAYS[attempt]),
      );
    }
  }
}
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const AUTOSAVE_DELAY = 400;
export function scheduleSave(
  kind: LibraryKind,
  data: {
    id: string;
  },
) {
  const key = `${kind}:${data.id}`;
  unsaved.set(key, { kind, data });
  persistSaveJournal();
  setStatus({ state: "saving", pending: unsaved.size });
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void writeEntry(kind, data);
    }, AUTOSAVE_DELAY),
  );
}
export function saveNow(
  kind: LibraryKind,
  data: {
    id: string;
  },
): Promise<void> {
  const key = `${kind}:${data.id}`;
  clearTimeout(timers.get(key));
  timers.delete(key);
  return writeEntry(kind, data);
}
export async function deleteEntry(
  kind: LibraryKind,
  id: string,
): Promise<void> {
  const key = `${kind}:${id}`;
  clearTimeout(timers.get(key));
  timers.delete(key);
  unsaved.delete(key);
  persistSaveJournal();
  try {
    await postJson("/api/library/delete", { kind, id });
    setStatus({
      state: "saved",
      lastSavedAt: Date.now(),
      error: null,
      pending: unsaved.size,
    });
  } catch (err) {
    setStatus({
      state: "error",
      error: `Failed to delete: ${err instanceof Error ? err.message : String(err)}`,
    });
    throw err;
  }
}
function flushSaves() {
  for (const entry of unsaved.values()) {
    const payload = JSON.stringify({ kind: entry.kind, data: entry.data });
    const sent = navigator.sendBeacon?.(
      "/api/library/save",
      new Blob([payload], { type: "application/json" }),
    );
    void sent;
  }
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushSaves);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSaves();
  });
  window.addEventListener("beforeunload", (event) => {
    if (useSaveStatus.getState().state === "error") {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}
export type EditorPreferences = {
  hiddenSceneTypes: string[];
  hiddenTemplateIds: string[];
  hiddenBackgroundIds: string[];
  voiceSpeed?: number;
  voiceStability?: number;
  voiceSimilarity?: number;
  voiceStyle?: number;
  voiceSpeakerBoost?: boolean;
  lastOpenedProjectId?: string;
  timelineHeight?: number;
};
const DEFAULT_PREFERENCES: EditorPreferences = {
  hiddenSceneTypes: [],
  hiddenTemplateIds: [],
  hiddenBackgroundIds: [],
};
const preferencesGlob = import.meta.glob<{
  default: unknown;
}>("../../../library/preferences.json", { eager: true });
let primedPreferences: Partial<EditorPreferences> | null = null;
function readPreferencesFromDisk(): EditorPreferences {
  const module = Object.values(preferencesGlob)[0];
  const raw =
    primedPreferences ??
    ((module?.default ?? null) as Partial<EditorPreferences> | null);
  if (!raw || typeof raw !== "object") return DEFAULT_PREFERENCES;
  return {
    ...DEFAULT_PREFERENCES,
    ...raw,
    hiddenSceneTypes: raw.hiddenSceneTypes ?? [],
    hiddenTemplateIds: raw.hiddenTemplateIds ?? [],
    hiddenBackgroundIds: raw.hiddenBackgroundIds ?? [],
  };
}
type PreferencesState = EditorPreferences & {
  set: (patch: Partial<EditorPreferences>) => void;
  toggleHidden: (
    list: "hiddenSceneTypes" | "hiddenTemplateIds" | "hiddenBackgroundIds",
    id: string,
  ) => void;
};
let preferencesTimer: ReturnType<typeof setTimeout> | undefined;
function persistPreferences(preferences: EditorPreferences) {
  clearTimeout(preferencesTimer);
  preferencesTimer = setTimeout(() => {
    void postJson("/api/library/preferences", preferences).catch(
      () => undefined,
    );
  }, AUTOSAVE_DELAY);
}
export const usePreferences = create<PreferencesState>((set, get) => ({
  ...readPreferencesFromDisk(),
  set: (patch) => {
    set(patch);
    const { set: _set, toggleHidden: _toggle, ...preferences } = get();
    persistPreferences(preferences as EditorPreferences);
  },
  toggleHidden: (list, id) => {
    const current = get()[list];
    get().set({
      [list]: current.includes(id)
        ? current.filter((v) => v !== id)
        : [...current, id],
    } as Partial<EditorPreferences>);
  },
}));
