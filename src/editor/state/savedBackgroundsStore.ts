import { create } from "zustand";
import { z } from "zod";
import { customBackgroundSchema, type CustomBackground } from "../../schema/scene";

const STORAGE_KEY = "tikmaker.savedBackgrounds";

export type SavedBackground = {
  id: string;
  name: string;
  background: CustomBackground;
  savedAt: number;
};

const savedBackgroundSchema = z.object({
  id: z.string(),
  name: z.string(),
  background: customBackgroundSchema,
  savedAt: z.number(),
});

function read(): SavedBackground[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = z.array(savedBackgroundSchema).safeParse(JSON.parse(raw));
    // Same reasoning as savedScenesStore: drop only the entries that no longer
    // validate instead of losing the whole library to one bad one.
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function write(backgrounds: SavedBackground[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backgrounds));
}

type SavedBackgroundsState = {
  backgrounds: SavedBackground[];
  /** Saves (or overwrites, if `name` already exists) a custom background under
   * a name so it can be reused across projects — a hand-tuned gradient/palette
   * is otherwise gone the moment you pick a different background. */
  save: (name: string, background: CustomBackground) => void;
  remove: (id: string) => void;
};

export const useSavedBackgroundsStore = create<SavedBackgroundsState>((set, get) => ({
  backgrounds: read(),

  save: (name, background) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = get().backgrounds.find((b) => b.name === trimmed);
    const next = existing
      ? get().backgrounds.map((b) => (b.id === existing.id ? { ...b, background, savedAt: Date.now() } : b))
      : [
          ...get().backgrounds,
          { id: `bg-${Date.now().toString(36)}`, name: trimmed, background, savedAt: Date.now() },
        ];
    write(next);
    set({ backgrounds: next });
  },

  remove: (id) => {
    const next = get().backgrounds.filter((b) => b.id !== id);
    write(next);
    set({ backgrounds: next });
  },
}));
