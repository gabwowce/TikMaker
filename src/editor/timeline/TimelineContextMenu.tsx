import React from "react";
import { editorColors } from "../theme";
import { useCustomAssetsStore } from "../state/customAssetsStore";
import { AssetImportButton, buildAssetOptions } from "../panels/InspectorPanel";
import { confirmDeleteTimelineObject, describeTimelineObject } from "./deleteTimelineObject";
import { objectIdOf } from "./selectionId";
import {
  clipboardHas,
  clipboardLabel,
  copyTimelineObject,
  duplicateTimelineObject,
  pasteTimelineObject,
  replaceVisualAsset,
} from "./objectClipboard";

export type ContextTarget = { selectionId: string; x: number; y: number };

/**
 * Right-click menu for a timeline object.
 *
 * Everything it offers already exists as a keyboard shortcut or a panel button
 * — it calls the same functions, it does not reimplement any of them. What it
 * adds is discoverability: copy/paste and "swap the artwork" are the two things
 * you reach for constantly while building, and hunting for them in a panel
 * breaks the rhythm.
 */
export const TimelineContextMenu: React.FC<{
  target: ContextTarget;
  playheadLocalFrame: number;
  onClose: () => void;
  onSelect: (selectionId: string | null) => void;
}> = ({ target, playheadLocalFrame, onClose, onSelect }) => {
  const [picking, setPicking] = React.useState(false);
  const { selectionId } = target;
  // `selectionId` carries its scene as a prefix (`sceneId::visual-xxx`) since
  // multi-scene selection needs it — but that means a bare `.startsWith("visual-")`
  // stopped matching anything the moment IDs picked up that prefix, and this
  // menu's asset-swap option silently disappeared for every scene-owned visual.
  const isVisual = objectIdOf(selectionId).startsWith("visual-");
  const { deletable } = describeTimelineObject(selectionId);

  // Escape and any click outside close the menu — a context menu that needs its
  // own close button is a dialog wearing the wrong clothes.
  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDown = () => onClose();
    window.addEventListener("keydown", onKey);
    // Deferred: the pointerup that opened the menu would otherwise close it.
    const timer = setTimeout(() => window.addEventListener("pointerdown", onPointerDown), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose]);

  if (picking) {
    return (
      <AssetPicker
        onPick={(visual) => {
          replaceVisualAsset(selectionId, visual);
          onClose();
        }}
        onClose={onClose}
      />
    );
  }

  const pasted = clipboardLabel();

  return (
    <div style={menuStyle(target.x, target.y)} onPointerDown={(event) => event.stopPropagation()}>
      {isVisual ? (
        <button style={itemStyle} onClick={() => setPicking(true)}>
          🖼 Pakeisti asset…
          <span style={hintStyle}>efektai ir keyframe'ai lieka</span>
        </button>
      ) : null}
      <button
        style={itemStyle}
        onClick={() => {
          copyTimelineObject(selectionId);
          onClose();
        }}
      >
        Kopijuoti <span style={hintStyle}>Ctrl+C</span>
      </button>
      <button
        style={itemStyle}
        onClick={() => {
          onSelect(duplicateTimelineObject(selectionId, playheadLocalFrame));
          onClose();
        }}
      >
        Dublikuoti
      </button>
      <button
        style={{ ...itemStyle, opacity: clipboardHas() ? 1 : 0.4 }}
        disabled={!clipboardHas()}
        onClick={() => {
          onSelect(pasteTimelineObject(playheadLocalFrame));
          onClose();
        }}
      >
        Įklijuoti {pasted ? <span style={hintStyle}>{pasted.slice(0, 18)}</span> : null}
      </button>
      {deletable ? (
        <button
          style={{ ...itemStyle, color: "#ff8a65" }}
          onClick={() => {
            if (confirmDeleteTimelineObject(selectionId)) onSelect(null);
            onClose();
          }}
        >
          Pašalinti <span style={hintStyle}>Delete</span>
        </button>
      ) : null}
    </div>
  );
};

/** The same asset list the Inspector's pickers use — props, tool logos and the
 * user's own imports — as a grid, because swapping artwork is a visual choice. */
const AssetPicker: React.FC<{
  onPick: (visual: ReturnType<ReturnType<typeof buildAssetOptions>[number]["toVisual"]>) => void;
  onClose: () => void;
}> = ({ onPick, onClose }) => {
  const custom = useCustomAssetsStore((state) => state.assets);
  const load = useCustomAssetsStore((state) => state.load);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    load();
  }, [load]);

  const options = React.useMemo(() => buildAssetOptions(custom), [custom]);
  const filtered = query.trim()
    ? options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    // Anchored to the viewport rather than to the click, and sized against the
    // window: a menu-sized popover put most of the asset list below the bottom
    // edge, where scrolling could not reach it.
    <div style={pickerStyle} onPointerDown={(event) => event.stopPropagation()}>
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ieškoti asset'o…"
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          style={searchStyle}
        />
        <button onClick={onClose} style={closeButtonStyle} title="Uždaryti">
          ×
        </button>
      </div>

      {/* Importing from here is the same upload the Assets tab and every asset
          picker use — the new file is picked immediately, which is the point of
          reaching for it mid-swap. */}
      <div style={{ marginBottom: 8 }}>
        <AssetImportButton onImported={onPick} />
      </div>

      <div style={gridStyle}>
        {filtered.map((option) => (
          <button key={option.key} style={assetCardStyle} title={option.label} onClick={() => onPick(option.toVisual())}>
            <img src={option.src} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
            <span style={assetLabelStyle}>{option.label}</span>
          </button>
        ))}
        {filtered.length === 0 ? <div style={{ ...hintStyle, padding: 8 }}>Nieko nerasta.</div> : null}
      </div>
      <div style={{ ...hintStyle, marginTop: 8, textAlign: "center" }}>{filtered.length} asset'ai</div>
    </div>
  );
};

const menuStyle = (x: number, y: number): React.CSSProperties => ({
  position: "fixed",
  // Kept inside the window: a menu opened near the right or bottom edge would
  // otherwise render half off-screen.
  left: Math.min(x, window.innerWidth - 320),
  top: Math.min(y, window.innerHeight - 260),
  zIndex: 1000,
  minWidth: 210,
  padding: 5,
  borderRadius: 8,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panel,
  boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "none",
  background: "transparent",
  color: editorColors.text,
  fontSize: 12,
  textAlign: "left",
  cursor: "pointer",
};

const hintStyle: React.CSSProperties = { fontSize: 10, color: editorColors.textDim };
const searchStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 9px",
  marginBottom: 6,
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: "#222",
  color: editorColors.text,
  fontSize: 12,
  outline: "none",
};
const pickerStyle: React.CSSProperties = {
  position: "fixed",
  top: "8vh",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 1000,
  width: "min(560px, 92vw)",
  maxHeight: "84vh",
  display: "flex",
  flexDirection: "column",
  padding: 12,
  borderRadius: 10,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panel,
  boxShadow: "0 24px 60px rgba(0,0,0,0.65)",
};
const closeButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  flexShrink: 0,
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  fontSize: 17,
  cursor: "pointer",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))",
  gap: 6,
  // Fills the popover instead of a fixed 240px, so the list actually uses the
  // height the panel was given.
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
};
const assetCardStyle: React.CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: 4,
  padding: "8px 4px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.textDim,
  cursor: "pointer",
  overflow: "hidden",
};
const assetLabelStyle: React.CSSProperties = {
  fontSize: 9,
  maxWidth: "100%",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
