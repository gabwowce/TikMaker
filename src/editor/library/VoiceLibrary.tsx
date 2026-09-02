import React from "react";
import { useProjectStore } from "../state/projectStore";
import { useVoiceVariantsStore, type VoiceVariant } from "../state/voiceVariantsStore";
import { sfxList, getSfx } from "../../registries/sfxRegistry";
import { editorColors } from "../theme";
import { useAudioWaveforms } from "../timeline/useAudioWaveforms";
import { setAudioDragPayload } from "../timeline/audioDrag";
import { voiceCutoffFrame } from "../../utils/voiceClips";
import { useCustomSfxStore } from "../state/customSfxStore";

/**
 * Every voiceover this video uses, every cut you kept, and every line you have
 * ever generated — in one place.
 *
 * The important thing this tab makes visible is that trimming is NOT
 * destructive. A timeline clip carries `startFrom`/`durationInFrames`; the MP3
 * behind it is whole and untouched, shared by every clip that points at it. So
 * "back to the original" is a reset of two numbers, and a cut worth keeping is
 * worth naming rather than re-making.
 */

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: editorColors.textDim,
  margin: "0 0 6px",
};

const card: React.CSSProperties = {
  padding: "9px 10px",
  borderRadius: 8,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
};

const smallButton: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 10,
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const seconds = (frames: number, fps: number) => `${(frames / fps).toFixed(2)}s`;

export const VoiceLibrary: React.FC = () => {
  const project = useProjectStore((s) => s.project);
  const playheadFrame = useProjectStore((s) => s.playheadFrame);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const updateAudioClip = useProjectStore((s) => s.updateAudioClip);
  const selectObject = useProjectStore((s) => s.selectObject);

  const uploadSfx = useCustomSfxStore((s) => s.upload);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);

  const variants = useVoiceVariantsStore((s) => s.variants);
  const saveVariant = useVoiceVariantsStore((s) => s.save);
  const renameVariant = useVoiceVariantsStore((s) => s.rename);
  const removeVariant = useVoiceVariantsStore((s) => s.remove);

  /** Every generated line, whether or not this video uses it. */
  const voices = sfxList.filter((entry) => entry.group === "voice");
  // The decoder is the only thing that knows how long a file actually is, and
  // it is the same one the timeline draws with — so the two can never disagree
  // about where "the original ends".
  const waveforms = useAudioWaveforms(voices.map((entry) => entry.src), project.fps);

  const voiceClips = (project.audioClips ?? []).filter((clip) => getSfx(clip.sfxId)?.group === "voice");

  /** Places a clip at the playhead and hands back its id, so every "use this"
   * button in here behaves identically. */
  const place = (
    sfxId: string,
    cut?: { startFrom?: number; durationInFrames?: number; volume?: number; playbackRate?: number }
  ) => {
    addAudioClip(sfxId, playheadFrame);
    const clips = useProjectStore.getState().project.audioClips ?? [];
    const inserted = clips[clips.length - 1];
    if (!inserted) return;
    if (cut) updateAudioClip(inserted.id, cut);
    selectObject(`audio-clip-${inserted.id}`);
  };

  const keepCut = (clip: NonNullable<typeof project.audioClips>[number]) => {
    const source = getSfx(clip.sfxId);
    const suggested = `${source?.label ?? "Iškarpa"} · ${seconds(clip.durationInFrames ?? 0, project.fps)}`;
    const name = window.prompt("Įsiminti šią iškarpą — pavadinimas", suggested);
    if (!name?.trim()) return;
    saveVariant(name.trim(), {
      sfxId: clip.sfxId,
      startFrom: clip.startFrom,
      durationInFrames: clip.durationInFrames,
      volume: clip.volume,
      playbackRate: clip.playbackRate,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={sectionTitle}>Šiame video ({voiceClips.length})</div>
        <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 8, lineHeight: 1.5 }}>
          Karpymas timeline'e originalaus įrašo nekeičia — keičiami tik klipo pradžios ir trukmės skaičiai. Todėl
          „grąžinti originalą" visada įmanoma.
        </div>
        {voiceClips.length === 0 ? (
          <div style={{ fontSize: 11, color: editorColors.textDim }}>Šis video dar neturi įgarsinimo.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {voiceClips.map((clip) => {
              const source = getSfx(clip.sfxId);
              const full = source ? waveforms.get(source.src)?.durationInFrames : undefined;
              const trimmed =
                (clip.startFrom ?? 0) > 0 ||
                (full !== undefined && clip.durationInFrames !== undefined && clip.durationInFrames < full);
              // Voice is monophonic (`utils/voiceClips.ts`), so a line that is
              // still speaking when the next one starts goes quiet instead of
              // doubling. That is the right sound, but it is silent about
              // itself — without this the words simply are not there and the
              // recording looks intact everywhere you check.
              const cutoff = voiceCutoffFrame(project.audioClips ?? [], clip);
              const audible = cutoff === undefined ? undefined : cutoff - clip.from;
              const wanted = clip.durationInFrames ?? full;
              const ducked = audible !== undefined && wanted !== undefined && audible < wanted;
              return (
                <div key={clip.id} style={card}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{source?.label ?? clip.sfxId}</div>
                  <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 6 }}>
                    {trimmed ? "apkarpytas" : "originalus"}
                    {clip.durationInFrames ? ` · ${seconds(clip.durationInFrames, project.fps)}` : ""}
                    {full ? ` iš ${seconds(full, project.fps)}` : ""}
                    {clip.playbackRate && clip.playbackRate !== 1 ? ` · ${clip.playbackRate}×` : ""}
                  </div>
                  {ducked ? (
                    <div
                      style={{ fontSize: 10, color: "#fbbf24", marginBottom: 6, lineHeight: 1.5 }}
                      title="Balsas yra monofoninis: vienu metu girdima tik viena eilutė. Patrauk kitą eilutę toliau arba pailgink sceną, kad tilptų visa."
                    >
                      ⚠ Nutildoma po {seconds(audible!, project.fps)} — čia prasideda kita balso eilutė
                      {wanted !== undefined ? ` (negirdima ${seconds(wanted - audible!, project.fps)})` : ""}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button style={smallButton} onClick={() => selectObject(`audio-clip-${clip.id}`)}>
                      Rodyti
                    </button>
                    <button
                      style={{ ...smallButton, opacity: trimmed ? 1 : 0.45 }}
                      disabled={!trimmed}
                      title="Grąžinti visą originalų įrašą — failas visą laiką buvo nepaliestas"
                      onClick={() =>
                        updateAudioClip(clip.id, {
                          startFrom: undefined,
                          durationInFrames: full,
                          playbackRate: undefined,
                        })
                      }
                    >
                      ↺ Originalas
                    </button>
                    <button style={smallButton} title="Įsiminti šį pjūvį pakartotiniam naudojimui" onClick={() => keepCut(clip)}>
                      💾 Įsiminti iškarpą
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div style={sectionTitle}>Įsimintos iškarpos ({variants.length})</div>
        <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 8, lineHeight: 1.5 }}>
          Bendros visiems video — paspaudus iškarpa įdedama ties balta linija.
        </div>
        {variants.length === 0 ? (
          <div style={{ fontSize: 11, color: editorColors.textDim }}>Kol kas nieko neįsiminta.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                  const next = window.prompt("Pervadinti iškarpą", variant.name);
                  if (next?.trim()) renameVariant(variant.id, next.trim());
                }}
                onRemove={() => {
                  if (window.confirm(`Pašalinti iškarpą „${variant.name}"? Originalus įrašas lieka.`)) {
                    removeVariant(variant.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={sectionTitle}>Visi įgarsinimai ({voices.length})</div>
          <button style={smallButton} disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Keliama…" : "＋ Įkelti savo"}
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          multiple
          style={{ display: "none" }}
          onChange={async (event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            if (!files.length) return;
            setUploading(true);
            setUploadError(null);
            try {
              // Uploaded as group "voice", which is the only thing that decides
              // where it shows up — an imported take and a generated one are the
              // same kind of thing to everything downstream.
              for (const file of files) await uploadSfx(file, file.name.replace(/\.[^.]+$/, ""), "voice");
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : String(err));
            } finally {
              setUploading(false);
            }
          }}
        />
        <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 8, lineHeight: 1.5 }}>
          Sugeneruoti ir įkelti įrašai. Paspaudus įdedamas ties balta linija — arba tempk kortelę tiesiai į timeline,
          kur nori.
        </div>
        {uploadError ? <div style={{ fontSize: 10, color: "#ff8a65", marginBottom: 6 }}>{uploadError}</div> : null}
        {voices.length === 0 ? (
          <div style={{ fontSize: 11, color: editorColors.textDim }}>
            Dar nieko nesugeneruota. Scenos Inspector'yje, sekcijoje „Įgarsinimas".
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {voices.map((voice) => {
              const length = waveforms.get(voice.src)?.durationInFrames;
              return (
                <div
                  key={voice.id}
                  draggable
                  onDragStart={(event) => setAudioDragPayload(event, { sfxId: voice.id })}
                  title="Tempk į timeline arba paspausk, kad įdėtum ties balta linija"
                  style={{ ...card, display: "flex", alignItems: "center", gap: 8, cursor: "grab" }}
                >
                  <button
                    onClick={() => place(voice.id)}
                    style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", color: editorColors.text, cursor: "pointer", padding: 0 }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {voice.label}
                    </div>
                    <div style={{ fontSize: 10, color: editorColors.textDim }}>
                      {length ? seconds(length, project.fps) : "…"}
                    </div>
                  </button>
                  <audio src={voice.src} controls preload="none" style={{ height: 26, width: 130 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const VariantCard: React.FC<{
  variant: VoiceVariant;
  fps: number;
  onUse: () => void;
  onRename: () => void;
  onRemove: () => void;
}> = ({ variant, fps, onUse, onRename, onRemove }) => (
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
    title="Tempk į timeline arba paspausk, kad įdėtum ties balta linija"
    style={{ ...card, display: "flex", alignItems: "center", gap: 6, cursor: "grab" }}
  >
    <button
      onClick={onUse}
      style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", color: editorColors.text, cursor: "pointer", padding: 0 }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {variant.name}
      </div>
      <div style={{ fontSize: 10, color: editorColors.textDim }}>
        {variant.durationInFrames ? `${(variant.durationInFrames / fps).toFixed(2)}s` : "visas"}
        {variant.startFrom ? ` · nuo ${(variant.startFrom / fps).toFixed(2)}s` : ""}
        {variant.playbackRate && variant.playbackRate !== 1 ? ` · ${variant.playbackRate}×` : ""}
      </div>
    </button>
    <button style={smallButton} title="Pervadinti" onClick={onRename}>
      ✎
    </button>
    <button style={smallButton} title="Pašalinti iškarpą" onClick={onRemove}>
      ✕
    </button>
  </div>
);
