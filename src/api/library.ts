import { useMutation, useQuery } from "@tanstack/react-query";
import type { CustomAsset } from "../../server/trpc/assets";
import type { CustomSfx } from "../../server/trpc/sfx";
import { registerSfx, unregisterSfx, type SfxGroup } from "../registries/sfxRegistry";
import type {
  SavedBackground,
  SavedScene,
  VoiceVariant,
} from "../schema/library";
import type { CustomBackground, Scene } from "../schema/scene";
import type { VoiceSettings } from "../schema/voiceSettings";
import { queryClient } from "./queryClient";
import { trpc } from "./trpc";

// React hooks for everything the editor keeps on the server besides projects.
// Each one reads a list with useQuery and changes it with a mutation that,
// once the server confirms, marks that list stale so it is fetched again.

export type { CustomAsset, CustomSfx, SavedBackground, SavedScene, VoiceVariant };

// The browser sends an uploaded file as base64 text inside the JSON body.
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // "data:image/png;base64,iVBOR..."
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function newestFirst<T extends { savedAt: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.savedAt - a.savedAt);
}

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---- imported images and recordings ----------------------------------------

export function useCustomAssets() {
  const { data: assets = [] } = useQuery(trpc.assets.list.queryOptions());
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.assets.list.queryKey() });
  const upload = useMutation(trpc.assets.upload.mutationOptions({ onSuccess: refresh }));
  const remove = useMutation(trpc.assets.remove.mutationOptions({ onSuccess: refresh }));
  return {
    assets,
    upload: async (file: File, label: string): Promise<CustomAsset> =>
      upload.mutateAsync({
        filename: file.name,
        label,
        dataBase64: await readFileAsBase64(file),
      }),
    remove: (id: string) => remove.mutate(id),
  };
}

// ---- sounds: uploaded effects and generated voiceovers ---------------------
// Besides the query cache, every sound is registered in sfxRegistry — the
// list the preview AND the Remotion render look sounds up in.

export async function loadCustomSfx(): Promise<void> {
  const sfx = await queryClient.fetchQuery(trpc.sfx.list.queryOptions());
  sfx.forEach(registerSfx);
}

export function addSfxToCache(sfx: CustomSfx) {
  registerSfx(sfx);
  queryClient.setQueryData(trpc.sfx.list.queryKey(), (list = []) => [...list, sfx]);
}

export function useCustomSfx() {
  const { data: sfx = [] } = useQuery(trpc.sfx.list.queryOptions());
  const upload = useMutation(trpc.sfx.upload.mutationOptions({ onSuccess: addSfxToCache }));
  const remove = useMutation(
    trpc.sfx.remove.mutationOptions({
      onSuccess: (_result, id) => {
        unregisterSfx(id);
        return queryClient.invalidateQueries({ queryKey: trpc.sfx.list.queryKey() });
      },
    }),
  );
  return {
    sfx,
    upload: async (file: File, label: string, group: SfxGroup): Promise<CustomSfx> =>
      upload.mutateAsync({
        filename: file.name,
        label,
        group,
        dataBase64: await readFileAsBase64(file),
      }),
    remove: (id: string) => remove.mutate(id),
  };
}

// ---- "Your Scenes" ---------------------------------------------------------

export function useSavedScenes() {
  const { data = [] } = useQuery(trpc.scenes.list.queryOptions());
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.scenes.list.queryKey() });
  const save = useMutation(trpc.scenes.save.mutationOptions({ onSuccess: refresh }));
  const remove = useMutation(trpc.scenes.remove.mutationOptions({ onSuccess: refresh }));
  const scenes = newestFirst(data);
  return {
    scenes,
    save: (scene: Scene, name: string) =>
      save.mutate({ id: randomId("saved"), name, scene, savedAt: Date.now() }),
    rename: (id: string, name: string) => {
      const entry = scenes.find((s) => s.id === id);
      if (entry) save.mutate({ ...entry, name });
    },
    remove: (id: string) => remove.mutate(id),
  };
}

// ---- "Your Backgrounds" ----------------------------------------------------

export function useSavedBackgrounds() {
  const { data: backgrounds = [] } = useQuery(trpc.backgrounds.list.queryOptions());
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.backgrounds.list.queryKey() });
  const save = useMutation(trpc.backgrounds.save.mutationOptions({ onSuccess: refresh }));
  const remove = useMutation(trpc.backgrounds.remove.mutationOptions({ onSuccess: refresh }));
  return {
    backgrounds,
    // Saving under a name that already exists updates that background.
    save: (name: string, background: CustomBackground) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const existing = backgrounds.find((b) => b.name === trimmed);
      save.mutate(
        existing
          ? { ...existing, background, savedAt: Date.now() }
          : { id: `bg-${Date.now().toString(36)}`, name: trimmed, background, savedAt: Date.now() },
      );
    },
    remove: (id: string) => remove.mutate(id),
  };
}

// ---- saved cuts of voiceovers ----------------------------------------------

export function useVoiceVariants() {
  const { data = [] } = useQuery(trpc.voiceVariants.list.queryOptions());
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.voiceVariants.list.queryKey() });
  const save = useMutation(trpc.voiceVariants.save.mutationOptions({ onSuccess: refresh }));
  const remove = useMutation(trpc.voiceVariants.remove.mutationOptions({ onSuccess: refresh }));
  const variants = newestFirst(data);
  return {
    variants,
    save: (name: string, cut: Omit<VoiceVariant, "id" | "name" | "savedAt">) =>
      save.mutate({ ...cut, id: randomId("vv"), name, savedAt: Date.now() }),
    rename: (id: string, name: string) => {
      const entry = variants.find((v) => v.id === id);
      if (entry) save.mutate({ ...entry, name });
    },
    remove: (id: string) => remove.mutate(id),
  };
}

// ---- voiceover generation --------------------------------------------------

export function useVoice() {
  const { data: status } = useQuery(trpc.voice.status.queryOptions());
  const { data: settings } = useQuery(trpc.voice.settings.get.queryOptions());
  const saveSettings = useMutation(trpc.voice.settings.save.mutationOptions());
  const generate = useMutation(
    trpc.voice.generate.mutationOptions({ onSuccess: addSfxToCache }),
  );
  return {
    configured: status?.configured,
    settings,
    // Moves a slider right away (in the cache) and saves when it is let go,
    // so dragging doesn't send a request for every pixel.
    previewSettings: (patch: Partial<VoiceSettings>) => {
      if (!settings) return;
      queryClient.setQueryData(trpc.voice.settings.get.queryKey(), { ...settings, ...patch });
    },
    saveSettings: (patch: Partial<VoiceSettings>) => {
      if (settings) saveSettings.mutate({ ...settings, ...patch });
    },
    generate,
  };
}
