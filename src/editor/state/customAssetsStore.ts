import { create } from "zustand";

export type CustomAsset = { id: string; label: string; file: string; src: string };

type CustomAssetsState = {
  assets: CustomAsset[];
  loaded: boolean;
  loading: boolean;
  error?: string;
  load: () => Promise<void>;
  upload: (file: File, label: string) => Promise<CustomAsset>;
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

export const useCustomAssetsStore = create<CustomAssetsState>((set, get) => ({
  assets: [],
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: undefined });
    try {
      const res = await fetch("/api/custom-assets");
      const assets = await res.json();
      set({ assets, loaded: true, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  upload: async (file, label) => {
    const dataBase64 = await readFileAsBase64(file);
    const res = await fetch("/api/upload-asset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, label, dataBase64 }),
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    const asset: CustomAsset = await res.json();
    set((s) => ({ assets: [...s.assets, asset] }));
    return asset;
  },

  remove: async (id) => {
    await fetch("/api/delete-asset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
  },
}));
