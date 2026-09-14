import { Button, Checkbox, Slider } from "@mantine/core";
import { useEffect, useState } from "react";
import { computeSceneTimings } from "../../utils/duration";
import { usePreferences } from "../state/fileLibrary";
import { useProjectStore } from "../state/projectStore";
import { useVoiceStore } from "../state/voiceStore";

function VoiceSettingsFields() {
  const preferences = usePreferences();
  const setPreferences = usePreferences((s) => s.set);
  const defaults = useVoiceStore((s) => s.defaults);
  const [open, setOpen] = useState(false);
  if (!defaults) return null;
  function slider(
    label: string,
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    onChange: (value: number) => void,
  ) {
    const resolved = value ?? fallback;
    return (
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-editor-muted">
          <span>{label}</span>
          <span className="text-editor-text">
            {resolved.toFixed(2)}
            {value === undefined ? " · default" : ""}
          </span>
        </div>
        <Slider
          min={min}
          max={max}
          step={0.05}
          value={resolved}
          onChange={(value) => onChange(Number(value))}
          className="w-full"
        />
      </div>
    );
  }
  const overridden =
    preferences.voiceSpeed !== undefined ||
    preferences.voiceStability !== undefined ||
    preferences.voiceSimilarity !== undefined ||
    preferences.voiceStyle !== undefined ||
    preferences.voiceSpeakerBoost !== undefined;
  return (
    <div className="mb-2.5 pb-2 border-0 border-b border-solid border-editor-border">
      {slider(
        "Speaking speed",
        preferences.voiceSpeed,
        defaults.speed,
        0.7,
        1.2,
        (voiceSpeed) => setPreferences({ voiceSpeed }),
      )}

      <div className="flex gap-1.5">
        <Button variant="default" onClick={() => setOpen((value) => !value)}>
          {open ? "▾ Less" : "▸ More settings"}
        </Button>
        {overridden ? (
          <Button
            variant="default"
            aria-label="Restore server defaults"
            onClick={() =>
              setPreferences({
                voiceSpeed: undefined,
                voiceStability: undefined,
                voiceSimilarity: undefined,
                voiceStyle: undefined,
                voiceSpeakerBoost: undefined,
              })
            }
          >
            ↺ Defaults
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2">
          {slider(
            "Stability",
            preferences.voiceStability,
            defaults.stability,
            0,
            1,
            (voiceStability) => setPreferences({ voiceStability }),
          )}
          {slider(
            "Similarity",
            preferences.voiceSimilarity,
            defaults.similarityBoost,
            0,
            1,
            (voiceSimilarity) => setPreferences({ voiceSimilarity }),
          )}
          {slider(
            "Style exaggeration",
            preferences.voiceStyle,
            defaults.style,
            0,
            1,
            (voiceStyle) => setPreferences({ voiceStyle }),
          )}
          <label className="flex items-center gap-1.5 text-[10px] text-editor-muted">
            <Checkbox
              checked={preferences.voiceSpeakerBoost ?? defaults.speakerBoost}
              onChange={(event) =>
                setPreferences({ voiceSpeakerBoost: event.target.checked })
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
  const configured = useVoiceStore((s) => s.configured);
  const checkStatus = useVoiceStore((s) => s.checkStatus);
  const generate = useVoiceStore((s) => s.generate);
  const generating = useVoiceStore((s) => s.generating.includes(sceneId));
  const error = useVoiceStore((s) => s.error);
  const project = useProjectStore((s) => s.project);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const updateAudioClip = useProjectStore((s) => s.updateAudioClip);
  const selectObject = useProjectStore((s) => s.selectObject);
  const preferences = usePreferences();
  useEffect(() => {
    if (configured === null) void checkStatus();
  }, [configured, checkStatus]);
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
          const clip = await generate({
            text,
            label: text.trim().slice(0, 40),
            key: sceneId,
            settings: {
              speed: preferences.voiceSpeed,
              stability: preferences.voiceStability,
              similarityBoost: preferences.voiceSimilarity,
              style: preferences.voiceStyle,
              speakerBoost: preferences.voiceSpeakerBoost,
            },
          });
          if (!clip) return;
          addAudioClip(clip.id, sceneFrom);
          const clips = useProjectStore.getState().project.audioClips ?? [];
          const inserted = clips[clips.length - 1];
          if (inserted) {
            updateAudioClip(inserted.id, { voiceText: text.trim() });
            selectObject(`audio-clip-${inserted.id}`);
          }
        }}
        className={`${!text?.trim() || generating ? "opacity-[0.5]" : "opacity-[1]"}`}
      >
        {generating ? "Generating…" : "🎙 Generate voiceover"}
      </Button>
      {error ? (
        <div className="text-[10px] text-[#ff8a65] mt-1.5 whitespace-pre-wrap">
          {error}
        </div>
      ) : null}
    </div>
  );
}
