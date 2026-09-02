import { create } from "zustand";
import { sceneSchema, type Scene } from "../../schema/scene";
import { z } from "zod";
import { readDisk, scheduleSave, deleteEntry } from "./fileLibrary";

export type SavedScene = {
  id: string;
  name: string;
  /** The scene exactly as it was, minus its identity — ids are minted fresh on
   * insert so the same saved scene can be dropped into a project many times. */
  scene: Scene;
  savedAt: number;
};

const savedSceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  scene: sceneSchema,
  savedAt: z.number(),
});

function parse(json: unknown): SavedScene | null {
  const result = savedSceneSchema.safeParse(json);
  // A scene shape that no longer validates (an old field, a renamed preset)
  // would otherwise break the whole library, so drop just the bad entry — the
  // file stays on disk and can be fixed by hand.
  return result.success ? result.data : null;
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Re-ids a saved scene so it can coexist with anything already in the project:
 * the scene itself, plus every block and freeform visual, which the editor
 * keys and drags by id. `visualLink` is dropped on purpose — a carry only means
 * something as a pair of adjacent scenes, and a lone half would silently point
 * at a group that isn't there.
 */
export function instantiateSavedScene(saved: SavedScene): Scene {
  const scene = saved.scene;
  return {
    ...scene,
    id: newId("scene"),
    visualLink: undefined,
    content: {
      ...scene.content,
      blocks: scene.content.blocks?.map((b) => ({ ...b, id: newId("block") })),
      visuals: scene.content.visuals?.map((v) => ({ ...v, id: newId("visual"), link: undefined })),
    },
  };
}

type SavedScenesState = {
  scenes: SavedScene[];
  load: () => void;
  save: (scene: Scene, name: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
};

function sortByNewest(scenes: SavedScene[]): SavedScene[] {
  return [...scenes].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Reusable scenes you liked enough to keep — the built-in scene types are empty
 * shells, so without this every "I want that layout again" meant rebuilding it
 * or hunting for the project it lived in.
 *
 * One file per scene in `library/scenes/`, exactly like a project. This used to
 * be localStorage, which meant the most reusable work in the app was the only
 * work that did not survive a clone, a second browser or a cleared cache.
 */
export const useSavedScenesStore = create<SavedScenesState>((set, get) => ({
  scenes: sortByNewest(readDisk("scene", parse)),

  // Disk is read once at module load; this stays for the call sites that
  // refresh on mount and is now just a re-sort of what is already in memory.
  load: () => set({ scenes: sortByNewest(get().scenes) }),

  save: (scene, name) => {
    const entry: SavedScene = { id: newId("saved"), name, scene, savedAt: Date.now() };
    scheduleSave("scene", entry);
    set({ scenes: [entry, ...get().scenes] });
  },

  rename: (id, name) => {
    const next = get().scenes.map((s) => (s.id === id ? { ...s, name } : s));
    const renamed = next.find((s) => s.id === id);
    if (renamed) scheduleSave("scene", renamed);
    set({ scenes: next });
  },

  remove: (id) => {
    void deleteEntry("scene", id).catch(() => undefined);
    set({ scenes: get().scenes.filter((s) => s.id !== id) });
  },
}));
