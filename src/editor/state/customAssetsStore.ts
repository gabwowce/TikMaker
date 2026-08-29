import { create } from "zustand";

export type CustomAsset = {
  id: string;
  label: string;
  file: string;
  src: string;
  /** Missing on assets imported before videos were supported — treat as an image. */
  kind?: "image" | "video";
};

/** A clip has to become a `recording` visual (and preview in a <video>), a still
 * becomes an `image`. Falls back on the file extension so an older manifest
 * entry without `kind` still resolves correctly. */
export function assetKind(asset: CustomAsset): "image" | "video" {
  if (asset.kind) return asset.kind;
  return /\.(mp4|mov|webm|m4v)$/i.test(asset.file) ? "video" : "image";
}

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
