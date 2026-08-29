import { create } from "zustand";
import { sceneSchema, type Scene } from "../../schema/scene";
import { z } from "zod";

const STORAGE_KEY = "tikmaker.savedScenes";

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

function read(): SavedScene[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = z.array(savedSceneSchema).safeParse(JSON.parse(raw));
    // A scene shape that no longer validates (an old field, a renamed preset)
    // would otherwise break the whole library, so drop just the bad entries.
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function write(scenes: SavedScene[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
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

/** Reusable scenes the user liked enough to keep — the built-in scene types are
 * empty shells, so without this every "I want that layout again" meant rebuilding
 * it or hunting for the project it lived in. Stored in localStorage next to the
 * project library. */
export const useSavedScenesStore = create<SavedScenesState>((set, get) => ({
  scenes: [],

  load: () => set({ scenes: read() }),

  save: (scene, name) => {
    const entry: SavedScene = { id: newId("saved"), name, scene, savedAt: Date.now() };
    const next = [entry, ...get().scenes];
    write(next);
    set({ scenes: next });
  },

  rename: (id, name) => {
    const next = get().scenes.map((s) => (s.id === id ? { ...s, name } : s));
    write(next);
    set({ scenes: next });
  },

  remove: (id) => {
    const next = get().scenes.filter((s) => s.id !== id);
    write(next);
    set({ scenes: next });
  },
}));
