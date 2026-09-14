import { Button, UnstyledButton } from "@mantine/core";
import { useRef, useState } from "react";
import { getSfx, sfxList } from "../../registries/sfxRegistry";
import { projectDurationInFrames } from "../../utils/duration";
import { useCustomSfxStore } from "../state/customSfxStore";
import { useProjectStore } from "../state/projectStore";
import {
  useVoiceVariantsStore,
  type VoiceVariant,
} from "../state/voiceVariantsStore";
import { setAudioDragPayload } from "../timeline/audioDrag";
import { useAudioWaveforms } from "../timeline/useAudioWaveforms";

function seconds(frames: number, fps: number) {
  return `${(frames / fps).toFixed(2)}s`;
}
export function VoiceLibrary() {
  const project = useProjectStore((s) => s.project);
  const totalFrames = projectDurationInFrames(project);
  const playheadFrame = useProjectStore((s) => s.playheadFrame);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const updateAudioClip = useProjectStore((s) => s.updateAudioClip);
  const selectObject = useProjectStore((s) => s.selectObject);
  const uploadSfx = useCustomSfxStore((s) => s.upload);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const variants = useVoiceVariantsStore((s) => s.variants);
  const saveVariant = useVoiceVariantsStore((s) => s.save);
  const renameVariant = useVoiceVariantsStore((s) => s.rename);
  const removeVariant = useVoiceVariantsStore((s) => s.remove);
  const voices = sfxList.filter((entry) => entry.group === "voice");
  const waveforms = useAudioWaveforms(
    voices.map((entry) => entry.src),
    project.fps,
  );
  const voiceClips = (project.audioClips ?? []).filter(
    (clip) => getSfx(clip.sfxId)?.group === "voice",
  );
  function place(
    sfxId: string,
    cut?: {
      startFrom?: number;
      durationInFrames?: number;
      volume?: number;
      playbackRate?: number;
    },
  ) {
    addAudioClip(sfxId, playheadFrame);
    const clips = useProjectStore.getState().project.audioClips ?? [];
    const inserted = clips[clips.length - 1];
    if (!inserted) return;
    if (cut) updateAudioClip(inserted.id, cut);
    selectObject(`audio-clip-${inserted.id}`);
  }
  function keepCut(clip: NonNullable<typeof project.audioClips>[number]) {
    const source = getSfx(clip.sfxId);
    const suggested = `${source?.label ?? "Clip"} · ${seconds(clip.durationInFrames ?? 0, project.fps)}`;
    const name = window.prompt("Save clip variant — name", suggested);
    if (!name?.trim()) return;
    saveVariant(name.trim(), {
      sfxId: clip.sfxId,
      startFrom: clip.startFrom,
      durationInFrames: clip.durationInFrames,
      volume: clip.volume,
      playbackRate: clip.playbackRate,
    });
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[0_0_6px]">
          In this video ({voiceClips.length})
        </div>

        {voiceClips.length === 0 ? (
          <div className="text-[11px] text-editor-muted">
            This video has no voiceover yet.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {voiceClips.map((clip) => {
              const source = getSfx(clip.sfxId);
              const full = source
                ? waveforms.get(source.src)?.durationInFrames
                : undefined;
              const trimmed =
                (clip.startFrom ?? 0) > 0 ||
                (full !== undefined &&
                  clip.durationInFrames !== undefined &&
                  clip.durationInFrames < full);
              const wanted = clip.durationInFrames ?? full;
              const overrun =
                wanted === undefined
                  ? 0
                  : Math.max(0, clip.from + wanted - totalFrames);
              return (
                <div
                  key={clip.id}
                  className="p-[9px_10px] rounded-lg border border-solid border-editor-border bg-editor-panel-raised text-editor-text"
                >
                  <div className="text-[11px] font-semibold mb-0.5">
                    {source?.label ?? clip.sfxId}
                  </div>
                  <div className="text-[10px] text-editor-muted mb-1.5">
                    {trimmed ? "trimmed" : "original"}
                    {clip.durationInFrames
                      ? ` · ${seconds(clip.durationInFrames, project.fps)}`
                      : ""}
                    {full ? ` of ${seconds(full, project.fps)}` : ""}
                    {clip.playbackRate && clip.playbackRate !== 1
                      ? ` · ${clip.playbackRate}×`
                      : ""}
                  </div>
                  <div className="flex gap-[5px] flex-wrap">
                    <Button
                      variant="default"
                      onClick={() => selectObject(`audio-clip-${clip.id}`)}
                    >
                      Show
                    </Button>
                    <Button
                      variant="default"
                      className={`${trimmed ? "opacity-[1]" : "opacity-[0.45]"}`}
                      disabled={!trimmed}
                      aria-label="Restore the full original recording"
                      onClick={() =>
                        updateAudioClip(clip.id, {
                          startFrom: undefined,
                          durationInFrames: full,
                          playbackRate: undefined,
                        })
                      }
                    >
                      ↺ Original
                    </Button>
                    <Button
                      variant="default"
                      aria-label="Save this clip variant for reuse"
                      onClick={() => keepCut(clip)}
                    >
                      💾 Save clip variant
                    </Button>
                    {overrun > 0 && full !== undefined ? (
                      <Button
                        variant="default"
                        aria-label="Use the full clip duration and extend the video to fit the whole line"
                        onClick={() =>
                          updateAudioClip(clip.id, { durationInFrames: full })
                        }
                      >
                        ⤢ Fit
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[0_0_6px]">
          Saved clip variants ({variants.length})
        </div>

        {variants.length === 0 ? (
          <div className="text-[11px] text-editor-muted">
            No saved clip variants yet.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {variants.map((variant) => (
              <VariantCard
                key={variant.id}
                variant={variant}
                fps={project.fps}
                onUse={() =>
                  place(variant.sfxId, {
                    startFrom: variant.startFrom,
                    durationInFrames: variant.durationInFrames,
                    volume: variant.volume,
                    playbackRate: variant.playbackRate,
                  })
                }
                onRename={() => {
                  const next = window.prompt(
                    "Rename clip variant",
                    variant.name,
                  );
                  if (next?.trim()) renameVariant(variant.id, next.trim());
                }}
                onRemove={() => {
                  if (
                    window.confirm(
                      `Remove clip variant “${variant.name}”? The original recording will be kept.`,
                    )
                  ) {
                    removeVariant(variant.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[0_0_6px]">
            All voiceovers ({voices.length})
          </div>
          <Button
            variant="default"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? "Uploading…" : "＋ Upload audio"}
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={async (event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (!files.length) return;
            setUploading(true);
            setUploadError(null);
            try {
              for (const file of files)
                await uploadSfx(
                  file,
                  file.name.replace(/\.[^.]+$/, ""),
                  "voice",
                );
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : String(err));
            } finally {
              setUploading(false);
            }
          }}
        />

        {uploadError ? (
          <div className="text-[10px] text-[#ff8a65] mb-1.5">{uploadError}</div>
        ) : null}
        {voices.length === 0 ? (
          <div className="text-[11px] text-editor-muted">No voiceovers</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {voices.map((voice) => {
              const length = waveforms.get(voice.src)?.durationInFrames;
              return (
                <div
                  key={voice.id}
                  draggable
                  onDragStart={(event) =>
                    setAudioDragPayload(event, { sfxId: voice.id })
                  }
                  className="p-[9px_10px] rounded-lg border border-solid border-editor-border bg-editor-panel-raised text-editor-text flex items-center gap-2 cursor-grab"
                >
                  <UnstyledButton
                    onClick={() => place(voice.id)}
                    className="flex-1 min-w-0 block min-w-0 rounded-md p-2 text-left"
                  >
                    <div className="text-[11px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
                      {voice.label}
                    </div>
                    <div className="text-[10px] text-editor-muted">
                      {length ? seconds(length, project.fps) : "…"}
                    </div>
                  </UnstyledButton>
                  <audio
                    src={voice.src}
                    controls
                    preload="none"
                    className="h-6.5 w-[130px]"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
type VariantCardProps = {
  variant: VoiceVariant;
  fps: number;
  onUse: () => void;
  onRename: () => void;
  onRemove: () => void;
};
function VariantCard({
  variant,
  fps,
  onUse,
  onRename,
  onRemove,
}: VariantCardProps) {
  return (
    <div
      draggable
      onDragStart={(event) =>
        setAudioDragPayload(event, {
          sfxId: variant.sfxId,
          cut: {
            startFrom: variant.startFrom,
            durationInFrames: variant.durationInFrames,
            volume: variant.volume,
            playbackRate: variant.playbackRate,
          },
        })
      }
      className="p-[9px_10px] rounded-lg border border-solid border-editor-border bg-editor-panel-raised text-editor-text flex items-center gap-1.5 cursor-grab"
    >
      <UnstyledButton
        onClick={onUse}
        className="flex-1 min-w-0 block min-w-0 rounded-md p-2 text-left"
      >
        <div className="text-[11px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap">
          {variant.name}
        </div>
        <div className="text-[10px] text-editor-muted">
          {variant.durationInFrames
            ? `${(variant.durationInFrames / fps).toFixed(2)}s`
            : "full"}
          {variant.startFrom
            ? ` · from ${(variant.startFrom / fps).toFixed(2)}s`
            : ""}
          {variant.playbackRate && variant.playbackRate !== 1
            ? ` · ${variant.playbackRate}×`
            : ""}
        </div>
      </UnstyledButton>
      <Button variant="default" aria-label="Rename" onClick={onRename}>
        ✎
      </Button>
      <Button
        variant="default"
        aria-label="Remove clip variant"
        onClick={onRemove}
      >
        ✕
      </Button>
    </div>
  );
}
