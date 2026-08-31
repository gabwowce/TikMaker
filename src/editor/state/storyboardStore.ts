import { create } from "zustand";
import { z } from "zod";
import {
  createEmptyStoryboard,
  getBeatRole,
  storyboardSchema,
  storyboardStatusSchema,
  type BeatRole,
  type Storyboard,
  type StoryboardBeat,
} from "../../schema/storyboard";

const LIBRARY_KEY = "tikmaker.storyboards";
const LAST_OPENED_KEY = "tikmaker.lastOpenedStoryboardId";

/** The skeleton a "New Storyboard" starts from — the classic short-form spine.
 * An empty list is technically the honest starting point, but a blank page is
 * the hardest thing to write against and every role here is deletable. */
const DEFAULT_ROLES: BeatRole[] = ["hook", "problem", "reveal", "demo", "proof", "payoff", "cta"];

type Library = Record<string, Storyboard>;

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function readLibrary(): Library {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const library: Library = {};
    for (const [id, value] of Object.entries(parsed)) {
      const result = storyboardSchema.safeParse(value);
      // Drop the bad entry, not the library — same reasoning as the project
      // library and the saved-template store.
      if (result.success) library[id] = result.data;
    }
    return library;
  } catch {
    return {};
  }
}

function writeLibrary(library: Library) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

function writeStoryboardFile(storyboard: Storyboard) {
  if (typeof window === "undefined") return;
  void fetch("/api/save-json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "storyboard", data: storyboard }),
  }).catch(() => undefined);
}

function persist(storyboard: Storyboard, library: Library): Library {
  const next = { ...library, [storyboard.id]: storyboard };
  writeLibrary(next);
  writeStoryboardFile(storyboard);
  if (typeof window !== "undefined") window.localStorage.setItem(LAST_OPENED_KEY, storyboard.id);
  return next;
}

export type StoryboardIndexEntry = { id: string; title: string; beats: number };

function indexFrom(library: Library): StoryboardIndexEntry[] {
  return Object.values(library)
    .map((s) => ({ id: s.id, title: s.title, beats: s.beats.length }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function newBeat(role: BeatRole): StoryboardBeat {
  return { id: newId("beat"), role, purpose: getBeatRole(role).defaultPurpose };
}

export function storyboardFromRoles(title: string, roles: BeatRole[]): Storyboard {
  return { ...createEmptyStoryboard(newId("sb"), title), beats: roles.map(newBeat) };
}

type StoryboardState = {
  storyboard: Storyboard | null;
  selectedBeatId: string | null;
  index: StoryboardIndexEntry[];
  /** Set by an import that did not parse, cleared by the next one. Surfaced in
   * the header rather than thrown, so a bad file cannot take the editor down. */
  importError: string | null;

  load: () => void;
  create: (title: string, roles?: BeatRole[]) => void;
  open: (id: string) => void;
  remove: (id: string) => void;
  save: () => void;
  /** Replaces the open storyboard wholesale (import). Persisted immediately —
   * an import that vanished on reload because Save was never pressed would
   * read as the import itself having failed. */
  replace: (storyboard: Storyboard) => void;
  importJson: (text: string) => void;
  exportJson: () => string;

  updateTitle: (title: string) => void;
  updateStatus: (status: z.infer<typeof storyboardStatusSchema>) => void;
  updateTargetDuration: (seconds: number | undefined) => void;

  addBeat: (role: BeatRole, afterIndex?: number) => void;
  updateBeat: (id: string, patch: Partial<StoryboardBeat>) => void;
  removeBeat: (id: string) => void;
  moveBeat: (id: string, direction: "up" | "down") => void;
  /** Drag & drop: pull the beat at `from` out and drop it at `to`. */
  reorderBeats: (from: number, to: number) => void;
  selectBeat: (id: string | null) => void;
};

function loadInitial(): { storyboard: Storyboard | null; library: Library } {
  const library = readLibrary();
  if (typeof window === "undefined") return { storyboard: null, library };
  const lastOpened = window.localStorage.getItem(LAST_OPENED_KEY);
  if (lastOpened && library[lastOpened]) return { storyboard: library[lastOpened], library };
  return { storyboard: Object.values(library)[0] ?? null, library };
}

const initial = loadInitial();

/**
 * The script layer's state, kept entirely separate from `projectStore` — the
 * two share no storage key, no id space and no shape, which is the whole point
 * of splitting storyboard JSON from project JSON. The single crossing is
 * `storyboardToProject`, called from the view when scenes are generated.
 */
export const useStoryboardStore = create<StoryboardState>((set, get) => ({
  storyboard: initial.storyboard,
  selectedBeatId: initial.storyboard?.beats[0]?.id ?? null,
  index: indexFrom(initial.library),
  importError: null,

  load: () => set({ index: indexFrom(readLibrary()) }),

  create: (title, roles = DEFAULT_ROLES) => {
    const storyboard = storyboardFromRoles(title, roles);
    const library = persist(storyboard, readLibrary());
    set({
      storyboard,
      selectedBeatId: storyboard.beats[0]?.id ?? null,
      index: indexFrom(library),
      importError: null,
    });
  },

  open: (id) => {
    const library = readLibrary();
    const storyboard = library[id];
    if (!storyboard) return;
    if (typeof window !== "undefined") window.localStorage.setItem(LAST_OPENED_KEY, id);
    set({ storyboard, selectedBeatId: storyboard.beats[0]?.id ?? null, importError: null });
  },

  remove: (id) => {
    const library = readLibrary();
    delete library[id];
    writeLibrary(library);
    const isOpen = get().storyboard?.id === id;
    set({
      index: indexFrom(library),
      storyboard: isOpen ? (Object.values(library)[0] ?? null) : get().storyboard,
      selectedBeatId: isOpen ? null : get().selectedBeatId,
    });
  },

  save: () => {
    const storyboard = get().storyboard;
    if (!storyboard) return;
    set({ index: indexFrom(persist(storyboard, readLibrary())) });
  },

  replace: (storyboard) => {
    const library = persist(storyboard, readLibrary());
    set({
      storyboard,
      selectedBeatId: storyboard.beats[0]?.id ?? null,
      index: indexFrom(library),
      importError: null,
    });
  },

  importJson: (text) => {
    try {
      const parsed = storyboardSchema.parse(JSON.parse(text));
      // The id is kept on purpose: re-importing the same storyboard should
      // update its entry, not fork it. Exports carry their id for this reason.
      get().replace(parsed);
    } catch (err) {
      set({ importError: err instanceof Error ? err.message : "Invalid storyboard JSON." });
    }
  },

  exportJson: () => JSON.stringify(get().storyboard, null, 2),

  updateTitle: (title) => set((s) => (s.storyboard ? { storyboard: { ...s.storyboard, title } } : s)),

  updateStatus: (status) => set((s) => (s.storyboard ? { storyboard: { ...s.storyboard, status } } : s)),

  updateTargetDuration: (targetDuration) =>
    set((s) => (s.storyboard ? { storyboard: { ...s.storyboard, targetDuration } } : s)),

  addBeat: (role, afterIndex) => {
    set((s) => {
      if (!s.storyboard) return s;
      const beat = newBeat(role);
      const beats = [...s.storyboard.beats];
      beats.splice(afterIndex === undefined ? beats.length : afterIndex + 1, 0, beat);
      return { storyboard: { ...s.storyboard, beats }, selectedBeatId: beat.id };
    });
  },

  updateBeat: (id, patch) => {
    set((s) =>
      s.storyboard
        ? {
            storyboard: {
              ...s.storyboard,
              beats: s.storyboard.beats.map((b) => (b.id === id ? { ...b, ...patch } : b)),
            },
          }
        : s
    );
  },

  removeBeat: (id) => {
    set((s) => {
      if (!s.storyboard) return s;
      const beats = s.storyboard.beats.filter((b) => b.id !== id);
      return {
        storyboard: { ...s.storyboard, beats },
        selectedBeatId: s.selectedBeatId === id ? (beats[0]?.id ?? null) : s.selectedBeatId,
      };
    });
  },

  moveBeat: (id, direction) => {
    set((s) => {
      if (!s.storyboard) return s;
      const beats = [...s.storyboard.beats];
      const at = beats.findIndex((b) => b.id === id);
      const to = direction === "up" ? at - 1 : at + 1;
      if (at === -1 || to < 0 || to >= beats.length) return s;
      [beats[at], beats[to]] = [beats[to], beats[at]];
      return { storyboard: { ...s.storyboard, beats } };
    });
  },

  reorderBeats: (from, to) => {
    set((s) => {
      if (!s.storyboard) return s;
      const beats = [...s.storyboard.beats];
      if (from < 0 || from >= beats.length || to < 0 || to >= beats.length || from === to) return s;
      const [moved] = beats.splice(from, 1);
      beats.splice(to, 0, moved);
      return { storyboard: { ...s.storyboard, beats } };
    });
  },

  selectBeat: (id) => set({ selectedBeatId: id }),
}));

// Match video projects: storyboard edits are kept without requiring a Save
// click. The explicit button remains useful as an immediate flush.
if (typeof window !== "undefined") {
  let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
  useStoryboardStore.subscribe((state, previous) => {
    if (state.storyboard === previous.storyboard) return;
    if (state.storyboard) {
      const immediateLibrary = { ...readLibrary(), [state.storyboard.id]: state.storyboard };
      writeLibrary(immediateLibrary);
      window.localStorage.setItem(LAST_OPENED_KEY, state.storyboard.id);
    }
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      const storyboard = useStoryboardStore.getState().storyboard;
      if (!storyboard) return;
      writeStoryboardFile(storyboard);
      useStoryboardStore.setState({ index: indexFrom(readLibrary()) });
    }, 800);
  });
  window.addEventListener("pagehide", () => {
    const storyboard = useStoryboardStore.getState().storyboard;
    if (storyboard) navigator.sendBeacon?.("/api/save-json", JSON.stringify({ kind: "storyboard", data: storyboard }));
  });
}
