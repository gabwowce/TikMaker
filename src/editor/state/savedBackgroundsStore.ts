import { z } from "zod";
import { create } from "zustand";
import {
  customBackgroundSchema,
  type CustomBackground,
} from "../../schema/scene";
import { deleteEntry, readDisk, scheduleSave } from "./fileLibrary";
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
  return result.success ? result.data : null;
}
type SavedBackgroundsState = {
  backgrounds: SavedBackground[];
  save: (name: string, background: CustomBackground) => void;
  remove: (id: string) => void;
};
export const useSavedBackgroundsStore = create<SavedBackgroundsState>(
  (set, get) => ({
    backgrounds: readDisk("background", parse).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    save: (name, background) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const existing = get().backgrounds.find((b) => b.name === trimmed);
      const entry: SavedBackground = existing
        ? { ...existing, background, savedAt: Date.now() }
        : {
            id: `bg-${Date.now().toString(36)}`,
            name: trimmed,
            background,
            savedAt: Date.now(),
          };
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
  }),
);
