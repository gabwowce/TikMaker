import { ActionIcon, Button, NativeSelect, TextInput } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import {
  sfxList,
  type SfxDefinition,
  type SfxGroup,
} from "../../registries/sfxRegistry";
import type { SfxDefaultKind } from "../../video/motion/sfxDefaults";
import { useCustomSfxStore } from "../state/customSfxStore";
import { useProjectStore } from "../state/projectStore";
import { useSfxOverridesStore } from "../state/sfxOverridesStore";

const sfxGroups: SfxGroup[] = [
  "voice",
  "impact",
  "reveal",
  "transition",
  "text",
  "ui",
  "success",
  "misc",
];
const entrancePresets = [
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleIn",
  "pop",
  "fade",
];
const exitPresets = [
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "scaleOut",
  "fade",
];
function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | undefined>();
  function play(sfx: SfxDefinition) {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.pause();
    audio.src = sfx.src;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setPlayingId(sfx.id);
    audio.onended = () => setPlayingId(undefined);
  }
  return { play, playingId };
}
function DefaultsSection() {
  const overrides = useSfxOverridesStore((s) => s.overrides);
  const load = useSfxOverridesStore((s) => s.load);
  const setEntranceDefault = useSfxOverridesStore((s) => s.setEntranceDefault);
  const setExitDefault = useSfxOverridesStore((s) => s.setExitDefault);
  const [kind, setKind] = useState<SfxDefaultKind>("content");
  useEffect(() => {
    load();
  }, [load]);
  const sfxByGroupSorted = sfxGroups
    .map(
      (group) =>
        [group, sfxList.filter((s) => s.group === group)] as [
          SfxGroup,
          SfxDefinition[],
        ],
    )
    .filter(([, list]) => list.length > 0);
  type PickerProps = {
    value: string | undefined;
    onChange: (v: string | undefined) => void;
  };
  function Picker({ value, onChange }: PickerProps) {
    return (
      <NativeSelect
        className="w-full"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">Built-in default</option>
        <option value="none">No sound</option>
        {sfxByGroupSorted.map(([group, list]) => (
          <optgroup key={group} label={group}>
            {list.map((sfx) => (
              <option key={sfx.id} value={sfx.id}>
                {sfx.label}
              </option>
            ))}
          </optgroup>
        ))}
      </NativeSelect>
    );
  }
  const kindBucket = overrides[kind] ?? {};
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Defaults
      </div>
      <div className="flex gap-1 mb-2.5">
        {(
          [
            ["content", "Text / content"],
            ["visual", "Visual"],
          ] as [SfxDefaultKind, string][]
        ).map(([k, label]) => (
          <Button
            variant="default"
            key={k}
            onClick={() => setKind(k)}
            className={`flex-1 ${kind === k ? "bg-editor-accent" : "bg-editor-panel-raised"} ${kind === k ? "text-[#111]" : "text-editor-text"}`}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-[1px] text-editor-muted m-[8px_0_6px]">
        Entrance
      </div>
      <div className="flex flex-col gap-1.5 mb-2">
        {entrancePresets.map((preset) => (
          <div key={preset} className="flex items-center gap-2">
            <div className="w-18 text-[11px] text-editor-text">{preset}</div>
            <div className="flex-1">
              <Picker
                value={kindBucket.entrance?.[preset]}
                onChange={(v) => setEntranceDefault(kind, preset, v)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] uppercase tracking-[1px] text-editor-muted m-[8px_0_6px]">
        Exit
      </div>
      <div className="flex flex-col gap-1.5">
        {exitPresets.map((preset) => (
          <div key={preset} className="flex items-center gap-2">
            <div className="w-18 text-[11px] text-editor-text">{preset}</div>
            <div className="flex-1">
              <Picker
                value={kindBucket.exit?.[preset]}
                onChange={(v) => setExitDefault(kind, preset, v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function UploadForm() {
  const upload = useCustomSfxStore((s) => s.upload);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [group, setGroup] = useState<SfxGroup>("misc");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  async function handleUpload() {
    if (!file || !label.trim()) return;
    setBusy(true);
    setError(undefined);
    try {
      await upload(file, label.trim(), group);
      setFile(null);
      setLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-lg [border:1px_dashed_#2c2c2c] mb-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-[11px] text-editor-muted"
      />
      <TextInput
        className="w-full"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name this sound (e.g. 'card flip')"
      />
      <NativeSelect
        className="w-full"
        value={group}
        onChange={(e) => setGroup(e.target.value as SfxGroup)}
      >
        {sfxGroups.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </NativeSelect>
      <Button
        variant="default"
        className={`w-full ${file && label.trim() && !busy ? "cursor-pointer" : "[cursor:not-allowed]"} ${file && label.trim() && !busy ? "opacity-[1]" : "opacity-[0.5]"}`}
        disabled={!file || !label.trim() || busy}
        onClick={handleUpload}
      >
        {busy ? "Uploading…" : "Import sound"}
      </Button>
      {error ? <div className="text-[11px] text-[#ff8a65]">{error}</div> : null}
    </div>
  );
}
type SfxRowProps = {
  sfx: SfxDefinition;
  playing: boolean;
  onPlay: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
};
function SfxRow({ sfx, playing, onPlay, onDelete, onAdd }: SfxRowProps) {
  return (
    <div className="flex items-center gap-1.5 p-[5px_8px] bg-editor-panel-raised rounded-md">
      <Button
        variant="default"
        aria-label="Preview"
        onClick={onPlay}
        className={`w-5 shrink-0 ${playing ? "bg-editor-accent" : "bg-editor-panel"} ${playing ? "text-[#111]" : "text-editor-text"}`}
      >
        {playing ? "■" : "▶"}
      </Button>
      <span className="flex-1 text-[11px] text-editor-text overflow-hidden text-ellipsis whitespace-nowrap">
        {sfx.label}
      </span>
      <span className="text-[10px] text-editor-muted">{sfx.group}</span>
      {onAdd ? (
        <ActionIcon
          variant="default"
          aria-label="Add to the video timeline at the playhead"
          onClick={onAdd}
          className="w-5.5"
        >
          +
        </ActionIcon>
      ) : null}
      {onDelete ? (
        <ActionIcon
          variant="default"
          aria-label={`Remove "${sfx.label}"`}
          onClick={onDelete}
          className="w-4.5 shrink-0"
        >
          ✕
        </ActionIcon>
      ) : null}
    </div>
  );
}
export function SoundLibrary() {
  const loadCustomSfx = useCustomSfxStore((s) => s.load);
  const removeCustomSfx = useCustomSfxStore((s) => s.remove);
  const { play, playingId } = usePlayer();
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  useEffect(() => {
    loadCustomSfx();
  }, [loadCustomSfx]);
  const builtIn = sfxList.filter((s) => !s.custom);
  const custom = sfxList.filter((s) => s.custom);
  return (
    <div>
      <DefaultsSection />

      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Import sound
      </div>
      <UploadForm />

      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Custom ({custom.length})
      </div>
      {custom.length === 0 ? (
        <div className="text-[11px] text-editor-muted mb-2">No sounds</div>
      ) : (
        <div className="flex flex-col gap-1 mb-2">
          {custom.map((sfx) => (
            <SfxRow
              key={sfx.id}
              sfx={sfx}
              playing={playingId === sfx.id}
              onPlay={() => play(sfx)}
              onAdd={() => addAudioClip(sfx.id)}
              onDelete={() => removeCustomSfx(sfx.id)}
            />
          ))}
        </div>
      )}

      <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[12px_0_6px]">
        Built-in ({builtIn.length})
      </div>
      <div className="flex flex-col gap-1">
        {builtIn.map((sfx) => (
          <SfxRow
            key={sfx.id}
            sfx={sfx}
            playing={playingId === sfx.id}
            onPlay={() => play(sfx)}
            onAdd={() => addAudioClip(sfx.id)}
          />
        ))}
      </div>
    </div>
  );
}
