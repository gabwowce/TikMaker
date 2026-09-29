import { Button, Checkbox, Slider } from "@mantine/core";
import { useState } from "react";
import { useVoice } from "../../api/library";
import { voiceSettingsSchema } from "../../schema/voiceSettings";
import { computeSceneTimings } from "../../utils/duration";
import { useProjectStore } from "../state/projectStore";

function VoiceSettingsFields() {
  const { settings, previewSettings, saveSettings } = useVoice();
  const [open, setOpen] = useState(false);
  if (!settings) return null;
  function slider(
    label: string,
    field: "speed" | "stability" | "similarityBoost" | "style",
    min: number,
    max: number,
  ) {
    const value = settings![field];
    return (
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-editor-muted">
          <span>{label}</span>
          <span className="text-editor-text">{value.toFixed(2)}</span>
        </div>
        <Slider
          min={min}
          max={max}
          step={0.05}
          value={value}
          onChange={(next) => previewSettings({ [field]: Number(next) })}
          onChangeEnd={(next) => saveSettings({ [field]: Number(next) })}
          className="w-full"
        />
      </div>
    );
  }
  return (
    <div className="mb-2.5 pb-2 border-0 border-b border-solid border-editor-border">
      {slider("Speaking speed", "speed", 0.7, 1.2)}

      <div className="flex gap-1.5">
        <Button variant="default" onClick={() => setOpen((value) => !value)}>
          {open ? "▾ Less" : "▸ More settings"}
        </Button>
        <Button
          variant="default"
          aria-label="Restore the default voice settings"
          onClick={() =>
            // the schema's defaults, keeping which voice and model are used
            saveSettings(
              voiceSettingsSchema.parse({
                voiceId: settings.voiceId,
                modelId: settings.modelId,
              }),
            )
          }
        >
          ↺ Defaults
        </Button>
      </div>

      {open ? (
        <div className="mt-2">
          {slider("Stability", "stability", 0, 1)}
          {slider("Similarity", "similarityBoost", 0, 1)}
          {slider("Style exaggeration", "style", 0, 1)}
          <label className="flex items-center gap-1.5 text-[10px] text-editor-muted">
            <Checkbox
              checked={settings.speakerBoost}
              onChange={(event) =>
                saveSettings({ speakerBoost: event.target.checked })
              }
            />
            Speaker boost
          </label>
        </div>
      ) : null}
    </div>
  );
}

type VoiceoverGeneratorProps = {
  sceneId: string;
  text: string | undefined;
};

export function VoiceoverGenerator({ sceneId, text }: VoiceoverGeneratorProps) {
  // Each scene's generator has its own mutation, so "Generating…" and any
  // error belong to this scene only.
  const { configured, generate } = useVoice();
  const generating = generate.isPending;
  const project = useProjectStore((s) => s.project);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const updateAudioClip = useProjectStore((s) => s.updateAudioClip);
  const selectObject = useProjectStore((s) => s.selectObject);
  const sceneFrom =
    computeSceneTimings(project).find((entry) => entry.scene.id === sceneId)
      ?.from ?? 0;
  if (configured === false) {
    return (
      <div className="text-[11px] text-editor-muted mt-2 [line-height:1.5]">
        Voice generation unavailable.
      </div>
    );
  }
  return (
    <div className="mt-2">
      <VoiceSettingsFields />
      <Button
        variant="default"
        disabled={!text?.trim() || generating}
        onClick={async () => {
          if (!text?.trim()) return;
          const clip = await generate
            .mutateAsync({ text, label: text.trim().slice(0, 40) })
            .catch(() => null); // the message is shown from generate.error
          if (!clip) return;
          addAudioClip(clip.id, sceneFrom);
          const clips = useProjectStore.getState().project.audioClips ?? [];
          const inserted = clips[clips.length - 1];
          if (inserted) {
            updateAudioClip(inserted.id, {
              voiceText: text.trim(),
              // word timings → captions (see utils/captions.ts)
              ...(clip.words.length ? { words: clip.words } : {}),
            });
            selectObject(`audio-clip-${inserted.id}`);
          }
        }}
        className={`${!text?.trim() || generating ? "opacity-[0.5]" : "opacity-[1]"}`}
      >
        {generating ? "Generating…" : "🎙 Generate voiceover"}
      </Button>
      {generate.error ? (
        <div className="text-[10px] text-[#ff8a65] mt-1.5 whitespace-pre-wrap">
          {generate.error.message}
        </div>
      ) : null}
    </div>
  );
}
