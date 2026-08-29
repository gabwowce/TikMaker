import React, { useEffect, useRef, useState } from "react";
import { sfxList, type SfxGroup, type SfxDefinition } from "../../registries/sfxRegistry";
import { useCustomSfxStore } from "../state/customSfxStore";
import { useSfxOverridesStore } from "../state/sfxOverridesStore";
import type { SfxDefaultKind } from "../../video/motion/sfxDefaults";
import { editorColors } from "../theme";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: editorColors.textDim,
  margin: "12px 0 6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  fontSize: 13,
  boxSizing: "border-box",
};

const rowSelectStyle: React.CSSProperties = { ...inputStyle, fontSize: 11, padding: "6px 8px" };

const sfxGroups: SfxGroup[] = ["impact", "reveal", "transition", "text", "ui", "success", "misc"];

const entrancePresets = ["slideUp", "slideDown", "slideLeft", "slideRight", "scaleIn", "pop", "fade"];
const exitPresets = ["slideUp", "slideDown", "slideLeft", "slideRight", "scaleOut", "fade"];

/** Plays one sfx via a shared <audio> element so only one preview plays at a time. */
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

const DefaultsSection: React.FC = () => {
  const overrides = useSfxOverridesStore((s) => s.overrides);
  const load = useSfxOverridesStore((s) => s.load);
  const setEntranceDefault = useSfxOverridesStore((s) => s.setEntranceDefault);
  const setExitDefault = useSfxOverridesStore((s) => s.setExitDefault);

  const [kind, setKind] = useState<SfxDefaultKind>("content");

  useEffect(() => {
    load();
  }, [load]);

  const sfxByGroupSorted = sfxGroups
    .map((group) => [group, sfxList.filter((s) => s.group === group)] as [SfxGroup, SfxDefinition[]])
    .filter(([, list]) => list.length > 0);

  const Picker: React.FC<{ value: string | undefined; onChange: (v: string | undefined) => void }> = ({
    value,
    onChange,
  }) => (
    <select
      style={rowSelectStyle}
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
    </select>
  );

  const kindBucket = overrides[kind] ?? {};

  return (
    <div>
      <div style={sectionTitleStyle}>Defaults</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {(
          [
            ["content", "Text / content"],
            ["visual", "Visual"],
          ] as [SfxDefaultKind, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            style={{
              flex: 1,
              padding: "6px 0",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: `1px solid ${editorColors.border}`,
              background: kind === k ? editorColors.accent : editorColors.panelElevated,
              color: kind === k ? "#111" : editorColors.text,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 8 }}>
        {kind === "content"
          ? "Applies to the scene's badge/eyebrow/headline/body cue and to Blocks / Rich Headline lines."
          : "Applies to a scene's primary visual (the main image/graphic) entrance and exit."}
      </div>

      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: editorColors.textDim, margin: "8px 0 6px" }}>
        Entrance
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {entrancePresets.map((preset) => (
          <div key={preset} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 72, fontSize: 11, color: editorColors.text }}>{preset}</div>
            <div style={{ flex: 1 }}>
              <Picker value={kindBucket.entrance?.[preset]} onChange={(v) => setEntranceDefault(kind, preset, v)} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: editorColors.textDim, margin: "8px 0 6px" }}>
        Exit
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {exitPresets.map((preset) => (
          <div key={preset} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 72, fontSize: 11, color: editorColors.text }}>{preset}</div>
            <div style={{ flex: 1 }}>
              <Picker value={kindBucket.exit?.[preset]} onChange={(v) => setExitDefault(kind, preset, v)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UploadForm: React.FC = () => {
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 10,
        borderRadius: 8,
        border: `1px dashed ${editorColors.border}`,
        marginBottom: 8,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        style={{ fontSize: 11, color: editorColors.textDim }}
      />
      <input
        style={inputStyle}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Name this sound (e.g. 'card flip')"
      />
      <select style={rowSelectStyle} value={group} onChange={(e) => setGroup(e.target.value as SfxGroup)}>
        {sfxGroups.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <button
        style={{
          ...inputStyle,
          cursor: file && label.trim() && !busy ? "pointer" : "not-allowed",
          opacity: file && label.trim() && !busy ? 1 : 0.5,
        }}
        disabled={!file || !label.trim() || busy}
        onClick={handleUpload}
      >
        {busy ? "Uploading…" : "Import sound"}
      </button>
      {error ? <div style={{ fontSize: 11, color: "#ff8a65" }}>{error}</div> : null}
    </div>
  );
};

const SfxRow: React.FC<{
  sfx: SfxDefinition;
  playing: boolean;
  onPlay: () => void;
  onDelete?: () => void;
}> = ({ sfx, playing, onPlay, onDelete }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 8px",
      background: editorColors.panelElevated,
      borderRadius: 6,
    }}
  >
    <button
      title="Preview"
      onClick={onPlay}
      style={{
        width: 20,
        height: 20,
        lineHeight: "18px",
        padding: 0,
        borderRadius: 4,
        border: `1px solid ${editorColors.border}`,
        background: playing ? editorColors.accent : editorColors.panel,
        color: playing ? "#111" : editorColors.text,
        fontSize: 10,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {playing ? "■" : "▶"}
    </button>
    <span style={{ flex: 1, fontSize: 11, color: editorColors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {sfx.label}
    </span>
    <span style={{ fontSize: 10, color: editorColors.textDim }}>{sfx.group}</span>
    {onDelete ? (
      <button
        title={`Remove "${sfx.label}"`}
        onClick={onDelete}
        style={{
          width: 18,
          height: 18,
          lineHeight: "16px",
          padding: 0,
          borderRadius: 4,
          border: `1px solid ${editorColors.border}`,
          background: editorColors.panel,
          color: editorColors.textDim,
          fontSize: 10,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    ) : null}
  </div>
);

export const SoundLibrary: React.FC = () => {
  const customSfx = useCustomSfxStore((s) => s.sfx);
  const loadCustomSfx = useCustomSfxStore((s) => s.load);
  const removeCustomSfx = useCustomSfxStore((s) => s.remove);
  const { play, playingId } = usePlayer();

  useEffect(() => {
    loadCustomSfx();
  }, [loadCustomSfx]);

  const builtIn = sfxList.filter((s) => !s.custom);
  const custom = sfxList.filter((s) => s.custom);

  return (
    <div>
      <DefaultsSection />

      <div style={sectionTitleStyle}>Import sound</div>
      <UploadForm />

      <div style={sectionTitleStyle}>Custom ({custom.length})</div>
      {custom.length === 0 ? (
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 8 }}>
          No imported sounds yet — use the form above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {custom.map((sfx) => (
            <SfxRow
              key={sfx.id}
              sfx={sfx}
              playing={playingId === sfx.id}
              onPlay={() => play(sfx)}
              onDelete={() => removeCustomSfx(sfx.id)}
            />
          ))}
        </div>
      )}

      <div style={sectionTitleStyle}>Built-in ({builtIn.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {builtIn.map((sfx) => (
          <SfxRow key={sfx.id} sfx={sfx} playing={playingId === sfx.id} onPlay={() => play(sfx)} />
        ))}
      </div>
    </div>
  );
};
