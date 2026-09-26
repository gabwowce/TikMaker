import { create } from "zustand";
import {
  voiceVariantSchema,
  type VoiceVariant,
} from "../../schema/library";
import { deleteEntry, readDisk, scheduleSave } from "./fileLibrary";
export type { VoiceVariant };
function parse(json: unknown): VoiceVariant | null {
  const result = voiceVariantSchema.safeParse(json);
  return result.success ? result.data : null;
}
type VoiceVariantsState = {
  variants: VoiceVariant[];
  save: (
    name: string,
    cut: Omit<VoiceVariant, "id" | "name" | "savedAt">,
  ) => VoiceVariant;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
};
export const useVoiceVariantsStore = create<VoiceVariantsState>((set, get) => ({
  variants: readDisk("voiceVariant", parse).sort(
    (a, b) => b.savedAt - a.savedAt,
  ),
  save: (name, cut) => {
    const entry: VoiceVariant = {
      ...cut,
      id: `vv-${Math.random().toString(36).slice(2, 9)}`,
      name,
      savedAt: Date.now(),
    };
    scheduleSave("voiceVariant", entry);
    set({ variants: [entry, ...get().variants] });
    return entry;
  },
  rename: (id, name) => {
    const next = get().variants.map((variant) =>
      variant.id === id ? { ...variant, name } : variant,
    );
    const renamed = next.find((variant) => variant.id === id);
    if (renamed) scheduleSave("voiceVariant", renamed);
    set({ variants: next });
  },
  remove: (id) => {
    void deleteEntry("voiceVariant", id).catch(() => undefined);
    set({ variants: get().variants.filter((variant) => variant.id !== id) });
  },
}));
