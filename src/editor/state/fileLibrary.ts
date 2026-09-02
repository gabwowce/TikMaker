import { create } from "zustand";

/**
 * The editor's storage layer. Files on disk are the ONLY copy of your work.
 *
 * The previous design kept every library in the browser's localStorage and
 * mirrored some of them to disk, then reconciled the two by timestamp on
 * startup. That reconciliation could only ever guess, and it guessed wrong in
 * the one case it existed for: the in-memory project never re-stamped
 * `savedAt`, so a browser copy holding unsaved keystrokes looked OLDER than the
 * file it was ahead of, and a reload silently restored the file over it.
 *
 * Removing the second copy removes the entire question. There is one place your
 * work lives, `save` either succeeds or says so out loud, and nothing is
 * reconciled because there is nothing to reconcile against.
 */

export type LibraryKind = "project" | "storyboard" | "scene" | "template" | "background" | "voiceVariant";

/**
 * The repo's own JSON, bundled at load time.
 *
 * `import.meta.glob` rather than a request to `/api/library/list`, for the same
 * reason it was chosen originally: it resolves in a production build too, and
 * the library can be drawn on the first render with no request in flight. What
 * the session writes afterwards is tracked in each store's own state, so the
 * glob only ever has to be right about the state at page load.
 */
const globs: Record<LibraryKind, Record<string, { default: unknown }>> = {
  project: import.meta.glob<{ default: unknown }>("../../../projects/*.json", { eager: true }),
  storyboard: import.meta.glob<{ default: unknown }>("../../../storyboards/*.json", { eager: true }),
  scene: import.meta.glob<{ default: unknown }>("../../../library/scenes/*.json", { eager: true }),
  template: import.meta.glob<{ default: unknown }>("../../../library/templates/*.json", { eager: true }),
  background: import.meta.glob<{ default: unknown }>("../../../library/backgrounds/*.json", { eager: true }),
  voiceVariant: import.meta.glob<{ default: unknown }>("../../../library/voice-variants/*.json", { eager: true }),
};

/**
 * What the dev server says is on disk RIGHT NOW, filled in by `primeDiskCache`
 * before the editor mounts.
 *
 * The glob above is resolved once, when Vite first transforms this module — and
 * these folders are deliberately excluded from Vite's watcher (they are written
 * several times a minute; watching them made every autosave reload the page).
 * The two facts together mean the glob is a SNAPSHOT taken at server start: a
 * project created afterwards was missing from it, and a project deleted
 * afterwards was still in it. Both showed up exactly that way — a new video
 * vanished on reload, and deleted ones kept coming back in the picker.
 *
 * So the glob is now only the fallback for a production build, where there is
 * no server to ask. In the editor, the server's own listing is the truth.
 */
const diskCache = new Map<LibraryKind, unknown[]>();

const ALL_KINDS: LibraryKind[] = ["project", "storyboard", "scene", "template", "background", "voiceVariant"];

/**
 * Reads every collection from the server once, before any store initializes.
 *
 * Called from `main.tsx` ahead of the dynamic import of the editor, because
 * stores read their collection at module-evaluation time — priming afterwards
 * would be too late for exactly the reads that matter.
 */
export async function primeDiskCache(): Promise<void> {
  await Promise.all(
    ALL_KINDS.map(async (kind) => {
      try {
        const response = await fetch(`/api/library/list?kind=${kind}`);
        if (!response.ok) return;
        const entries = (await response.json()) as unknown[];
        if (Array.isArray(entries)) diskCache.set(kind, entries);
      } catch {
        // No dev server (a production build): the glob snapshot is all there is,
        // and in that build it is also correct, because nothing can write.
      }
    })
  );

  try {
    const response = await fetch("/api/library/preferences");
    if (response.ok) primedPreferences = (await response.json()) as Partial<EditorPreferences>;
  } catch {
    // Same fallback as above.
  }
}

/**
 * Everything on disk for one kind, run through `parse`.
 *
 * A file that no longer validates is DROPPED rather than thrown, because the
 * alternative is that one stale field in one entry takes the whole library down
 * with it — and the file itself is still sitting there to be fixed by hand.
 */
export function readDisk<T>(kind: LibraryKind, parse: (json: unknown) => T | null): T[] {
  const raw = diskCache.get(kind) ?? Object.values(globs[kind]).map((module) => module.default);
  const entries: T[] = [];
  for (const value of raw) {
    try {
      const parsed = parse(value);
      if (parsed) entries.push(parsed);
    } catch {
      // Malformed entry: skipped, never fatal.
    }
  }
  return entries;
}

/* ------------------------------------------------------------------ status */

export type SaveState = "idle" | "saving" | "saved" | "error";

type SaveStatus = {
  state: SaveState;
  /** Last successful write, ms since epoch. */
  lastSavedAt: number | null;
  /** Set when a write has exhausted its retries. Cleared by the next success. */
  error: string | null;
  /** Entries written but not yet confirmed — what would be lost right now. */
  pending: number;
};

/**
 * Saving is invisible until it fails, and a silent failure is how a session's
 * work disappears. Before this, `writeProjectFile` ended in
 * `.catch(() => undefined)`: with the dev server stopped every save failed and
 * the editor looked exactly like one where every save succeeded.
 */
export const useSaveStatus = create<SaveStatus>(() => ({
  state: "idle",
  lastSavedAt: null,
  error: null,
  pending: 0,
}));

function setStatus(patch: Partial<SaveStatus>) {
  useSaveStatus.setState(patch);
}

/* ------------------------------------------------------------------- write */

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

/**
 * Writes an entry, retrying a few times before giving up.
 *
 * A dev server that is restarting is the common failure and it resolves itself
 * in a second or two, so the retries matter more than the error does. When they
 * are exhausted the payload stays in `unsaved` and the status turns red, which
 * is the only honest thing to show.
 */
const unsaved = new Map<string, { kind: LibraryKind; data: { id: string } }>();

async function writeEntry(kind: LibraryKind, data: { id: string }): Promise<void> {
  const key = `${kind}:${data.id}`;
  unsaved.set(key, { kind, data });
  setStatus({ state: "saving", pending: unsaved.size });

  for (let attempt = 0; ; attempt++) {
    try {
      await postJson("/api/library/save", { kind, data });
      // Only clear if nothing newer arrived while this request was in flight —
      // otherwise a slow save would mark the newer edit as written.
      if (unsaved.get(key)?.data === data) unsaved.delete(key);
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
          error: `Nepavyko išsaugoti (${kind}): ${err instanceof Error ? err.message : String(err)}`,
          pending: unsaved.size,
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** How long an edit may sit in memory before it reaches disk. Short enough that
 * a crash costs a keystroke, long enough that typing does not issue a request
 * per character. */
const AUTOSAVE_DELAY = 400;

/**
 * The autosave every store calls on every change. Debounced per entry, so
 * editing two projects in one session cannot make one starve the other.
 */
export function scheduleSave(kind: LibraryKind, data: { id: string }) {
  const key = `${kind}:${data.id}`;
  // Record it immediately: if the tab closes before the timer fires, `flushSaves`
  // still has the newest version to send.
  unsaved.set(key, { kind, data });
  setStatus({ state: "saving", pending: unsaved.size });
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void writeEntry(kind, data);
    }, AUTOSAVE_DELAY)
  );
}

/** Writes now instead of on the debounce — the explicit Save button, and any
 * action whose whole point is that the result exists on disk. */
export function saveNow(kind: LibraryKind, data: { id: string }): Promise<void> {
  const key = `${kind}:${data.id}`;
  clearTimeout(timers.get(key));
  timers.delete(key);
  return writeEntry(kind, data);
}

export async function deleteEntry(kind: LibraryKind, id: string): Promise<void> {
  const key = `${kind}:${id}`;
  clearTimeout(timers.get(key));
  timers.delete(key);
  unsaved.delete(key);
  try {
    await postJson("/api/library/delete", { kind, id });
    setStatus({ state: "saved", lastSavedAt: Date.now(), error: null, pending: unsaved.size });
  } catch (err) {
    setStatus({ state: "error", error: `Nepavyko ištrinti: ${err instanceof Error ? err.message : String(err)}` });
    throw err;
  }
}

/**
 * Last chance before the page goes away. `sendBeacon` is the only send that
 * survives an unloading document — a `fetch` issued here is cancelled.
 */
function flushSaves() {
  for (const [key, entry] of unsaved) {
    const payload = JSON.stringify({ kind: entry.kind, data: entry.data });
    const sent = navigator.sendBeacon?.("/api/library/save", new Blob([payload], { type: "application/json" }));
    if (sent) unsaved.delete(key);
  }
}

if (typeof window !== "undefined") {
  // `pagehide` fires on close, navigation and bfcache; `visibilitychange` also
  // covers switching away on mobile, where `pagehide` can be the last event the
  // page ever sees.
  window.addEventListener("pagehide", flushSaves);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSaves();
  });
  window.addEventListener("beforeunload", (event) => {
    // Only when a write has genuinely failed. A pending debounce is flushed by
    // the beacon above and must not nag.
    if (useSaveStatus.getState().state === "error") {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}

/* -------------------------------------------------------------- preferences */

/**
 * Editor-level choices that are not a project: which built-in scene types,
 * templates and backgrounds you have hidden, and what was open last.
 *
 * Built-ins are CODE — a scene type is a React component that existing projects
 * still render — so "delete this scene type" can only mean "stop offering it to
 * me". Hiding is that, and it is reversible, which deleting a component is not.
 */
export type EditorPreferences = {
  hiddenSceneTypes: string[];
  hiddenTemplateIds: string[];
  hiddenBackgroundIds: string[];
  /** ElevenLabs generation settings. Kept here rather than per project: they
   * are how YOU want the narrator to sound, not a property of one video. */
  voiceSpeed?: number;
  voiceStability?: number;
  voiceSimilarity?: number;
  voiceStyle?: number;
  voiceSpeakerBoost?: boolean;
  lastOpenedProjectId?: string;
  lastOpenedStoryboardId?: string;
  timelineHeight?: number;
};

const DEFAULT_PREFERENCES: EditorPreferences = {
  hiddenSceneTypes: [],
  hiddenTemplateIds: [],
  hiddenBackgroundIds: [],
};

const preferencesGlob = import.meta.glob<{ default: unknown }>("../../../library/preferences.json", { eager: true });

/** Filled by `primeDiskCache`; same staleness reasoning as the collections. */
let primedPreferences: Partial<EditorPreferences> | null = null;

function readPreferencesFromDisk(): EditorPreferences {
  const module = Object.values(preferencesGlob)[0];
  const raw = primedPreferences ?? ((module?.default ?? null) as Partial<EditorPreferences> | null);
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
  toggleHidden: (list: "hiddenSceneTypes" | "hiddenTemplateIds" | "hiddenBackgroundIds", id: string) => void;
};

let preferencesTimer: ReturnType<typeof setTimeout> | undefined;

function persistPreferences(preferences: EditorPreferences) {
  clearTimeout(preferencesTimer);
  preferencesTimer = setTimeout(() => {
    void postJson("/api/library/preferences", preferences).catch(() => undefined);
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
    get().set({ [list]: current.includes(id) ? current.filter((v) => v !== id) : [...current, id] } as Partial<EditorPreferences>);
  },
}));
