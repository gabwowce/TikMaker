import { create } from "zustand";
import type { SfxGroup } from "../../registries/sfxRegistry";

export type CustomSfx = { id: string; label: string; file: string; src: string; group: SfxGroup };

type CustomSfxState = {
  sfx: CustomSfx[];
  loaded: boolean;
  loading: boolean;
  error?: string;
  load: () => Promise<void>;
  upload: (file: File, label: string, group: SfxGroup) => Promise<CustomSfx>;
  remove: (id: string) => Promise<void>;
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const useCustomSfxStore = create<CustomSfxState>((set, get) => ({
  sfx: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: undefined });
    try {
      const res = await fetch("/api/custom-sfx");
      const sfx = await res.json();
      set({ sfx, loaded: true, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  upload: async (file, label, group) => {
    const dataBase64 = await readFileAsBase64(file);
    const res = await fetch("/api/upload-sfx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, label, group, dataBase64 }),
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const entry: CustomSfx = await res.json();
    set((s) => ({ sfx: [...s.sfx, entry] }));
    return entry;
  },

  remove: async (id) => {
    await fetch("/api/delete-sfx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    set((s) => ({ sfx: s.sfx.filter((a) => a.id !== id) }));
  },
}));
