import { z } from "zod";
import { create } from "zustand";
import { sceneSchema, type Scene } from "../../schema/scene";
import { deleteEntry, readDisk, scheduleSave } from "./fileLibrary";
export type SavedScene = {
  id: string;
  name: string;
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
  return result.success ? result.data : null;
}
function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
export function instantiateSavedScene(saved: SavedScene): Scene {
  const scene = saved.scene;
  return {
    ...scene,
    id: newId("scene"),
    visualLink: undefined,
    content: {
      ...scene.content,
      blocks: scene.content.blocks?.map((b) => ({ ...b, id: newId("block") })),
      visuals: scene.content.visuals?.map((v) => ({
        ...v,
        id: newId("visual"),
        link: undefined,
      })),
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
export const useSavedScenesStore = create<SavedScenesState>((set, get) => ({
  scenes: sortByNewest(readDisk("scene", parse)),
  load: () => set({ scenes: sortByNewest(get().scenes) }),
  save: (scene, name) => {
    const entry: SavedScene = {
      id: newId("saved"),
      name,
      scene,
      savedAt: Date.now(),
    };
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
