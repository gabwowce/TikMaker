import React, { useMemo, useRef, useState } from "react";
import { editorColors } from "../theme";
import { useStoryboardStore } from "../state/storyboardStore";
import { useProjectStore } from "../state/projectStore";
import { storyboardToProject } from "../../utils/storyboardToProject";
import { voDurationSeconds } from "../../utils/pacing";
import {
  beatRoleRegistry,
  beatRoleSchema,
  getBeatRole,
  storyboardDurationSeconds,
  storyboardStatusSchema,
  type BeatRole,
  type StoryboardBeat,
} from "../../schema/storyboard";

/**
 * The script layer's whole UI: write the beats, order them, watch the running
 * time, then hand the result to the scene editor once.
 *
 * It deliberately does NOT show the Player. A storyboard is written before
 * anything is designed, and putting a preview next to it invites exactly the
 * thing this layer exists to postpone — fiddling with how a frame looks while
 * the sentence on it is still wrong.
 */
export const StoryboardView: React.FC<{ onGenerated: () => void }> = ({ onGenerated }) => {
  const storyboard = useStoryboardStore((s) => s.storyboard);
  const index = useStoryboardStore((s) => s.index);
  const selectedBeatId = useStoryboardStore((s) => s.selectedBeatId);
  const importError = useStoryboardStore((s) => s.importError);
  const create = useStoryboardStore((s) => s.create);
  const open = useStoryboardStore((s) => s.open);
  const remove = useStoryboardStore((s) => s.remove);
  const save = useStoryboardStore((s) => s.save);
  const importJson = useStoryboardStore((s) => s.importJson);
  const exportJson = useStoryboardStore((s) => s.exportJson);
  const updateTitle = useStoryboardStore((s) => s.updateTitle);
  const updateStatus = useStoryboardStore((s) => s.updateStatus);
  const updateTargetDuration = useStoryboardStore((s) => s.updateTargetDuration);
  const addBeat = useStoryboardStore((s) => s.addBeat);
  const removeBeat = useStoryboardStore((s) => s.removeBeat);
  const reorderBeats = useStoryboardStore((s) => s.reorderBeats);
  const selectBeat = useStoryboardStore((s) => s.selectBeat);
  const loadProject = useProjectStore((s) => s.loadProject);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // The dragged row is tracked in a ref as well as in state: the state copy
  // drives the dimmed/insertion-line rendering, but `onDrop` has to READ it, and
  // a handler closed over a batched state update can still see the pre-drag
  // value. The ref is always current by the time the drop lands.
  const dragIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  function endDrag() {
    dragIndexRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }

  const total = useMemo(
    () => (storyboard ? storyboardDurationSeconds(storyboard, voDurationSeconds) : 0),
    [storyboard]
  );

  function handleExport() {
    if (!storyboard) return;
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${storyboard.id}.storyboard.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** The one crossing into the scene layer. It opens a NEW project rather than
   * merging into whatever is open — regenerating over hand-edited scenes would
   * silently discard the design work the storyboard was handed off to. */
  function handleGenerate() {
    if (!storyboard || storyboard.beats.length === 0) return;
    const existing = useProjectStore.getState().project;
    const warn =
      existing.scenes.length > 0
        ? `Generate ${storyboard.beats.length} placeholder scenes as a NEW project? "${existing.title}" stays as it is.`
        : `Generate ${storyboard.beats.length} placeholder scenes?`;
    if (!window.confirm(warn)) return;
    loadProject(storyboardToProject(storyboard));
    onGenerated();
  }

  if (!storyboard) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: editorColors.textDim, marginBottom: 12 }}>
            No storyboard yet — write the script before you design anything.
          </div>
          <button style={primaryButtonStyle} onClick={() => create("Untitled storyboard")}>
            + New Storyboard
          </button>
        </div>
      </div>
    );
  }

  const selectedBeat = storyboard.beats.find((b) => b.id === selectedBeatId) ?? null;
  const selectedIndex = storyboard.beats.findIndex((b) => b.id === selectedBeatId);
  const over = storyboard.targetDuration !== undefined && total > storyboard.targetDuration;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Action bar — storyboard-scoped, so it can't be confused with the
          project's own Save/Export sitting in the app header. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderBottom: `1px solid ${editorColors.border}`,
          background: editorColors.panel,
        }}
      >
        <input
          value={storyboard.title}
          onChange={(e) => updateTitle(e.target.value)}
          style={{ ...inputStyle, width: 220, fontWeight: 600 }}
        />
        <select
          value={storyboard.status}
          onChange={(e) => updateStatus(storyboardStatusSchema.parse(e.target.value))}
          style={{ ...inputStyle, width: 110 }}
        >
          {storyboardStatusSchema.options.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 11, color: editorColors.textDim, display: "flex", alignItems: "center", gap: 6 }}>
          Target
          <input
            type="number"
            min={1}
            step={1}
            value={storyboard.targetDuration ?? ""}
            placeholder="—"
            onChange={(e) => updateTargetDuration(e.target.value === "" ? undefined : Number(e.target.value))}
            style={{ ...inputStyle, width: 64 }}
          />
          s
        </label>
        <span style={{ fontSize: 12, color: over ? "#ff8a65" : editorColors.textDim }}>
          {storyboard.beats.length} beats · ~{total.toFixed(1)}s{over ? " over target" : ""}
        </span>

        <div style={{ flex: 1 }} />
        {importError ? (
          <span style={{ fontSize: 11, color: "#ff8a65", maxWidth: 260 }} title={importError}>
            Import failed: {importError}
          </span>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) importJson(await file.text());
            e.target.value = "";
          }}
        />
        <button style={buttonStyle} onClick={() => fileInputRef.current?.click()}>
          Import JSON
        </button>
        <button style={buttonStyle} onClick={handleExport}>
          Export JSON
        </button>
        <button style={buttonStyle} onClick={save} title="Save this storyboard to the local library">
          Save Storyboard
        </button>
        <button style={primaryButtonStyle} onClick={handleGenerate} title="Turn every beat into a placeholder scene">
          Generate Scenes
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Storyboards + the role palette */}
        <div
          style={{
            width: "clamp(220px, 16vw, 300px)",
            flexShrink: 0,
            borderRight: `1px solid ${editorColors.border}`,
            background: editorColors.panel,
            overflowY: "auto",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={sectionLabelStyle}>Storyboards</div>
          {index.map((entry) => (
            <div key={entry.id} style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => open(entry.id)}
                style={{
                  ...listItemStyle,
                  flex: 1,
                  borderColor: entry.id === storyboard.id ? editorColors.accent : editorColors.border,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{entry.title}</div>
                <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 2 }}>{entry.beats} beats</div>
              </button>
              <button
                style={{ ...smallButtonStyle, alignSelf: "stretch" }}
                title="Delete storyboard"
                onClick={() => {
                  if (window.confirm(`Delete storyboard "${entry.title}"?`)) remove(entry.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button style={buttonStyle} onClick={() => create(window.prompt("Storyboard title", "Untitled storyboard") || "Untitled storyboard")}>
            + New Storyboard
          </button>

          <div style={{ ...sectionLabelStyle, marginTop: 10 }}>Add beat</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {beatRoleRegistry.map((role) => (
              <button
                key={role.role}
                style={smallButtonStyle}
                title={role.defaultPurpose}
                onClick={() => addBeat(role.role, selectedIndex === -1 ? undefined : selectedIndex)}
              >
                + {role.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: editorColors.textDim, lineHeight: 1.5 }}>
            A beat is added after the selected one. Each role decides which scene type it generates.
          </div>
        </div>

        {/* Overview — the ordered list, drag to reorder */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Storyboard Overview</div>
          <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 12 }}>
            Drag a row to reorder. Click one to edit it on the right.
          </div>

          {storyboard.beats.map((beat, i) => {
            const role = getBeatRole(beat.role);
            const seconds = beatSeconds(beat);
            const isSelected = beat.id === selectedBeatId;
            return (
              <div
                key={beat.id}
                draggable
                onDragStart={() => {
                  dragIndexRef.current = i;
                  setDragIndex(i);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropIndex(i);
                }}
                onDragEnd={endDrag}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current;
                  if (from !== null) reorderBeats(from, i);
                  endDrag();
                }}
                onClick={() => selectBeat(beat.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  marginBottom: 6,
                  borderRadius: 8,
                  cursor: "pointer",
                  background: editorColors.panelElevated,
                  border: `1px solid ${isSelected ? editorColors.accent : editorColors.border}`,
                  borderTop:
                    dropIndex === i && dragIndex !== null && dragIndex !== i
                      ? `2px solid ${editorColors.accent}`
                      : `1px solid ${isSelected ? editorColors.accent : editorColors.border}`,
                  opacity: dragIndex === i ? 0.4 : 1,
                }}
              >
                <span style={{ color: editorColors.textDim, cursor: "grab", fontSize: 13 }} title="Drag to reorder">
                  ⠿
                </span>
                <span style={roleChipStyle}>{role.label.toUpperCase()}</span>
                <span style={{ flex: 1, fontSize: 12, color: editorColors.text }}>
                  {beat.onScreenText || beat.voiceover || (
                    <span style={{ color: editorColors.textDim }}>{beat.purpose || "Empty beat"}</span>
                  )}
                </span>
                <span style={{ fontSize: 11, color: editorColors.textDim }}>{seconds.toFixed(1)}s</span>
                <button
                  style={smallButtonStyle}
                  title="Delete beat"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBeat(beat.id);
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          <button style={{ ...buttonStyle, width: "100%", marginTop: 6 }} onClick={() => addBeat("step")}>
            + Add Beat
          </button>
        </div>

        <BeatInspector beat={selectedBeat} index={selectedIndex} count={storyboard.beats.length} />
      </div>

      <BeatStrip />
    </div>
  );
};

/** A beat's planned length: what was typed, else what the VO takes to say. The
 * fallback is what keeps the header total meaningful while the durations are
 * still blank — the same content-derives-length rule as `resolveSceneDuration`,
 * just without the on-screen-reading half, which doesn't exist yet. */
function beatSeconds(beat: StoryboardBeat): number {
  if (typeof beat.durationSeconds === "number") return beat.durationSeconds;
  return beat.voiceover ? voDurationSeconds(beat.voiceover) : 0;
}

const BeatInspector: React.FC<{ beat: StoryboardBeat | null; index: number; count: number }> = ({
  beat,
  index,
  count,
}) => {
  const updateBeat = useStoryboardStore((s) => s.updateBeat);
  const removeBeat = useStoryboardStore((s) => s.removeBeat);
  const moveBeat = useStoryboardStore((s) => s.moveBeat);

  return (
    <div
      style={{
        width: "clamp(280px, 24vw, 420px)",
        flexShrink: 0,
        borderLeft: `1px solid ${editorColors.border}`,
        background: editorColors.panel,
        overflowY: "auto",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>Selected Beat</div>
        <div style={{ fontSize: 11, color: editorColors.textDim }}>
          {beat ? `${index + 1} of ${count}` : `— of ${count}`}
        </div>
      </div>

      {!beat ? (
        <div style={{ fontSize: 12, color: editorColors.textDim }}>Pick a beat from the overview to edit it.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={smallButtonStyle} onClick={() => moveBeat(beat.id, "up")} title="Move earlier">
              ↑
            </button>
            <button style={smallButtonStyle} onClick={() => moveBeat(beat.id, "down")} title="Move later">
              ↓
            </button>
            <div style={{ flex: 1 }} />
            <button style={smallButtonStyle} onClick={() => removeBeat(beat.id)} title="Delete beat">
              Delete
            </button>
          </div>

          <Field label="Role" hint={`Generates a "${getBeatRole(beat.role).sceneType}" scene`}>
            <select
              style={inputStyle}
              value={beat.role}
              onChange={(e) => updateBeat(beat.id, { role: beatRoleSchema.parse(e.target.value) as BeatRole })}
            >
              {beatRoleRegistry.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Purpose" hint="Why this beat is in the video at all">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
              value={beat.purpose ?? ""}
              onChange={(e) => updateBeat(beat.id, { purpose: e.target.value || undefined })}
            />
          </Field>

          <Field label="Voiceover" hint={`≈ ${beat.voiceover ? voDurationSeconds(beat.voiceover).toFixed(1) : "0.0"}s to say`}>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              value={beat.voiceover ?? ""}
              placeholder="The line you'll say over this beat…"
              onChange={(e) => updateBeat(beat.id, { voiceover: e.target.value || undefined })}
            />
          </Field>

          <Field label="On-screen text" hint="What the viewer reads — shorter than the VO, not a transcript">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
              value={beat.onScreenText ?? ""}
              onChange={(e) => updateBeat(beat.id, { onScreenText: e.target.value || undefined })}
            />
          </Field>

          <Field label="Visual placeholder" hint="Describe the graphic; you pick the component later">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
              value={beat.visualPlaceholder ?? ""}
              placeholder="e.g. Chrome integration recording"
              onChange={(e) => updateBeat(beat.id, { visualPlaceholder: e.target.value || undefined })}
            />
          </Field>

          <Field
            label="Duration"
            hint="Leave empty to let the voiceover set the length — the generated scene is auto-paced either way when there's a VO"
          >
            <input
              type="number"
              min={0.1}
              step={0.1}
              style={inputStyle}
              value={beat.durationSeconds ?? ""}
              placeholder={beat.voiceover ? voDurationSeconds(beat.voiceover).toFixed(1) : "auto"}
              onChange={(e) =>
                updateBeat(beat.id, { durationSeconds: e.target.value === "" ? undefined : Number(e.target.value) })
              }
            />
          </Field>

          <Field label="Notes" hint="Anything else the edit needs to know">
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              value={beat.notes ?? ""}
              onChange={(e) => updateBeat(beat.id, { notes: e.target.value || undefined })}
            />
          </Field>
        </div>
      )}
    </div>
  );
};

/** The whole video as one band — the same read the scene strip gives the edit,
 * one layer earlier. */
const BeatStrip: React.FC = () => {
  const beats = useStoryboardStore((s) => s.storyboard?.beats ?? []);
  const selectedBeatId = useStoryboardStore((s) => s.selectedBeatId);
  const selectBeat = useStoryboardStore((s) => s.selectBeat);
  const addBeat = useStoryboardStore((s) => s.addBeat);

  const total = beats.reduce((sum, b) => sum + beatSeconds(b), 0);

  return (
    <div
      style={{
        borderTop: `1px solid ${editorColors.border}`,
        background: editorColors.panel,
        padding: "10px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
        {beats.length === 0 ? (
          <div style={{ fontSize: 12, color: editorColors.textDim }}>No beats yet.</div>
        ) : null}
        {beats.map((beat, i) => (
          <React.Fragment key={beat.id}>
            <div
              onClick={() => selectBeat(beat.id)}
              style={{
                width: 130,
                flexShrink: 0,
                padding: 8,
                borderRadius: 8,
                cursor: "pointer",
                background: editorColors.panelElevated,
                border: `1px solid ${beat.id === selectedBeatId ? editorColors.accent : editorColors.border}`,
              }}
            >
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: editorColors.textDim }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={roleChipStyle}>{getBeatRole(beat.role).label.toUpperCase()}</span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  marginTop: 6,
                  lineHeight: 1.35,
                  height: 44,
                  overflow: "hidden",
                  color: beat.onScreenText ? editorColors.text : editorColors.textDim,
                }}
              >
                {beat.onScreenText || beat.purpose || "…"}
              </div>
              <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>
                {beatSeconds(beat).toFixed(1)}s
              </div>
            </div>
            <button
              style={{ ...smallButtonStyle, alignSelf: "center" }}
              title="Insert a beat here"
              onClick={() => addBeat("step", i)}
            >
              +
            </button>
          </React.Fragment>
        ))}
      </div>
      <div style={{ fontSize: 11, color: editorColors.textDim, textAlign: "center" }}>
        Total Duration: ~{total.toFixed(1)}s
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 600, color: editorColors.text, marginBottom: 4 }}>{label}</div>
    {children}
    {hint ? <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>{hint}</div> : null}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  fontSize: 12,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  borderColor: editorColors.accent,
  color: editorColors.accent,
  fontWeight: 600,
};

const smallButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderRadius: 4,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  fontSize: 11,
  cursor: "pointer",
};

const listItemStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  cursor: "pointer",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: editorColors.textDim,
};

const roleChipStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.4,
  padding: "2px 6px",
  borderRadius: 4,
  background: "rgba(255,112,36,0.12)",
  color: editorColors.accent,
};
