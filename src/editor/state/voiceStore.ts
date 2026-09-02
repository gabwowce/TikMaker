import { create } from "zustand";
import { useCustomSfxStore } from "./customSfxStore";
import { registerSfx, type SfxGroup } from "../../registries/sfxRegistry";

/**
 * Generating a voiceover line and getting it onto the timeline.
 *
 * The generated MP3 is registered as an ordinary custom sound (group
 * `"voice"`), so from the moment it exists it is just another entry in the SFX
 * registry — which is what an `audioClip` refers to. Nothing downstream knows
 * or needs to know that a machine said it.
 */

export type VoiceSettings = {
  speed?: number;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speakerBoost?: boolean;
};

export type VoiceClip = { id: string; label: string; file: string; src: string; group: SfxGroup };

type VoiceState = {
  /** Whether the server has an API key. Unknown until `checkStatus` runs. */
  configured: boolean | null;
  voiceId: string | null;
  /** The generation settings a request gets when it sends none. Read from the
   * server rather than repeated here — `scripts/voiceApi.ts` is what actually
   * applies them, so it is the only place they can be defined without the two
   * copies drifting. Null until `checkStatus` has answered. */
  defaults: Required<VoiceSettings> | null;
  /** Scene ids currently generating, so each button can show its own spinner. */
  generating: string[];
  error: string | null;

  checkStatus: () => Promise<void>;
  generate: (options: { text: string; label?: string; key?: string; settings?: VoiceSettings }) => Promise<VoiceClip | null>;
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
      set({ configured: status.configured, voiceId: status.voiceId, defaults: status.defaults ?? null });
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
      if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);

      const clip = body as VoiceClip;
      // The manifest on disk is one entry longer than the one this page loaded,
      // so the new line is announced to both readers of it: the registry the
      // renderer resolves ids through, and the list the Sound tab draws.
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
