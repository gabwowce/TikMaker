import { create } from "zustand";
import { z } from "zod";
import { customBackgroundSchema, type CustomBackground } from "../../schema/scene";
import { readDisk, scheduleSave, deleteEntry } from "./fileLibrary";

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

function parse(json: unknown): SavedBackground | null {
  const result = savedBackgroundSchema.safeParse(json);
  // Same reasoning as savedScenesStore: drop only the entry that no longer
  // validates instead of losing the whole library to one bad one.
  return result.success ? result.data : null;
}

type SavedBackgroundsState = {
  backgrounds: SavedBackground[];
  /** Saves (or overwrites, if `name` already exists) a custom background under
   * a name so it can be reused across projects — a hand-tuned gradient/palette
   * is otherwise gone the moment you pick a different background. */
  save: (name: string, background: CustomBackground) => void;
  remove: (id: string) => void;
};

/** One file per background in `library/backgrounds/`, same storage rule as
 * projects, scenes and templates. */
export const useSavedBackgroundsStore = create<SavedBackgroundsState>((set, get) => ({
  backgrounds: readDisk("background", parse).sort((a, b) => a.name.localeCompare(b.name)),

  save: (name, background) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = get().backgrounds.find((b) => b.name === trimmed);
    const entry: SavedBackground = existing
      ? { ...existing, background, savedAt: Date.now() }
      : { id: `bg-${Date.now().toString(36)}`, name: trimmed, background, savedAt: Date.now() };
    scheduleSave("background", entry);
    set({
      backgrounds: existing
        ? get().backgrounds.map((b) => (b.id === entry.id ? entry : b))
        : [...get().backgrounds, entry],
    });
  },

  remove: (id) => {
    void deleteEntry("background", id).catch(() => undefined);
    set({ backgrounds: get().backgrounds.filter((b) => b.id !== id) });
  },
}));
