import React from "react";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import {
  entrancePresetSchema,
  exitPresetSchema,
  kenBurnsPresetSchema,
  transitionPresetSchema,
  backgroundIdSchema,
  richTextSizeSchema,
  richTextSplitBySchema,
} from "../../schema/scene";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import { backgroundRegistry } from "../../registries/backgroundRegistry";
import { useSavedBackgroundsStore } from "../state/savedBackgroundsStore";
import { BackgroundSwatch } from "../library/BackgroundLibrary";
import { propList } from "../../registries/propRegistry";
import { toolList } from "../../registries/toolRegistry";
import { sfxList, type SfxGroup } from "../../registries/sfxRegistry";
import { safeAreaPercent } from "../../video/typography/tokens";
import { resolveSceneDuration, pacingWarning, voDurationSeconds } from "../../utils/pacing";
import { computeSceneTimings } from "../../utils/duration";
import { resolveHoistedLinkGroups, chainRoleFor, type ChainRole } from "../../utils/visualLinks";
import { layerOverflowWarning } from "../../video/layout/layoutPresets";
import type { LayoutId } from "../../schema/scene";
import { isFullBleedVisual } from "../../video/visuals/isFullBleed";
import { OFF_FRAME_DISTANCE } from "../../video/motion/entrances";
import { VisualThumb } from "../library/VisualThumb";
import { useCustomAssetsStore, assetKind, type CustomAsset } from "../state/customAssetsStore";
import type { VisualConfig } from "../../schema/visual";
import type {
  StepItem,
  Block,
  PositionedVisualEntry,
  RichHeadlineLine,
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
} from "../../schema/scene";

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: editorColors.textDim,
  margin: "16px 0 6px",
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

const smallButtonStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  fontSize: 11,
  cursor: "pointer",
};

/** A collapsible group of fields — keeps the Inspector scannable instead of one
 * long wall of every possible field for every scene type. */
const Section: React.FC<{
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, defaultOpen = false, children }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  // `defaultOpen` can flip to true after mount — selecting a scene that already
  // has extra visuals, or adding the first one. Without this the section stays
  // shut and its contents look like they don't exist.
  React.useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <div style={{ borderTop: `1px solid ${editorColors.border}`, marginTop: 12, paddingTop: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: editorColors.text, letterSpacing: 0.3 }}>{title}</span>
        <span style={{ fontSize: 11, color: editorColors.textDim }}>{open ? "▾" : "▸"}</span>
      </button>
      {subtitle ? (
        <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 4 }}>{subtitle}</div>
      ) : null}
      {open ? <div style={{ marginTop: 10 }}>{children}</div> : null}
    </div>
  );
};

/** Types whose nested children still have no Inspector UI — everything else
 * (including browser/phone, which now get a Content picker) edits inline. */
const COMPOUND_VISUAL_TYPES = new Set(["flow", "stack", "transform"]);

type AssetOption = { key: string; label: string; src: string; toVisual: () => VisualConfig };

const staticAssetOptions: AssetOption[] = [
  ...propList.map((prop) => ({
    key: `prop:${prop.id}`,
    label: prop.name,
    src: prop.src,
    toVisual: (): VisualConfig => ({ type: "prop", asset: prop.id }),
  })),
  ...toolList.map((tool) => ({
    key: `tool:${tool.id}`,
    label: tool.name,
    src: tool.src,
    toVisual: (): VisualConfig => ({ type: "tool-logo", tool: tool.id }),
  })),
];

// kept as the module-level default (e.g. for "+ Add asset" buttons) — the
// full reactive list including custom imports lives in buildAssetOptions
const assetOptions = staticAssetOptions;

/** A custom import becomes whichever visual its file type calls for: a video
 * has to be a `recording` (it needs a frame, fit and playback rate), and only a
 * still can be a plain `image`. Picking one from the dropdown used to produce
 * an `image` either way, which left a chosen .mov rendering as a broken still. */
export function customAssetToVisual(asset: CustomAsset): VisualConfig {
  return assetKind(asset) === "video"
    ? { type: "recording", src: asset.src, frame: "browser", fit: "cover", playbackRate: 1 }
    : { type: "image", src: asset.src };
}

function buildAssetOptions(custom: CustomAsset[]): AssetOption[] {
  return [
    ...staticAssetOptions,
    ...custom.map((asset) => ({
      key: `custom:${asset.id}`,
      label: asset.label,
      src: asset.src,
      toVisual: (): VisualConfig => customAssetToVisual(asset),
    })),
  ];
}

function assetKeyOf(visual: VisualConfig | undefined, custom: CustomAsset[]): string {
  if (!visual) return "";
  if (visual.type === "prop") return `prop:${visual.asset}`;
  if (visual.type === "tool-logo") return `tool:${visual.tool}`;
  if (visual.type === "image" || visual.type === "recording") {
    const match = custom.find((a) => a.src === visual.src);
    if (match) return `custom:${match.id}`;
  }
  return "";
}

/** Imports a file straight into the slot being edited: pick, upload, and the
 * layer switches to it. The Assets tab still exists for managing the library,
 * but needing a round trip through it just to drop one PNG into one layer was
 * the long way round. */
const AssetImportButton: React.FC<{ onImported: (visual: VisualConfig) => void }> = ({ onImported }) => {
  const upload = useCustomAssetsStore((s) => s.upload);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  async function handleFile(file: File) {
    setBusy(true);
    setError(undefined);
    try {
      // Filename minus extension is a good enough label — the Assets tab can
      // rename it later, and blocking on a name prompt here defeats the point.
      const label = file.name.replace(/\.[^.]+$/, "") || file.name;
      onImported(customAssetToVisual(await upload(file, label)));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <button
        style={{ ...smallButtonStyle, whiteSpace: "nowrap", opacity: busy ? 0.6 : 1 }}
        disabled={busy}
        title="Import a PNG or a screen recording from your computer and use it here"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Importing…" : "Import…"}
      </button>
      {error ? <div style={{ fontSize: 10, color: "#ff8a65", marginTop: 4 }}>{error}</div> : null}
    </>
  );
};

const AssetSelect: React.FC<{ value: VisualConfig | undefined; allowNone?: boolean; onChange: (v: VisualConfig | undefined) => void }> = ({
  value,
  allowNone,
  onChange,
}) => {
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);

  React.useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  const options = buildAssetOptions(customAssets);

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
    <select
      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
      value={assetKeyOf(value, customAssets)}
      onChange={(e) => onChange(e.target.value ? options.find((a) => a.key === e.target.value)?.toVisual() : undefined)}
    >
      {allowNone ? <option value="">None</option> : null}
      {customAssets.length > 0 ? (
        <optgroup label="Your Imports">
          {options
            .filter((a) => a.key.startsWith("custom:"))
            .map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
        </optgroup>
      ) : null}
      <optgroup label="Props">
        {options
          .filter((a) => a.key.startsWith("prop:"))
          .map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
      </optgroup>
      <optgroup label="Tool Logos">
        {options
          .filter((a) => a.key.startsWith("tool:"))
          .map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
      </optgroup>
    </select>
    <AssetImportButton onImported={onChange} />
    </div>
  );
};

const sfxGroupOrder: SfxGroup[] = ["impact", "reveal", "transition", "text", "ui", "success", "misc"];
const sfxByGroupSorted: [SfxGroup, typeof sfxList][] = sfxGroupOrder
  .map((group) => [group, sfxList.filter((s) => s.group === group)] as [SfxGroup, typeof sfxList])
  .filter(([, list]) => list.length > 0);

/** Sound picker shared by scene-level (motion/visual) and per-item (block,
 * positioned visual) controls. `mode="auto"` adds an "Auto" option meaning
 * "pick a sensible default from the animation preset" (see `sfxDefaults.ts`)
 * on top of "No sound"; `mode="explicit"` is silent unless a sound is chosen,
 * for freeform items where a default would get noisy — see CLAUDE.md Sound section. */
const SfxSelect: React.FC<{ value: string | undefined; mode: "auto" | "explicit"; onChange: (v: string | undefined) => void }> = ({
  value,
  mode,
  onChange,
}) => (
  <select
    style={rowSelectStyle}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value || undefined)}
  >
    {mode === "auto" ? <option value="">Auto (default)</option> : null}
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

function summarizeVisual(visual: VisualConfig): string {
  switch (visual.type) {
    case "flow":
      return `flow: ${visual.nodes.map((n) => n.label ?? "node").join(" → ")}`;
    case "node-group":
      return `node-group (${visual.layout}): ${visual.nodes.length} nodes`;
    case "stack":
      return `stack: ${visual.items.length} items`;
    case "transform":
      return `transform: ${visual.from.type} → ${visual.to.type}`;
    case "browser":
      return `browser: ${visual.content.type}`;
    case "phone":
      return `phone: ${visual.content.type}`;
    default:
      return visual.type;
  }
}

/** Travel distance for a slide/zoomSettle animation. Presets cover the useful
 * range; "off-frame" is the one people actually reach for — past
 * FULL_TRAVEL_DISTANCE the motion layer also drops the opacity fade, so the
 * element really leaves the canvas instead of dissolving a few pixels in. */
const DistanceControl: React.FC<{
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ marginBottom: 6 }}>
    <div style={miniLabelStyle}>
      {label} — {value === undefined ? "default (subtle)" : `${value}px${value >= 400 ? " · no fade" : ""}`}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
      <input
        type="range"
        min={0}
        max={1800}
        step={20}
        value={value ?? 60}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        min={0}
        max={2400}
        style={inputStyle}
        value={value ?? ""}
        placeholder="auto"
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </div>
    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
      <button style={smallButtonStyle} onClick={() => onChange(undefined)}>
        Default
      </button>
      <button style={smallButtonStyle} onClick={() => onChange(600)}>
        Far
      </button>
      <button style={smallButtonStyle} onClick={() => onChange(OFF_FRAME_DISTANCE)}>
        Off-frame
      </button>
    </div>
  </div>
);

/** Presets whose look actually depends on how far the element travels — the
 * distance slider is hidden for the others (fade/pop/scale) so it doesn't read
 * as a knob that silently does nothing. */
const DISTANCE_ENTRANCES = new Set([
  "slideUp",
  "slideDown",
  "slideLeft",
  "slideRight",
  "zoomSettleRight",
  "zoomSettleLeft",
  "zoomSettleTop",
  "zoomSettleBottom",
]);
const DISTANCE_EXITS = new Set(["slideUp", "slideDown", "slideLeft", "slideRight"]);
/** Ken Burns presets with a rate to tune — the duration-sized ramps
 * (zoomIn/panLeft/etc) have no equivalent knob, see `kenBurnsSpeed`'s doc
 * comment in the schema. */
const CYCLIC_KEN_BURNS = new Set(["float", "rotateCW", "rotateCCW"]);

/** Friendlier label for the presets whose bare id doesn't explain the motion. */
function kenBurnsPresetLabel(preset: KenBurnsPreset): string {
  switch (preset) {
    case "float":
      return "float (drift + tilt, loops)";
    case "rotateCW":
      return "rotate clockwise (spins, loops)";
    case "rotateCCW":
      return "rotate counter-clockwise (spins, loops)";
    default:
      return preset;
  }
}

type VisualMotionValue = {
  entrance?: EntrancePreset;
  exit?: ExitPreset;
  exitDuration?: number;
  entranceDistance?: number;
  exitDistance?: number;
  kenBurns?: KenBurnsPreset;
  kenBurnsSpeed?: number;
  scale?: number;
  sfx?: string;
  exitSfx?: string;
};

/** The one in/out control block shared by EVERY visual in the editor — the
 * scene's primary visual, each freeform `content.visuals[]` layer, and each
 * comparison column's visual. Having a single component is the point: any
 * visual anywhere gets the same entrance, exit, travel distance, drift and
 * sound controls instead of whichever subset its call site happened to wire. */
/** Shown instead of a control that would silently do nothing — a carried
 * layer's In comes ONLY from the chain's first member and its Out ONLY from
 * the last (see `chainRoleFor`'s doc comment for why). Editing it on the
 * wrong member changes a value nothing ever reads. */
const InheritedNote: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontSize: 10,
      color: editorColors.textDim,
      fontStyle: "italic",
      padding: "6px 8px",
      background: editorColors.panelElevated,
      borderRadius: 6,
      marginBottom: 6,
    }}
  >
    {text}
  </div>
);

const VisualMotionEditor: React.FC<{
  value: VisualMotionValue;
  onChange: (patch: Partial<VisualMotionValue>) => void;
  /** What "unset" means here, e.g. "follow scene entrance" vs "default (pop)". */
  entranceFallbackLabel: string;
  showScale?: boolean;
  sfxMode?: "auto" | "explicit";
  /** False when this is a MIDDLE or LAST member of an active carry chain — its
   * own In/drift/Sound-In never plays; only the chain's FIRST member's does.
   * Replaces the controls with `InheritedNote` instead of hiding them outright,
   * so it's clear the field exists but isn't the one in effect here. */
  entranceApplies?: boolean;
  /** False when this is a FIRST or MIDDLE member of an active carry chain —
   * only the chain's LAST member's Out/Sound-Out plays. */
  exitApplies?: boolean;
}> = ({ value, onChange, entranceFallbackLabel, showScale, sfxMode = "auto", entranceApplies = true, exitApplies = true }) => (
  <>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
      <div>
        <div style={miniLabelStyle}>In</div>
        {entranceApplies ? (
          <select
            style={rowSelectStyle}
            value={value.entrance ?? ""}
            onChange={(e) => onChange({ entrance: (e.target.value || undefined) as EntrancePreset | undefined })}
          >
            <option value="">{entranceFallbackLabel}</option>
            {entrancePresetSchema.options.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        ) : (
          <InheritedNote text="Plays from the chain's first scene instead" />
        )}
      </div>
      <div>
        <div style={miniLabelStyle}>Out</div>
        {exitApplies ? (
          <select
            style={rowSelectStyle}
            value={value.exit ?? ""}
            onChange={(e) => onChange({ exit: (e.target.value || undefined) as ExitPreset | undefined })}
          >
            <option value="">no exit (stays)</option>
            {exitPresetSchema.options.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        ) : (
          <InheritedNote text="Plays from the chain's last scene instead" />
        )}
      </div>
    </div>

    {entranceApplies && value.entrance && DISTANCE_ENTRANCES.has(value.entrance) ? (
      <DistanceControl
        label="In distance"
        value={value.entranceDistance}
        onChange={(entranceDistance) => onChange({ entranceDistance })}
      />
    ) : null}

    {exitApplies && value.exit ? (
      <>
        <div style={miniLabelStyle}>Exit duration (frames)</div>
        <input
          type="number"
          min={1}
          max={60}
          style={{ ...inputStyle, marginBottom: 6 }}
          value={value.exitDuration ?? 18}
          onChange={(e) => onChange({ exitDuration: Number(e.target.value) })}
        />
        {DISTANCE_EXITS.has(value.exit) ? (
          <DistanceControl
            label="Out distance"
            value={value.exitDistance}
            onChange={(exitDistance) => onChange({ exitDistance })}
          />
        ) : null}
      </>
    ) : null}

    {showScale ? (
      <>
        <div style={miniLabelStyle}>Scale — {(value.scale ?? 1).toFixed(2)}x</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <input
            type="range"
            min={0.2}
            max={2.5}
            step={0.05}
            value={value.scale ?? 1}
            onChange={(e) => onChange({ scale: Number(e.target.value) })}
          />
          <input
            type="number"
            step={0.05}
            min={0.1}
            style={inputStyle}
            value={value.scale ?? 1}
            onChange={(e) => onChange({ scale: Number(e.target.value) || undefined })}
          />
        </div>
      </>
    ) : null}

    <div style={miniLabelStyle}>Ken Burns (continuous zoom/pan)</div>
    {entranceApplies ? (
      <>
        <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 4 }}>
          Slow drift for as long as this visual is on screen — layered on top of In/Out, not a replacement.
        </div>
        <select
          style={{ ...rowSelectStyle, width: "100%", marginBottom: 6 }}
          value={value.kenBurns ?? ""}
          onChange={(e) => onChange({ kenBurns: (e.target.value || undefined) as KenBurnsPreset | undefined })}
        >
          <option value="">static (no drift)</option>
          {kenBurnsPresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {kenBurnsPresetLabel(preset)}
            </option>
          ))}
        </select>

        {value.kenBurns && CYCLIC_KEN_BURNS.has(value.kenBurns) ? (
          <div style={{ marginBottom: 6 }}>
            <div style={miniLabelStyle}>Speed — {(value.kenBurnsSpeed ?? 1).toFixed(2)}x</div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.1}
                value={value.kenBurnsSpeed ?? 1}
                onChange={(e) => onChange({ kenBurnsSpeed: Number(e.target.value) })}
              />
              <input
                type="number"
                step={0.1}
                min={0.1}
                style={inputStyle}
                value={value.kenBurnsSpeed ?? 1}
                onChange={(e) => onChange({ kenBurnsSpeed: Number(e.target.value) || undefined })}
              />
            </div>
          </div>
        ) : null}
      </>
    ) : (
      <InheritedNote text="Drift travels with the chain's first scene instead" />
    )}

    <div style={miniLabelStyle}>Sound</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      <div>
        <div style={miniLabelStyle}>In</div>
        {entranceApplies ? (
          <SfxSelect mode={sfxMode} value={value.sfx} onChange={(sfx) => onChange({ sfx })} />
        ) : (
          <InheritedNote text="Plays from the first scene instead" />
        )}
      </div>
      <div>
        <div style={miniLabelStyle}>Out</div>
        {exitApplies ? (
          <SfxSelect mode={sfxMode} value={value.exitSfx} onChange={(exitSfx) => onChange({ exitSfx })} />
        ) : (
          <InheritedNote text="Plays from the last scene instead" />
        )}
      </div>
    </div>
  </>
);

/** The handful of shapes a browser/phone frame usefully holds. Switching kind
 * builds a fresh default of that type; the recursive editor below then edits it
 * like any other visual. */
const frameContentKinds: { id: VisualConfig["type"]; label: string; build: () => VisualConfig }[] = [
  {
    id: "image",
    label: "Image / screenshot",
    build: () => ({ type: "image", src: "" }),
  },
  {
    id: "recording",
    label: "Screen recording",
    build: () => ({ type: "recording", src: "", frame: "none", fit: "cover" }),
  },
  {
    id: "app-mockup",
    label: "App mockup",
    build: () => ({ type: "app-mockup", appTitle: "YOUR APP", kind: "list", items: ["Row one", "Row two"] }),
  },
  {
    id: "checklist",
    label: "Checklist",
    build: () => ({ type: "checklist", items: [{ label: "ITEM ONE" }, { label: "ITEM TWO" }] }),
  },
  {
    id: "stat-counter",
    label: "Stat counter",
    build: () => ({ type: "stat-counter", from: 0, to: 100, label: "USERS" }),
  },
];

const FrameContentEditor: React.FC<{ content: VisualConfig; onChange: (v: VisualConfig) => void }> = ({
  content,
  onChange,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ fontSize: 10, color: editorColors.textDim }}>What's on the screen</div>
    <select
      style={inputStyle}
      value={content.type}
      onChange={(e) => {
        const kind = frameContentKinds.find((k) => k.id === e.target.value);
        if (kind) onChange(kind.build());
      }}
    >
      {frameContentKinds.map((kind) => (
        <option key={kind.id} value={kind.id}>
          {kind.label}
        </option>
      ))}
      {frameContentKinds.every((k) => k.id !== content.type) ? (
        <option value={content.type}>{content.type} (current)</option>
      ) : null}
    </select>
    <div style={{ paddingLeft: 8, borderLeft: `2px solid ${editorColors.border}` }}>
      <VisualFieldsEditor visual={content} onChange={onChange} />
    </div>
  </div>
);

/** Lists the user's imported files of one kind (Assets tab) as a one-click
 * source picker. Without this a recording's `src` was a bare text field, so the
 * only way to use a real clip was to know its path by heart. */
const ImportPicker: React.FC<{
  kind: "image" | "video";
  src: string;
  onChange: (src: string) => void;
}> = ({ kind, src, onChange }) => {
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);

  React.useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  const matching = customAssets.filter((a) => assetKind(a) === kind);

  if (matching.length === 0) {
    return (
      <div style={{ fontSize: 10, color: editorColors.textDim }}>
        {kind === "video"
          ? "Import a .mp4/.mov in the Assets tab and it shows up here — or paste a path under public/ below."
          : "Import an image in the Assets tab and it shows up here as a one-click option."}
      </div>
    );
  }

  return (
    <select
      style={inputStyle}
      value={matching.some((a) => a.src === src) ? src : ""}
      onChange={(e) => e.target.value && onChange(e.target.value)}
    >
      <option value="">Pick from Your Imports…</option>
      {matching.map((asset) => (
        <option key={asset.id} value={asset.src}>
          {asset.label}
        </option>
      ))}
    </select>
  );
};

/** Picks an image file for an `image` visual — from Your Imports (the usual
 * case: a screenshot the user dropped into the Assets tab) or a raw path. */
const ImageSrcField: React.FC<{ src: string; onChange: (src: string) => void }> = ({ src, onChange }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <ImportPicker kind="image" src={src} onChange={onChange} />
      <input
        style={inputStyle}
        value={src}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/assets/… or a data URL"
      />
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", maxHeight: 120, objectFit: "contain", borderRadius: 6, background: "#000" }}
        />
      ) : null}
    </div>
  );
};

const VisualFieldsEditor: React.FC<{ visual: VisualConfig; onChange: (v: VisualConfig) => void }> = ({
  visual,
  onChange,
}) => {
  if (visual.type === "image") {
    return <ImageSrcField src={visual.src} onChange={(src) => onChange({ ...visual, src })} />;
  }

  if (visual.type === "recording") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ImportPicker kind="video" src={visual.src} onChange={(src) => onChange({ ...visual, src })} />
        <input
          style={inputStyle}
          value={visual.src}
          onChange={(e) => onChange({ ...visual, src: e.target.value })}
          placeholder="/assets/recordings/clip.mp4"
        />
        {visual.src ? (
          <video
            src={visual.src}
            muted
            playsInline
            controls
            preload="metadata"
            style={{ width: "100%", maxHeight: 140, borderRadius: 6, background: "#000" }}
          />
        ) : null}
        <div style={{ fontSize: 10, color: editorColors.textDim }}>Frame around the clip</div>
        <select
          style={inputStyle}
          value={visual.frame}
          onChange={(e) => onChange({ ...visual, frame: e.target.value as typeof visual.frame })}
        >
          <option value="none">none (bare clip)</option>
          <option value="browser">browser window</option>
          <option value="phone">phone</option>
        </select>
        {visual.frame === "browser" ? (
          <>
            <div style={{ fontSize: 10, color: editorColors.textDim }}>Browser chrome</div>
            <input
              style={inputStyle}
              value={visual.url ?? ""}
              onChange={(e) => onChange({ ...visual, url: e.target.value || undefined })}
              placeholder="Address bar — e.g. app.yoursite.com/dashboard"
            />
            <input
              style={inputStyle}
              value={visual.title ?? ""}
              onChange={(e) => onChange({ ...visual, title: e.target.value || undefined })}
              placeholder="Active tab title (defaults to the domain)"
            />
            <input
              style={inputStyle}
              value={(visual.tabs ?? []).join(", ")}
              onChange={(e) =>
                onChange({
                  ...visual,
                  tabs: e.target.value
                    ? e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3)
                    : undefined,
                })
              }
              placeholder="Other tabs, comma-separated (optional)"
            />
          </>
        ) : null}
        <div style={{ display: "flex", gap: 8 }}>
          <select
            style={inputStyle}
            value={visual.fit ?? "cover"}
            onChange={(e) => onChange({ ...visual, fit: e.target.value as typeof visual.fit })}
          >
            <option value="cover">cover</option>
            <option value="contain">contain</option>
          </select>
          <input
            type="number"
            step={0.1}
            min={0.1}
            style={inputStyle}
            value={visual.playbackRate ?? 1}
            onChange={(e) => onChange({ ...visual, playbackRate: Number(e.target.value) || undefined })}
            placeholder="Speed"
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={visual.startFrom ?? ""}
            onChange={(e) => onChange({ ...visual, startFrom: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="Start frame"
          />
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={visual.endAt ?? ""}
            onChange={(e) => onChange({ ...visual, endAt: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="End frame"
          />
        </div>
        {visual.endAt !== undefined && visual.endAt <= (visual.startFrom ?? 0) ? (
          <div style={{ fontSize: 10, color: "#ff8a65" }}>
            End frame must be after Start frame — ignored until then, clip plays untrimmed.
          </div>
        ) : null}
      </div>
    );
  }

  if (visual.type === "browser") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          style={inputStyle}
          value={visual.url ?? ""}
          onChange={(e) => onChange({ ...visual, url: e.target.value || undefined })}
          placeholder="Address bar — e.g. app.yoursite.com/dashboard"
        />
        <input
          style={inputStyle}
          value={visual.title ?? ""}
          onChange={(e) => onChange({ ...visual, title: e.target.value || undefined })}
          placeholder="Active tab title (defaults to the domain)"
        />
        <input
          style={inputStyle}
          value={(visual.tabs ?? []).join(", ")}
          onChange={(e) =>
            onChange({
              ...visual,
              tabs: e.target.value
                ? e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 3)
                : undefined,
            })
          }
          placeholder="Other tabs, comma-separated (optional)"
        />
        <FrameContentEditor content={visual.content} onChange={(content) => onChange({ ...visual, content })} />
      </div>
    );
  }

  if (visual.type === "phone") {
    return <FrameContentEditor content={visual.content} onChange={(content) => onChange({ ...visual, content })} />;
  }

  if (visual.type === "stat-counter") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            style={inputStyle}
            value={visual.from}
            onChange={(e) => onChange({ ...visual, from: Number(e.target.value) })}
            placeholder="From"
          />
          <input
            type="number"
            style={inputStyle}
            value={visual.to}
            onChange={(e) => onChange({ ...visual, to: Number(e.target.value) })}
            placeholder="To"
          />
        </div>
        <input
          style={inputStyle}
          value={visual.label ?? ""}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Label"
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={inputStyle}
            value={visual.prefix ?? ""}
            onChange={(e) => onChange({ ...visual, prefix: e.target.value })}
            placeholder="Prefix"
          />
          <input
            style={inputStyle}
            value={visual.suffix ?? ""}
            onChange={(e) => onChange({ ...visual, suffix: e.target.value })}
            placeholder="Suffix"
          />
        </div>
        <div style={{ fontSize: 10, color: editorColors.textDim }}>Tick sound (as the count rises)</div>
        <SfxSelect mode="auto" value={visual.sfx} onChange={(sfx) => onChange({ ...visual, sfx })} />
      </div>
    );
  }

  if (visual.type === "checklist") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select
          style={rowSelectStyle}
          value={visual.size ?? "bodyLarge"}
          onChange={(e) => onChange({ ...visual, size: e.target.value as typeof visual.size })}
        >
          {richTextSizeSchema.options.map((s) => (
            <option key={s} value={s}>
              {s} size
            </option>
          ))}
        </select>

        <div style={{ fontSize: 10, color: editorColors.textDim }}>
          Item pacing — {visual.stagger ?? 6} frames between items
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={visual.stagger ?? 6}
            onChange={(e) => onChange({ ...visual, stagger: Number(e.target.value) })}
          />
          <input
            type="number"
            style={inputStyle}
            value={visual.stagger ?? 6}
            onChange={(e) => onChange({ ...visual, stagger: Number(e.target.value) })}
          />
        </div>

        <div style={{ fontSize: 10, color: editorColors.textDim }}>Sound per item revealing</div>
        <SfxSelect mode="auto" value={visual.sfx} onChange={(sfx) => onChange({ ...visual, sfx })} />

        {visual.items.map((item, index) => (
          <div key={index} style={{ display: "flex", gap: 6 }}>
            <input
              style={inputStyle}
              value={item.label}
              onChange={(e) => {
                const items = [...visual.items];
                items[index] = { ...items[index], label: e.target.value };
                onChange({ ...visual, items });
              }}
            />
            <button
              style={smallButtonStyle}
              onClick={() => onChange({ ...visual, items: visual.items.filter((_, i) => i !== index) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          style={smallButtonStyle}
          onClick={() => onChange({ ...visual, items: [...visual.items, { label: "New item" }] })}
        >
          + Add item
        </button>
      </div>
    );
  }

  if (visual.type === "pricing-card") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          style={inputStyle}
          value={visual.title}
          onChange={(e) => onChange({ ...visual, title: e.target.value })}
          placeholder="Title"
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={inputStyle}
            value={visual.price}
            onChange={(e) => onChange({ ...visual, price: e.target.value })}
            placeholder="Price"
          />
          <input
            style={inputStyle}
            value={visual.period ?? ""}
            onChange={(e) => onChange({ ...visual, period: e.target.value })}
            placeholder="Period"
          />
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit" }}
          value={(visual.features ?? []).join("\n")}
          onChange={(e) => onChange({ ...visual, features: e.target.value.split("\n").filter(Boolean) })}
          placeholder="One feature per line"
        />
        <label style={{ fontSize: 11, color: editorColors.textDim, display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={visual.highlight ?? false}
            onChange={(e) => onChange({ ...visual, highlight: e.target.checked })}
          />
          Highlighted
        </label>
      </div>
    );
  }

  if (visual.type === "app-mockup") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          style={inputStyle}
          value={visual.appTitle}
          onChange={(e) => onChange({ ...visual, appTitle: e.target.value })}
          placeholder="App title"
        />
        <select
          style={inputStyle}
          value={visual.kind}
          onChange={(e) => onChange({ ...visual, kind: e.target.value as typeof visual.kind })}
        >
          <option value="list">list</option>
          <option value="stat">stat</option>
          <option value="chart">chart</option>
        </select>
        {visual.kind === "list" ? (
          <textarea
            style={{ ...inputStyle, minHeight: 60, fontFamily: "inherit" }}
            value={(visual.items ?? []).join("\n")}
            onChange={(e) => onChange({ ...visual, items: e.target.value.split("\n").filter(Boolean) })}
            placeholder="One row per line"
          />
        ) : null}
        {visual.kind === "stat" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={inputStyle}
              value={visual.stat?.value ?? ""}
              onChange={(e) => onChange({ ...visual, stat: { value: e.target.value, label: visual.stat?.label ?? "" } })}
              placeholder="Value"
            />
            <input
              style={inputStyle}
              value={visual.stat?.label ?? ""}
              onChange={(e) => onChange({ ...visual, stat: { value: visual.stat?.value ?? "", label: e.target.value } })}
              placeholder="Label"
            />
          </div>
        ) : null}
        {visual.kind === "chart" ? (
          <input
            style={inputStyle}
            value={(visual.chartValues ?? []).join(", ")}
            onChange={(e) =>
              onChange({
                ...visual,
                chartValues: e.target.value
                  .split(",")
                  .map((v) => Number(v.trim()))
                  .filter((v) => !Number.isNaN(v)),
              })
            }
            placeholder="Comma-separated values"
          />
        ) : null}
      </div>
    );
  }

  if (visual.type === "progress") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            style={inputStyle}
            value={visual.value}
            onChange={(e) => onChange({ ...visual, value: Number(e.target.value) })}
            placeholder="Value"
          />
          <input
            type="number"
            style={inputStyle}
            value={visual.max}
            onChange={(e) => onChange({ ...visual, max: Number(e.target.value) })}
            placeholder="Max"
          />
        </div>
        <input
          style={inputStyle}
          value={visual.label ?? ""}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Label"
        />
      </div>
    );
  }

  if (visual.type === "node-group") {
    const radius = visual.radius ?? 300;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <select
          style={inputStyle}
          value={visual.layout}
          onChange={(e) => onChange({ ...visual, layout: e.target.value as typeof visual.layout })}
        >
          <option value="orbit">orbit</option>
          <option value="radial">radial</option>
          <option value="one-to-many">one-to-many</option>
        </select>

        <div style={{ fontSize: 10, color: editorColors.textDim }}>Size — radius {radius.toFixed(0)}px</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
          <input
            type="range"
            min={150}
            max={700}
            step={10}
            value={radius}
            onChange={(e) => onChange({ ...visual, radius: Number(e.target.value) })}
          />
          <input
            type="number"
            style={inputStyle}
            value={radius}
            onChange={(e) => onChange({ ...visual, radius: Number(e.target.value) })}
          />
        </div>

        {visual.layout === "orbit" ? (
          <>
            <div style={{ fontSize: 10, color: editorColors.textDim }}>
              Speed — {(visual.speed ?? 0.26).toFixed(2)}°/frame
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, alignItems: "center" }}>
              <input
                type="range"
                min={-2}
                max={2}
                step={0.02}
                value={visual.speed ?? 0.26}
                onChange={(e) => onChange({ ...visual, speed: Number(e.target.value) })}
              />
              <input
                type="number"
                step={0.02}
                style={inputStyle}
                value={visual.speed ?? 0.26}
                onChange={(e) => onChange({ ...visual, speed: Number(e.target.value) })}
              />
            </div>
          </>
        ) : null}

        <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>Center</div>
        <AssetSelect
          value={visual.center}
          allowNone={visual.layout === "orbit"}
          onChange={(center) => onChange({ ...visual, center })}
        />

        <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 4 }}>
          Orbiting assets ({visual.nodes.length}/6)
        </div>
        {visual.nodes.map((node, index) => (
          <div key={index} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <AssetSelect value={node} onChange={(v) => {
                if (!v) return;
                const nodes = [...visual.nodes];
                nodes[index] = v;
                onChange({ ...visual, nodes });
              }} />
            </div>
            <button
              style={smallButtonStyle}
              disabled={visual.nodes.length <= 1}
              onClick={() => onChange({ ...visual, nodes: visual.nodes.filter((_, i) => i !== index) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          style={smallButtonStyle}
          disabled={visual.nodes.length >= 6}
          onClick={() =>
            onChange({
              ...visual,
              nodes: [...visual.nodes, assetOptions[0].toVisual()],
            })
          }
        >
          + Add asset
        </button>
      </div>
    );
  }

  if (visual.type === "keycap") {
    const keys = visual.keys;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, color: editorColors.textDim }}>
          Keys — each one draws its own cap, in order (e.g. CTRL + R). Keep them short; caps render uppercase.
        </div>
        {keys.map((key, index) => (
          <div key={index} style={{ display: "flex", gap: 6 }}>
            <input
              style={inputStyle}
              value={key}
              onChange={(e) => {
                const next = [...keys];
                next[index] = e.target.value;
                onChange({ ...visual, keys: next });
              }}
              placeholder="ESC"
            />
            <button
              style={smallButtonStyle}
              disabled={keys.length <= 1}
              onClick={() => onChange({ ...visual, keys: keys.filter((_, i) => i !== index) })}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          style={smallButtonStyle}
          disabled={keys.length >= 3}
          onClick={() => onChange({ ...visual, keys: [...keys, "R"] })}
        >
          + Add key
        </button>
        <input
          style={inputStyle}
          value={visual.caption ?? ""}
          onChange={(e) => onChange({ ...visual, caption: e.target.value || undefined })}
          placeholder="Caption (optional)"
        />
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12, color: editorColors.textDim }}>
      {summarizeVisual(visual)}
      <div style={{ marginTop: 4, fontStyle: "italic" }}>
        Nested-node editing isn't available in the Inspector yet — use the Visuals tab presets or edit the project
        JSON directly.
      </div>
    </div>
  );
};

const rowSelectStyle: React.CSSProperties = { ...inputStyle, fontSize: 11, padding: "6px 8px" };

const subLabelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: editorColors.textDim,
  marginTop: 10,
  marginBottom: 4,
};

const miniLabelStyle: React.CSSProperties = {
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: editorColors.textDim,
  marginBottom: 3,
};

/** Collapsible per-item card used by BlocksEditor/PositionedVisualsEditor —
 * a header (thumbnail + label + reorder/delete) plus a body split into
 * clearly labeled subsections (Position / Scale / Animation / …) so a long
 * list of freeform items stays scannable instead of one wall of fields. */
const EntryCard: React.FC<{
  thumbnailSrc?: string;
  /** Rendered instead of `thumbnailSrc` when the entry isn't a plain asset
   * image — a composite visual has no single file to show, so the card falls
   * back to a rendered still of the thing itself. */
  thumbnail?: React.ReactNode;
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  children: React.ReactNode;
}> = ({ thumbnailSrc, thumbnail, title, subtitle, open, onToggle, onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown, children }) => {
  return (
    <div style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, overflow: "hidden" }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 8px",
          cursor: "pointer",
          background: editorColors.panelElevated,
        }}
      >
        <span style={{ fontSize: 10, color: editorColors.textDim, width: 10, flexShrink: 0 }}>{open ? "▾" : "▸"}</span>
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt=""
            style={{ width: 24, height: 24, objectFit: "contain", borderRadius: 4, background: editorColors.panel, flexShrink: 0 }}
          />
        ) : (
          thumbnail ?? null
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: editorColors.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title || "(empty)"}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 10, color: editorColors.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
          {onMoveUp ? (
            <button style={smallButtonStyle} disabled={!canMoveUp} onClick={onMoveUp} title="Move up">
              ↑
            </button>
          ) : null}
          {onMoveDown ? (
            <button style={smallButtonStyle} disabled={!canMoveDown} onClick={onMoveDown} title="Move down">
              ↓
            </button>
          ) : null}
          <button style={smallButtonStyle} onClick={onRemove} title="Remove">
            ✕
          </button>
        </div>
      </div>
      {open ? <div style={{ padding: 8 }}>{children}</div> : null}
    </div>
  );
};

function useAssetPreview(visual: VisualConfig | undefined): { label: string; src?: string } {
  const customAssets = useCustomAssetsStore((s) => s.assets);
  const loadCustomAssets = useCustomAssetsStore((s) => s.load);

  React.useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);

  if (!visual) return { label: "" };
  const options = buildAssetOptions(customAssets);
  const key = assetKeyOf(visual, customAssets);
  const match = options.find((a) => a.key === key);
  if (match) return { label: match.label, src: match.src };
  if (visual.type === "image") return { label: "Custom image", src: visual.src };
  return { label: summarizeVisual(visual) };
}

const RichHeadlineEditor: React.FC<{
  lines: RichHeadlineLine[];
  onChange: (lines: RichHeadlineLine[]) => void;
}> = ({ lines, onChange }) => {
  function updateLine(index: number, patch: Partial<RichHeadlineLine>) {
    const next = [...lines];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lines.map((line, index) => (
        <div key={index} style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, padding: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              style={inputStyle}
              value={line.text}
              onChange={(e) => updateLine(index, { text: e.target.value })}
              placeholder="Line text"
            />
            <button style={smallButtonStyle} onClick={() => onChange(lines.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>
          <select
            style={{ ...rowSelectStyle, marginBottom: 6, width: "100%" }}
            value={line.size}
            onChange={(e) => updateLine(index, { size: e.target.value as RichHeadlineLine["size"] })}
          >
            {richTextSizeSchema.options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <div>
              <div style={miniLabelStyle}>In</div>
              <select
                style={rowSelectStyle}
                value={line.animation ?? ""}
                onChange={(e) =>
                  updateLine(index, {
                    animation: (e.target.value || undefined) as RichHeadlineLine["animation"],
                  })
                }
              >
                <option value="">default anim (pop)</option>
                {entrancePresetSchema.options.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={miniLabelStyle}>Out</div>
              <select
                style={rowSelectStyle}
                value={line.exit ?? ""}
                onChange={(e) =>
                  updateLine(index, {
                    exit: (e.target.value || undefined) as RichHeadlineLine["exit"],
                  })
                }
              >
                <option value="">follow scene exit</option>
                {exitPresetSchema.options.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={miniLabelStyle}>Split by</div>
            <select
              style={{ ...rowSelectStyle, width: "100%" }}
              value={line.splitBy ?? "word"}
              onChange={(e) => updateLine(index, { splitBy: e.target.value as RichHeadlineLine["splitBy"] })}
            >
              {richTextSplitBySchema.options.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <label
            style={{ fontSize: 11, color: editorColors.textDim, display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}
          >
            <input
              type="checkbox"
              checked={line.pill ?? false}
              onChange={(e) => updateLine(index, { pill: e.target.checked })}
            />
            Pill box highlight
          </label>
          <SfxSelect mode="auto" value={line.sfx} onChange={(sfx) => updateLine(index, { sfx })} />
        </div>
      ))}
      <button
        style={smallButtonStyle}
        onClick={() => onChange([...lines, { text: "New line", size: "title", splitBy: "word" }])}
      >
        + Add line
      </button>
    </div>
  );
};

function makeBlockId(): string {
  return `block-${Math.random().toString(36).slice(2, 9)}`;
}

const colorSwatches = [
  { label: "White", value: "#FFFFFF" },
  { label: "Secondary", value: "#B8B8B8" },
  { label: "Accent", value: "#FF7024" },
  { label: "Background", value: "#171717" },
];

function isValidHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

const BlocksEditor: React.FC<{ blocks: Block[]; onChange: (blocks: Block[]) => void }> = ({ blocks, onChange }) => {
  // Same "track the collapsed ones" reasoning as PositionedVisualsEditor below —
  // a block added after mount defaults to open.
  const [closedIds, setClosedIds] = React.useState<Set<string>>(() => new Set());

  function updateBlock(index: number, patch: Partial<Block>) {
    const next = [...blocks];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function toggle(id: string) {
    setClosedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((block, index) => (
        <EntryCard
          key={block.id}
          title={block.text || "(empty text)"}
          subtitle={`${block.type} · x ${block.x.toFixed(0)}% y ${block.y.toFixed(0)}%`}
          open={!closedIds.has(block.id)}
          onToggle={() => toggle(block.id)}
          canMoveUp={index > 0}
          canMoveDown={index < blocks.length - 1}
          onMoveUp={() => moveBlock(index, "up")}
          onMoveDown={() => moveBlock(index, "down")}
          onRemove={() => onChange(blocks.filter((_, i) => i !== index))}
        >
          <div style={subLabelStyle}>Content</div>
          <textarea
            style={{ ...inputStyle, minHeight: 44, fontFamily: "inherit", marginBottom: 6 }}
            value={block.text}
            onChange={(e) => updateBlock(index, { text: e.target.value })}
            placeholder="Block text"
          />
          <select
            style={rowSelectStyle}
            value={block.type}
            onChange={(e) => updateBlock(index, { type: e.target.value as Block["type"] })}
          >
            <option value="text">text</option>
            <option value="badge">badge</option>
          </select>

          <div style={subLabelStyle}>
            Position — x {block.x.toFixed(0)}%, y {block.y.toFixed(0)}% (clamped to the TikTok-safe text zone)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <div style={miniLabelStyle}>X</div>
              <input
                type="range"
                min={safeAreaPercent.left}
                max={safeAreaPercent.right}
                value={block.x}
                onChange={(e) => updateBlock(index, { x: Number(e.target.value) })}
              />
            </div>
            <div>
              <div style={miniLabelStyle}>Y</div>
              <input
                type="range"
                min={safeAreaPercent.top}
                max={safeAreaPercent.bottom}
                value={block.y}
                onChange={(e) => updateBlock(index, { y: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={subLabelStyle}>Typography</div>
          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 2 }}>Size — {block.size ?? 52}px</div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <input
              type="range"
              min={16}
              max={220}
              step={1}
              value={block.size ?? 52}
              onChange={(e) => updateBlock(index, { size: Number(e.target.value) })}
            />
            <input
              type="number"
              style={inputStyle}
              value={block.size ?? 52}
              onChange={(e) => updateBlock(index, { size: Number(e.target.value) })}
            />
          </div>
          <input
            type="number"
            style={{ ...inputStyle, marginBottom: 6 }}
            value={block.letterSpacing ?? 0}
            onChange={(e) => updateBlock(index, { letterSpacing: Number(e.target.value) })}
            placeholder="Letter spacing (px)"
          />
          <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <input
              type="color"
              value={isValidHex(block.color ?? "") ? (block.color as string) : "#ffffff"}
              onChange={(e) => updateBlock(index, { color: e.target.value })}
              style={{ width: 32, height: 28, padding: 0, border: `1px solid ${editorColors.border}`, borderRadius: 6, flexShrink: 0 }}
            />
            <input
              style={inputStyle}
              value={block.color ?? "#FFFFFF"}
              onChange={(e) => updateBlock(index, { color: e.target.value })}
              placeholder="#RRGGBB"
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.value}
                title={swatch.label}
                onClick={() => updateBlock(index, { color: swatch.value })}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `1px solid ${editorColors.border}`,
                  background: swatch.value,
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>

          <div style={subLabelStyle}>Animation — In</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <select
              style={rowSelectStyle}
              value={block.animation ?? ""}
              onChange={(e) => updateBlock(index, { animation: (e.target.value || undefined) as Block["animation"] })}
            >
              <option value="">default anim (pop)</option>
              {entrancePresetSchema.options.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              style={rowSelectStyle}
              value={block.splitBy ?? "word"}
              onChange={(e) => updateBlock(index, { splitBy: e.target.value as Block["splitBy"] })}
            >
              {richTextSplitBySchema.options.map((s) => (
                <option key={s} value={s}>
                  split by {s}
                </option>
              ))}
            </select>
          </div>
          <div style={miniLabelStyle}>Start delay (frames)</div>
          <input
            type="number"
            style={{ ...inputStyle, marginBottom: 6 }}
            min={0}
            value={block.delay ?? 0}
            onChange={(e) => updateBlock(index, { delay: Number(e.target.value) })}
          />
          <div style={miniLabelStyle}>Sound</div>
          <SfxSelect mode="auto" value={block.sfx} onChange={(sfx) => updateBlock(index, { sfx })} />
        </EntryCard>
      ))}
      <button
        style={smallButtonStyle}
        onClick={() => {
          const id = makeBlockId();
          // Stagger new blocks downward within the safe zone so they don't land
          // exactly on top of the previous one (and disappear into it visually).
          const y = Math.min(safeAreaPercent.bottom, safeAreaPercent.top + blocks.length * 8);
          onChange([...blocks, { id, type: "text", text: "New block", x: 50, y, splitBy: "word" }]);
        }}
      >
        + Add block
      </button>
    </div>
  );
};

function makeVisualEntryId(): string {
  return `pvis-${Math.random().toString(36).slice(2, 9)}`;
}

const PositionedVisualEntryCard: React.FC<{
  entry: PositionedVisualEntry;
  index: number;
  total: number;
  onUpdate: (patch: Partial<PositionedVisualEntry>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  open: boolean;
  onToggle: () => void;
  canCarry: boolean;
  onCarry: () => void;
  /** This entry's position in its ACTIVE carry chain, if any — see
   * `chainRoleFor`. Drives which In/Out controls actually do anything. */
  chainRole: ChainRole | null;
}> = ({ entry, index, total, onUpdate, onMoveUp, onMoveDown, onRemove, open, onToggle, canCarry, onCarry, chainRole }) => {
  const preview = useAssetPreview(entry.visual);
  const entranceApplies = chainRole !== "middle" && chainRole !== "last";
  const exitApplies = chainRole !== "middle" && chainRole !== "first";
  // Extending a chain only makes sense from its LAST member (or a fresh,
  // unlinked layer) — pressing it from the first/middle would carry a NEW,
  // separate copy from the wrong spot instead of continuing the real chain.
  const canExtendFromHere = chainRole !== "first" && chainRole !== "middle";
  // Full-bleed compositions draw against the whole canvas and ignore the
  // entry's own position/scale, so showing those sliders here just gives a
  // knob that does nothing. Each one exposes its own placement fields instead.
  const fullBleed = isFullBleedVisual(entry.visual);

  return (
    <EntryCard
      title={preview.label || `Visual ${index + 1}`}
      subtitle={
        fullBleed
          ? "full-bleed \u2014 fills the frame"
          : `x ${entry.x.toFixed(0)}% y ${entry.y.toFixed(0)}% · ${(entry.scale ?? 1).toFixed(2)}x`
      }
      thumbnailSrc={preview.src}
      thumbnail={<VisualThumb visual={entry.visual} height={24} />}
      open={open}
      onToggle={onToggle}
      canMoveUp={index > 0}
      canMoveDown={index < total - 1}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onRemove={onRemove}
    >
      <div style={subLabelStyle}>Asset</div>
      <AssetSelect value={entry.visual} onChange={(v) => v && onUpdate({ visual: v })} />
      {entry.visual.type !== "prop" && entry.visual.type !== "tool-logo" ? (
        <div style={{ marginTop: 6 }}>
          <VisualFieldsEditor visual={entry.visual} onChange={(visual) => onUpdate({ visual })} />
        </div>
      ) : null}

      {fullBleed ? (
        <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 8 }}>
          This layer fills the whole frame, so it has no single position or scale — place its pieces with the
          fields above. Animation, sound and carry below still apply to it.
        </div>
      ) : (
        <>
          <div style={subLabelStyle}>
            Position — x {entry.x.toFixed(0)}%, y {entry.y.toFixed(0)}%
          </div>
          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 4 }}>
            Or drag this visual's marker directly on the Player preview.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <div style={miniLabelStyle}>X</div>
              <input type="range" min={0} max={100} value={entry.x} onChange={(e) => onUpdate({ x: Number(e.target.value) })} />
            </div>
            <div>
              <div style={miniLabelStyle}>Y</div>
              <input type="range" min={0} max={100} value={entry.y} onChange={(e) => onUpdate({ y: Number(e.target.value) })} />
            </div>
          </div>

          <div style={subLabelStyle}>Scale — {(entry.scale ?? 1).toFixed(2)}x</div>
          <input
            type="range"
            min={0.2}
            max={2.5}
            step={0.05}
            style={{ width: "100%" }}
            value={entry.scale ?? 1}
            onChange={(e) => onUpdate({ scale: Number(e.target.value) })}
          />
          {(() => {
            const warning = layerOverflowWarning(entry);
            return warning ? <div style={{ fontSize: 10, color: "#ff8a65", marginTop: 4 }}>{warning}</div> : null;
          })()}
        </>
      )}

      <div style={subLabelStyle}>Animation</div>
      <VisualMotionEditor
        entranceFallbackLabel="default (pop)"
        sfxMode="explicit"
        value={{
          entrance: entry.entrance,
          exit: entry.exit,
          exitDuration: entry.exitDuration,
          entranceDistance: entry.entranceDistance,
          exitDistance: entry.exitDistance,
          kenBurns: entry.kenBurns,
          kenBurnsSpeed: entry.kenBurnsSpeed,
          sfx: entry.sfx,
          exitSfx: entry.exitSfx,
        }}
        onChange={(patch) => onUpdate(patch as Partial<PositionedVisualEntry>)}
        entranceApplies={entranceApplies}
        exitApplies={exitApplies}
      />

      <div style={{ ...miniLabelStyle, marginTop: 8 }}>Start delay (frames)</div>
      <input
        type="number"
        min={0}
        style={{ ...inputStyle, marginBottom: 6 }}
        value={entry.delay ?? 0}
        onChange={(e) => onUpdate({ delay: Number(e.target.value) })}
      />

      <div style={subLabelStyle}>Carry across the cut</div>
      <button
        style={{ ...smallButtonStyle, width: "100%", marginBottom: 4, opacity: canCarry && canExtendFromHere ? 1 : 0.5 }}
        disabled={!canCarry || !canExtendFromHere}
        onClick={onCarry}
      >
        {entry.link ? "Extend this carry into the next scene →" : "Carry this layer into the next scene →"}
      </button>
      <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 6 }}>
        {!canExtendFromHere
          ? "This layer is a middle/first link in an existing chain — go to its LAST scene to extend the chain further."
          : canCarry
            ? "Copies this layer onto the next scene and links them, so it stays ONE element gliding to its new pose — a recording keeps playing instead of restarting. Press it again there to carry it further."
            : "This is the last scene — add a scene after it first."}
      </div>
      {entry.link ? (
        <input
          style={{ ...inputStyle, marginBottom: 6 }}
          value={entry.link.groupId}
          onChange={(e) => onUpdate({ link: e.target.value ? { groupId: e.target.value } : undefined })}
          placeholder="group id — same string on the neighboring scene"
        />
      ) : null}
    </EntryCard>
  );
};

const PositionedVisualsEditor: React.FC<{
  visuals: PositionedVisualEntry[];
  onChange: (visuals: PositionedVisualEntry[]) => void;
  canCarry: boolean;
  onCarry: (entryId: string) => void;
  /** Resolves each entry's role in its active carry chain — see `chainRoleFor`. */
  roleFor: (entryId: string) => ChainRole | null;
}> = ({ visuals, onChange, canCarry, onCarry, roleFor }) => {
  // Tracks the ones deliberately COLLAPSED rather than the ones open: a layer
  // added after mount (from the Visuals tab, say) is unknown to this set and so
  // defaults to open, which is what someone who just added it expects.
  const [closedIds, setClosedIds] = React.useState<Set<string>>(() => new Set());

  function updateEntry(index: number, patch: Partial<PositionedVisualEntry>) {
    const next = [...visuals];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function moveEntry(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= visuals.length) return;
    const next = [...visuals];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function toggle(id: string) {
    setClosedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visuals.map((entry, index) => (
        <PositionedVisualEntryCard
          key={entry.id}
          entry={entry}
          index={index}
          total={visuals.length}
          open={!closedIds.has(entry.id)}
          onToggle={() => toggle(entry.id)}
          canCarry={canCarry}
          onCarry={() => onCarry(entry.id)}
          onUpdate={(patch) => updateEntry(index, patch)}
          onMoveUp={() => moveEntry(index, "up")}
          onMoveDown={() => moveEntry(index, "down")}
          onRemove={() => onChange(visuals.filter((_, i) => i !== index))}
          chainRole={roleFor(entry.id)}
        />
      ))}
      <button
        style={smallButtonStyle}
        onClick={() => {
          const id = makeVisualEntryId();
          onChange([...visuals, { id, visual: { type: "prop", asset: "idea" }, x: 50, y: 50 }]);
        }}
      >
        + Add visual
      </button>
    </div>
  );
};

/** Splits the Inspector into the three jobs people actually do one at a time:
 * write the words, place the graphics, time the motion. One long scroll made
 * every one of them a hunt. */
type InspectorTab = "content" | "visuals" | "motion";

const inspectorTabs: { id: InspectorTab; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "visuals", label: "Visuals" },
  { id: "motion", label: "Motion" },
];

export const InspectorPanel: React.FC = () => {
  const [tab, setTab] = React.useState<InspectorTab>("content");
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const project = useProjectStore((s) => s.project);
  const scene = useProjectStore((s) => s.project.scenes.find((sc) => sc.id === s.selectedSceneId));
  // Same grouping the renderer uses (`SceneRenderer`/`resolveHoistedLinkGroups`)
  // — the Inspector's notion of "which link is first/last" can never drift
  // from what actually plays. Recomputed only when scene content changes.
  const hoistedGroups = React.useMemo(() => resolveHoistedLinkGroups(computeSceneTimings(project)), [project]);
  const roleForLayer = React.useCallback(
    (entryId: string) => (selectedSceneId ? chainRoleFor(hoistedGroups, selectedSceneId, entryId) : null),
    [hoistedGroups, selectedSceneId]
  );
  const updateSceneContent = useProjectStore((s) => s.updateSceneContent);
  const updateScene = useProjectStore((s) => s.updateScene);
  const updateAllScenesBackground = useProjectStore((s) => s.updateAllScenesBackground);
  const savedBackgrounds = useSavedBackgroundsStore((s) => s.backgrounds);
  const updateSceneEntrance = useProjectStore((s) => s.updateSceneEntrance);
  const updateSceneExit = useProjectStore((s) => s.updateSceneExit);
  const updateSceneExitDuration = useProjectStore((s) => s.updateSceneExitDuration);
  const updateSceneMotion = useProjectStore((s) => s.updateSceneMotion);
  const linkVisualToNextScene = useProjectStore((s) => s.linkVisualToNextScene);
  const linkLayerToNextScene = useProjectStore((s) => s.linkLayerToNextScene);
  const hasNextScene = useProjectStore(
    (s) => s.project.scenes.findIndex((sc) => sc.id === s.selectedSceneId) < s.project.scenes.length - 1
  );
  const updateSceneTransition = useProjectStore((s) => s.updateSceneTransition);
  const updateSceneStagger = useProjectStore((s) => s.updateSceneStagger);
  const updateSceneVisual = useProjectStore((s) => s.updateSceneVisual);
  const updateSceneVisualPosition = useProjectStore((s) => s.updateSceneVisualPosition);
  const updateSceneSfx = useProjectStore((s) => s.updateSceneSfx);
  const updateSceneExitSfx = useProjectStore((s) => s.updateSceneExitSfx);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const updateSceneHighlights = useProjectStore((s) => s.updateSceneHighlights);
  const updateSceneRichHeadline = useProjectStore((s) => s.updateSceneRichHeadline);
  const updateSceneLeftRight = useProjectStore((s) => s.updateSceneLeftRight);
  const updateSceneItems = useProjectStore((s) => s.updateSceneItems);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
  const removeScene = useProjectStore((s) => s.removeScene);
  const setActiveVisualSlot = useProjectStore((s) => s.setActiveVisualSlot);

  if (!scene || !selectedSceneId) {
    return (
      <div
        style={{
          width: "clamp(300px, 23vw, 480px)",
          flexShrink: 0,
          borderLeft: `1px solid ${editorColors.border}`,
          background: editorColors.panel,
          padding: 16,
          color: editorColors.textDim,
          fontSize: 13,
        }}
      >
        Select a scene to edit its properties.
      </div>
    );
  }

  const def = getSceneDefinition(scene.type);
  const isComparison = scene.type === "comparison";
  const isSteps = scene.type === "steps";

  function updateItem(index: number, patch: Partial<StepItem>) {
    const items = [...(scene!.content.items ?? [])];
    items[index] = { ...items[index], ...patch };
    updateSceneItems(selectedSceneId!, items);
  }

  return (
    // Split into a pinned head and a scrolling body: the tabs are how you move
    // around this panel, and a long Layers/Motion list pushed them off screen —
    // you had to scroll back to the top just to switch away.
    <div
      style={{
        // See LibraryPanel — same reasoning. Wider rows mean the two-up
        // controls (In/Out, x/y, sound) stop wrapping into unreadable columns.
        width: "clamp(300px, 23vw, 480px)",
        flexShrink: 0,
        borderLeft: `1px solid ${editorColors.border}`,
        background: editorColors.panel,
        color: editorColors.text,
        display: "flex",
        flexDirection: "column",
        // Without this a flex child refuses to shrink below its content height,
        // so the body never becomes the scroller and the head scrolls away.
        minHeight: 0,
      }}
    >
      <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{def.name}</div>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 2 }}>{def.description}</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${inspectorTabs.length}, 1fr)`,
            gap: 4,
            margin: "12px 0 0",
            padding: 3,
            borderRadius: 8,
            background: editorColors.panelElevated,
          }}
        >
          {inspectorTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "6px 0",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: tab === t.id ? editorColors.panel : "transparent",
                color: tab === t.id ? editorColors.accent : editorColors.textDim,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 16px" }}>
      {tab === "content" ? (
        <>
      <Section title="Content" defaultOpen>
        {!isComparison ? (
          <>
            <div style={labelStyle}>Eyebrow</div>
            <input
              style={inputStyle}
              value={scene.content.eyebrow ?? ""}
              onChange={(e) => updateSceneContent(selectedSceneId, { eyebrow: e.target.value })}
            />
          </>
        ) : null}

        {!isSteps ? (
          <>
            <div style={labelStyle}>Headline</div>
            <textarea
              style={{ ...inputStyle, minHeight: 60, resize: "vertical", fontFamily: "inherit" }}
              value={scene.content.headline ?? ""}
              onChange={(e) => updateSceneContent(selectedSceneId, { headline: e.target.value })}
            />

            <div style={labelStyle}>Highlighted words</div>
            <input
              style={inputStyle}
              value={(scene.content.highlights ?? []).join(", ")}
              onChange={(e) =>
                updateSceneHighlights(
                  selectedSceneId,
                  e.target.value
                    .split(",")
                    .map((w) => w.trim())
                    .filter(Boolean)
                )
              }
              placeholder="Comma-separated words to pill-highlight"
            />

            <Section
              title="Rich Headline"
              subtitle='Stacked, independently-sized/animated lines — overrides Headline above. Only used by Hook Centered, Hook With Visual and Takeaway.'
            >
              <RichHeadlineEditor
                lines={scene.content.richHeadline ?? []}
                onChange={(lines) => updateSceneRichHeadline(selectedSceneId, lines)}
              />
            </Section>
          </>
        ) : null}

        {isComparison ? (
          <>
            {(["left", "right"] as const).map((side) => (
              <div key={side}>
                <div style={labelStyle}>{side === "left" ? "Left column" : "Right column"}</div>
                <input
                  style={{ ...inputStyle, marginBottom: 6 }}
                  value={scene.content[side]?.label ?? ""}
                  onChange={(e) => updateSceneLeftRight(selectedSceneId, side, { label: e.target.value })}
                  placeholder="Label"
                />
                <input
                  style={{ ...inputStyle, marginBottom: 6 }}
                  value={scene.content[side]?.headline ?? ""}
                  onChange={(e) => updateSceneLeftRight(selectedSceneId, side, { headline: e.target.value })}
                  placeholder="Headline"
                />
                <textarea
                  style={{ ...inputStyle, minHeight: 44, fontFamily: "inherit" }}
                  value={scene.content[side]?.body ?? ""}
                  onChange={(e) => updateSceneLeftRight(selectedSceneId, side, { body: e.target.value })}
                  placeholder="Body"
                />
                <button style={{ ...smallButtonStyle, marginTop: 6 }} onClick={() => setActiveVisualSlot(side)}>
                  Assign visual from Visuals tab →
                </button>
                {scene.content[side]?.visual ? (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <VisualThumb visual={scene.content[side]!.visual!} height={40} />
                      <div style={{ fontSize: 10, color: editorColors.textDim }}>
                        This column's visual — its own In/Out, independent of the column.
                      </div>
                    </div>
                    <VisualMotionEditor
                      entranceFallbackLabel="none (moves with the column)"
                      showScale
                      value={{
                        entrance: scene.content[side]?.visualEntrance,
                        exit: scene.content[side]?.visualExit,
                        exitDuration: scene.content[side]?.visualExitDuration,
                        entranceDistance: scene.content[side]?.visualEntranceDistance,
                        exitDistance: scene.content[side]?.visualExitDistance,
                        kenBurns: scene.content[side]?.visualKenBurns,
                        kenBurnsSpeed: scene.content[side]?.visualKenBurnsSpeed,
                        scale: scene.content[side]?.visualScale,
                        sfx: scene.content[side]?.visualSfx,
                        exitSfx: scene.content[side]?.visualExitSfx,
                      }}
                      onChange={(patch) =>
                        updateSceneLeftRight(selectedSceneId, side, {
                          ...("entrance" in patch ? { visualEntrance: patch.entrance } : {}),
                          ...("exit" in patch ? { visualExit: patch.exit } : {}),
                          ...("exitDuration" in patch ? { visualExitDuration: patch.exitDuration } : {}),
                          ...("entranceDistance" in patch ? { visualEntranceDistance: patch.entranceDistance } : {}),
                          ...("exitDistance" in patch ? { visualExitDistance: patch.exitDistance } : {}),
                          ...("kenBurns" in patch ? { visualKenBurns: patch.kenBurns } : {}),
                          ...("kenBurnsSpeed" in patch ? { visualKenBurnsSpeed: patch.kenBurnsSpeed } : {}),
                          ...("scale" in patch ? { visualScale: patch.scale } : {}),
                          ...("sfx" in patch ? { visualSfx: patch.sfx } : {}),
                          ...("exitSfx" in patch ? { visualExitSfx: patch.exitSfx } : {}),
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </>
        ) : null}

        {isSteps ? (
          <>
            <div style={labelStyle}>Items</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(scene.content.items ?? []).map((item, index) => (
                <div key={index} style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, padding: 8 }}>
                  <input
                    style={{ ...inputStyle, marginBottom: 6 }}
                    value={item.label}
                    onChange={(e) => updateItem(index, { label: e.target.value })}
                    placeholder="Label"
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      style={inputStyle}
                      value={item.value ?? ""}
                      onChange={(e) => updateItem(index, { value: e.target.value })}
                      placeholder="Optional value"
                    />
                    <button
                      style={smallButtonStyle}
                      onClick={() =>
                        updateSceneItems(
                          selectedSceneId,
                          (scene.content.items ?? []).filter((_, i) => i !== index)
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                style={smallButtonStyle}
                onClick={() =>
                  updateSceneItems(selectedSceneId, [...(scene.content.items ?? []), { label: "New step" }])
                }
              >
                + Add item
              </button>
            </div>
          </>
        ) : null}
      </Section>

      <Section title="Blocks" subtitle="Freeform positioned text/badge — available on every template">
        <BlocksEditor
          blocks={scene.content.blocks ?? []}
          onChange={(blocks) => updateSceneBlocks(selectedSceneId, blocks)}
        />
      </Section>

      <Section title="Voiceover" subtitle="Drives how long this scene stays on screen" defaultOpen>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          The line you'll record for this scene. The app doesn't generate audio — it uses the wording to work out how
          long the scene has to stay up so the cut never lands before you finish the sentence.
        </div>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          value={scene.vo ?? ""}
          placeholder="What you say over this scene…"
          onChange={(e) => updateScene(selectedSceneId, { vo: e.target.value || undefined })}
        />
        {scene.vo ? (
          <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 4 }}>
            ≈ {voDurationSeconds(scene.vo).toFixed(1)}s to say
          </div>
        ) : null}
      </Section>

        </>
      ) : null}

      {tab === "visuals" ? (
        <>
      <Section title="Background" defaultOpen subtitle="Applies to the WHOLE video — one background for every scene.">
        <select
          style={inputStyle}
          value={typeof scene.background === "string" ? scene.background : ""}
          onChange={(e) => updateAllScenesBackground(backgroundIdSchema.parse(e.target.value))}
        >
          {typeof scene.background !== "string" ? <option value="">Custom (built below)</option> : null}
          {backgroundRegistry.map((bg) => (
            <option key={bg.id} value={bg.id}>
              {bg.name}
            </option>
          ))}
        </select>

        {typeof scene.background !== "string" ? (
          <div style={{ marginTop: 8 }}>
            <BackgroundSwatch fill={scene.background.fill} grid={scene.background.grid} height={56} />
          </div>
        ) : null}

        {savedBackgrounds.length > 0 ? (
          <>
            <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 10, marginBottom: 6 }}>
              Or apply a saved background to every scene:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {savedBackgrounds.map((saved) => (
                <button
                  key={saved.id}
                  title={saved.name}
                  onClick={() => updateAllScenesBackground(saved.background)}
                  style={{ padding: 0, border: "none", background: "none", cursor: "pointer" }}
                >
                  <BackgroundSwatch fill={saved.background.fill} grid={saved.background.grid} height={40} />
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 8 }}>
          Build a custom solid/gradient/image background in the <strong>Visuals → BG</strong> tab.
        </div>
      </Section>

      <Section
        title={`Layers${(scene.content.visuals?.length ?? 0) > 0 ? ` (${scene.content.visuals!.length})` : ""}`}
        defaultOpen
        subtitle="Every visual in this scene, listed bottom layer first — the last one draws on top. Each has the same controls: position, scale, In/Out, Ken Burns, sound and carry into the next scene. Use ↑ / ↓ to restack. Add more from the Visuals tab."
      >
        <PositionedVisualsEditor
          visuals={scene.content.visuals ?? []}
          canCarry={hasNextScene}
          onCarry={(entryId) => linkLayerToNextScene(selectedSceneId, entryId)}
          onChange={(visuals) => updateSceneVisuals(selectedSceneId, visuals)}
          roleFor={roleForLayer}
        />
      </Section>

        </>
      ) : null}

      {tab === "motion" ? (
        <>
      <Section title="Timing & Motion" defaultOpen>
        <div style={labelStyle}>Duration</div>
        {(() => {
          const isAuto = typeof scene.durationSeconds !== "number";
          const resolved = resolveSceneDuration(scene);
          const warning = pacingWarning(scene);
          return (
            <>
              <label
                style={{
                  fontSize: 11,
                  color: editorColors.textDim,
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={isAuto}
                  onChange={(e) =>
                    updateScene(selectedSceneId, {
                      durationSeconds: e.target.checked ? undefined : Number(resolved.toFixed(1)),
                    })
                  }
                />
                Fit to voiceover / reading time ({resolved.toFixed(1)}s)
              </label>
              {!isAuto ? (
                <input
                  type="number"
                  step={0.1}
                  min={0.5}
                  style={inputStyle}
                  value={scene.durationSeconds}
                  onChange={(e) => updateScene(selectedSceneId, { durationSeconds: Number(e.target.value) })}
                />
              ) : null}
              {warning ? (
                <div style={{ fontSize: 11, color: "#ff8a65", marginTop: 4 }}>{warning}</div>
              ) : null}
            </>
          );
        })()}

        <div style={labelStyle}>Entrance</div>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          How badge/eyebrow/headline/visual/body come in, one after another. Rich Headline lines and Blocks use their
          own animation setting instead.
        </div>
        <select
          style={inputStyle}
          value={scene.motion?.entrance ?? "fade"}
          onChange={(e) => updateSceneEntrance(selectedSceneId, entrancePresetSchema.parse(e.target.value))}
        >
          {entrancePresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
        <DistanceControl
          label="Entrance distance"
          value={scene.motion?.entranceDistance}
          onChange={(entranceDistance) => updateSceneMotion(selectedSceneId, { entranceDistance })}
        />

        <div style={labelStyle}>Exit</div>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          How the whole scene (all text + visual together) leaves, in the last moments before it ends. Leave as
          "none" for a hard cut.
        </div>
        <select
          style={{ ...inputStyle, marginBottom: 6 }}
          value={scene.motion?.exit ?? ""}
          onChange={(e) =>
            updateSceneExit(
              selectedSceneId,
              (e.target.value || undefined) as (typeof exitPresetSchema)["options"][number] | undefined
            )
          }
        >
          <option value="">none (hard cut)</option>
          {exitPresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
        {scene.motion?.exit ? (
          <input
            type="number"
            min={1}
            max={60}
            style={{ ...inputStyle, marginBottom: 6 }}
            value={scene.motion?.exitDuration ?? 18}
            onChange={(e) => updateSceneExitDuration(selectedSceneId, Number(e.target.value))}
            placeholder="Exit duration (frames)"
          />
        ) : null}
        {scene.motion?.exit ? (
          <DistanceControl
            label="Exit distance"
            value={scene.motion?.exitDistance}
            onChange={(exitDistance) => updateSceneMotion(selectedSceneId, { exitDistance })}
          />
        ) : null}

        <div style={labelStyle}>Sound</div>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          One cue for the whole scene's entrance/exit (not per element) — Auto picks a sound to match the
          animation above.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div>
            <div style={miniLabelStyle}>In</div>
            <SfxSelect mode="auto" value={scene.motion?.sfx} onChange={(sfx) => updateSceneSfx(selectedSceneId, sfx)} />
          </div>
          <div>
            <div style={miniLabelStyle}>Out</div>
            <SfxSelect
              mode="auto"
              value={scene.motion?.exitSfx}
              onChange={(sfx) => updateSceneExitSfx(selectedSceneId, sfx)}
            />
          </div>
        </div>

        <div style={labelStyle}>Stagger (frames between elements)</div>
        <input
          type="number"
          min={0}
          style={inputStyle}
          value={scene.motion?.stagger ?? 6}
          onChange={(e) => updateSceneStagger(selectedSceneId, Number(e.target.value))}
        />

        <div style={labelStyle}>Transition</div>
        <select
          style={inputStyle}
          value={scene.motion?.transition ?? "cut"}
          onChange={(e) => updateSceneTransition(selectedSceneId, transitionPresetSchema.parse(e.target.value))}
        >
          {transitionPresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </select>
      </Section>

        </>
      ) : null}

      <button
        style={{
          ...inputStyle,
          marginTop: 24,
          cursor: "pointer",
          borderColor: "#5a2a1a",
          color: "#ff8a65",
        }}
        onClick={() => removeScene(selectedSceneId)}
      >
        Delete Scene
      </button>
      </div>
    </div>
  );
};
