import { create } from "zustand";
import { z } from "zod";
import { readDisk, scheduleSave, deleteEntry } from "./fileLibrary";

/**
 * A named CUT of a generated voice line, not a copy of the audio.
 *
 * Trimming on the timeline never touches the MP3 — it only moves `startFrom`
 * and `durationInFrames` on the clip, so the original is safe by construction
 * and "go back to the full take" is a reset, not a restore. What was actually
 * missing was the other direction: a good cut you spent time on lived inside
 * one clip in one project, and using it again meant finding it and re-trimming
 * by eye.
 *
 * A variant is those few numbers with a name on them. It costs nothing to keep,
 * it points at the same file every other use points at, and dropping it into
 * another video is one click.
 */

export type VoiceVariant = {
  id: string;
  name: string;
  /** The registry id of the source audio — the untouched original. */
  sfxId: string;
  startFrom?: number;
  durationInFrames?: number;
  volume?: number;
  playbackRate?: number;
  savedAt: number;
};

const voiceVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  sfxId: z.string(),
  startFrom: z.number().min(0).optional(),
  durationInFrames: z.number().min(1).optional(),
  volume: z.number().min(0).max(2).optional(),
  playbackRate: z.number().min(0.25).max(4).optional(),
  savedAt: z.number(),
});

function parse(json: unknown): VoiceVariant | null {
  const result = voiceVariantSchema.safeParse(json);
  return result.success ? result.data : null;
}

type VoiceVariantsState = {
  variants: VoiceVariant[];
  save: (name: string, cut: Omit<VoiceVariant, "id" | "name" | "savedAt">) => VoiceVariant;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
};

export const useVoiceVariantsStore = create<VoiceVariantsState>((set, get) => ({
  variants: readDisk("voiceVariant", parse).sort((a, b) => b.savedAt - a.savedAt),

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
    const next = get().variants.map((variant) => (variant.id === id ? { ...variant, name } : variant));
    const renamed = next.find((variant) => variant.id === id);
    if (renamed) scheduleSave("voiceVariant", renamed);
    set({ variants: next });
  },

  remove: (id) => {
    void deleteEntry("voiceVariant", id).catch(() => undefined);
    set({ variants: get().variants.filter((variant) => variant.id !== id) });
  },
}));
