import { create } from "zustand";
import type { SfxDefaultKind } from "../../video/motion/sfxDefaults";

type PresetMap = { entrance?: Record<string, string>; exit?: Record<string, string> };
export type SfxOverrides = { content?: PresetMap; visual?: PresetMap };

type SfxOverridesState = {
  overrides: SfxOverrides;
  loaded: boolean;
  loading: boolean;
  error?: string;
  load: () => Promise<void>;
  setEntranceDefault: (kind: SfxDefaultKind, preset: string, sfxId: string | undefined) => Promise<void>;
  setExitDefault: (kind: SfxDefaultKind, preset: string, sfxId: string | undefined) => Promise<void>;
};

async function save(overrides: SfxOverrides) {
  await fetch("/api/sfx-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(overrides),
  });
}

export const useSfxOverridesStore = create<SfxOverridesState>((set, get) => ({
  overrides: {},
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: undefined });
    try {
      const res = await fetch("/api/sfx-overrides");
      const overrides = await res.json();
      set({ overrides, loaded: true, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  setEntranceDefault: async (kind, preset, sfxId) => {
    const bucket = { ...get().overrides[kind] };
    const entrance = { ...bucket.entrance };
    if (sfxId) entrance[preset] = sfxId;
    else delete entrance[preset];
    const next = { ...get().overrides, [kind]: { ...bucket, entrance } };
    set({ overrides: next });
    await save(next);
  },

  setExitDefault: async (kind, preset, sfxId) => {
    const bucket = { ...get().overrides[kind] };
    const exit = { ...bucket.exit };
    if (sfxId) exit[preset] = sfxId;
    else delete exit[preset];
    const next = { ...get().overrides, [kind]: { ...bucket, exit } };
    set({ overrides: next });
    await save(next);
  },
}));
