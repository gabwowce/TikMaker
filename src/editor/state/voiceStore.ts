import { create } from "zustand";
import { registerSfx, type SfxGroup } from "../../registries/sfxRegistry";
import { useCustomSfxStore } from "./customSfxStore";
export type VoiceSettings = {
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
};
export type VoiceClip = {
  id: string;
  label: string;
  file: string;
  src: string;
  group: SfxGroup;
};
type VoiceState = {
  configured: boolean | null;
  voiceId: string | null;
  defaults: Required<VoiceSettings> | null;
  generating: string[];
  error: string | null;
  checkStatus: () => Promise<void>;
  generate: (options: {
    text: string;
    label?: string;
    key?: string;
    settings?: VoiceSettings;
  }) => Promise<VoiceClip | null>;
};
export const useVoiceStore = create<VoiceState>((set, get) => ({
  configured: null,
  voiceId: null,
  defaults: null,
  generating: [],
  error: null,
  checkStatus: async () => {
    try {
      const response = await fetch("/api/voice/status");
      const status = (await response.json()) as {
        configured: boolean;
        voiceId: string;
        defaults?: Required<VoiceSettings>;
      };
      set({
        configured: status.configured,
        voiceId: status.voiceId,
        defaults: status.defaults ?? null,
      });
    } catch {
      set({ configured: false });
    }
  },
  generate: async ({ text, label, key = "global", settings }) => {
    set({ generating: [...get().generating, key], error: null });
    try {
      const response = await fetch("/api/voice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, label, ...settings }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body?.error ?? `HTTP ${response.status}`);
      const clip = body as VoiceClip;
      registerSfx(clip);
      useCustomSfxStore.setState((state) => ({ sfx: [...state.sfx, clip] }));
      return clip;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) });
      return null;
    } finally {
      set({ generating: get().generating.filter((entry) => entry !== key) });
    }
  },
}));
