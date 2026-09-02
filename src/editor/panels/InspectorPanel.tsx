import React from "react";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import { useVoiceStore } from "../state/voiceStore";
import { qualifySelection } from "../timeline/selectionId";
import { usePreferences } from "../state/fileLibrary";
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
import { getSfx, sfxList, type SfxGroup } from "../../registries/sfxRegistry";
import { resolveTextEntranceSfx } from "../../video/motion/sfxDefaults";
import { fontSizes, safeAreaPercent, videoDefaults } from "../../video/typography/tokens";
import { resolveSceneDuration, pacingWarning, voDurationSeconds } from "../../utils/pacing";
import { computeSceneTimings } from "../../utils/duration";
import { resolveHoistedLinkGroups, chainRoleFor, type ChainRole } from "../../utils/visualLinks";
import { layerOverflowWarning } from "../../video/layout/layoutPresets";
import type { LayoutId } from "../../schema/scene";
import { isFullBleedVisual } from "../../video/visuals/isFullBleed";
import { OFF_FRAME_DISTANCE } from "../../video/motion/entrances";
import { VisualThumb } from "../library/VisualThumb";
import { useCustomAssetsStore, assetKind, type CustomAsset } from "../state/customAssetsStore";
import { screenAspectSchema, type VisualConfig } from "../../schema/visual";
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

const animationSeconds = (frames: number) => Number((frames / videoDefaults.fps).toFixed(2));
const SecondsSlider: React.FC<{ label: string; frames: number; minFrames?: number; maxFrames?: number; onChange: (frames: number) => void }> = ({ label, frames, minFrames = 0, maxFrames = 300, onChange }) => {
  const seconds = animationSeconds(frames);
  const begin = useProjectStore((state) => state.beginHistoryTransaction);
  const end = useProjectStore((state) => state.endHistoryTransaction);
  return <div style={{ marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}><span style={miniLabelStyle}>{label}</span><span style={{ fontSize: 10, color: editorColors.text }}>{seconds.toFixed(2)} s</span></div><input type="range" min={minFrames / videoDefaults.fps} max={maxFrames / videoDefaults.fps} step={0.1} value={seconds} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onKeyDown={begin} onKeyUp={end} onChange={(event) => onChange(Math.max(minFrames, Math.min(maxFrames, Math.round(Number(event.target.value) * videoDefaults.fps))))} style={{ width: "100%", accentColor: editorColors.accent }} /></div>;
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

export type AssetOption = { key: string; label: string; src: string; toVisual: () => VisualConfig };

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

export function buildAssetOptions(custom: CustomAsset[]): AssetOption[] {
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
export const AssetImportButton: React.FC<{
  onImported: (visual: VisualConfig, asset: CustomAsset) => void;
  /** Narrows the file dialog when the caller can only use one kind — a
   * `recording` slot offering PNGs is an invitation to pick the wrong file. */
  accept?: string;
  label?: string;
}> = ({ onImported, accept = "image/*,video/*", label = "Import…" }) => {
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
      const name = file.name.replace(/\.[^.]+$/, "") || file.name;
      const asset = await upload(file, name);
      onImported(customAssetToVisual(asset), asset);
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
        accept={accept}
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
        {busy ? "Įkeliama…" : label}
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

const sfxGroupOrder: SfxGroup[] = ["voice", "impact", "reveal", "transition", "text", "ui", "success", "misc"];
const sfxByGroupSorted: [SfxGroup, typeof sfxList][] = sfxGroupOrder
  .map((group) => [group, sfxList.filter((s) => s.group === group)] as [SfxGroup, typeof sfxList])
  .filter(([, list]) => list.length > 0);

/** Sound picker shared by scene-level (motion/visual) and per-item (block,
 * positioned visual) controls. `mode="auto"` adds an "Auto" option meaning
 * "pick a sensible default from the animation preset" (see `sfxDefaults.ts`)
 * on top of "No sound"; `mode="explicit"` is silent unless a sound is chosen,
 * for freeform items where a default would get noisy — see CLAUDE.md Sound section. */
export const SfxSelect: React.FC<{
  value: string | undefined;
  mode: "auto" | "explicit";
  /**
   * The sfx id an UNSET value actually plays, for elements that resolve a
   * default (text, scene motion). Naming it matters more than it looks: an
   * unset text cue is not silence — `resolveTextEntranceSfx` always returns a
   * sound for a word/letter split — so "Auto" alone leaves the author guessing
   * which of the listed effects they are hearing, and no way to tell whether
   * picking that same one explicitly would change anything.
   */
  autoResolvesTo?: string;
  onChange: (v: string | undefined) => void;
}> = ({ value, mode, autoResolvesTo, onChange }) => (
  <select
    style={rowSelectStyle}
    value={value ?? ""}
    onChange={(e) => onChange(e.target.value || undefined)}
  >
    {mode === "auto" ? (
      <option value="">
        {autoResolvesTo ? `Auto · ${getSfx(autoResolvesTo)?.label ?? autoResolvesTo}` : "Auto (default)"}
      </option>
    ) : null}
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
    case "screen":
      return `screen (${visual.aspect ?? "16:10"}): ${visual.content.type}`;
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
  "dropIn",
  "rollIn",
]);
const DISTANCE_EXITS = new Set(["slideUp", "slideDown", "slideLeft", "slideRight", "dropOut", "rollOut"]);
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
  entranceDuration?: number;
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

    {entranceApplies && value.entrance && value.entrance !== "none" ? (
      <>
        <SecondsSlider label="Entrance duration" frames={value.entranceDuration ?? 18} minFrames={1} maxFrames={60} onChange={(entranceDuration) => onChange({ entranceDuration })} />
        <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 6 }}>
          Leave empty to let the preset run at its own pace — every preset but fade is a spring, which settles on
          its own. A number stretches or squashes it to exactly that many seconds.
        </div>
        {DISTANCE_ENTRANCES.has(value.entrance) ? (
          <DistanceControl
            label="In distance"
            value={value.entranceDistance}
            onChange={(entranceDistance) => onChange({ entranceDistance })}
          />
        ) : null}
      </>
    ) : null}

    {exitApplies && value.exit ? (
      <>
        <SecondsSlider label="Exit duration" frames={value.exitDuration ?? 18} minFrames={1} maxFrames={60} onChange={(exitDuration) => onChange({ exitDuration })} />
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

  // The import button sits HERE, next to the slot being filled. Sending you to
  // the Assets tab to import and then back to pick it is two context switches
  // for one intention, and it was the only asset slot in the editor that did
  // not offer the import it needs.
  const importButton = (
    <AssetImportButton
      accept={kind === "video" ? "video/*" : "image/*"}
      label={kind === "video" ? "Įkelti įrašą…" : "Įkelti paveikslėlį…"}
      onImported={(_visual, asset) => onChange(asset.src)}
    />
  );

  if (matching.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 10, color: editorColors.textDim }}>
          {kind === "video"
            ? "Dar nėra įkeltų įrašų. Įkelk .mp4/.mov — arba žemiau įrašyk kelią po public/."
            : "Dar nėra įkeltų paveikslėlių."}
        </div>
        <div style={{ display: "flex" }}>{importButton}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <select
        style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        value={matching.some((a) => a.src === src) ? src : ""}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      >
        <option value="">Pasirink iš įkeltų…</option>
        {matching.map((asset) => (
          <option key={asset.id} value={asset.src}>
            {asset.label}
          </option>
        ))}
      </select>
      {importButton}
    </div>
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

export const VisualFieldsEditor: React.FC<{ visual: VisualConfig; onChange: (v: VisualConfig) => void }> = ({
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
          <option value="plain">plain screen (rounded, no chrome)</option>
          <option value="browser">browser window</option>
          <option value="phone">phone</option>
        </select>
        {visual.frame === "plain" ? (
          <>
            <div style={{ fontSize: 10, color: editorColors.textDim }}>Card shape</div>
            <select
              style={inputStyle}
              value={visual.aspect ?? "16:10"}
              onChange={(e) => onChange({ ...visual, aspect: e.target.value as typeof visual.aspect })}
            >
              {screenAspectSchema.options.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </>
        ) : null}
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

  if (visual.type === "checkpoint") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          style={inputStyle}
          value={visual.label}
          onChange={(e) => onChange({ ...visual, label: e.target.value })}
          placeholder="Checkpoint text"
        />
        <textarea
          style={{ ...inputStyle, resize: "vertical" }}
          rows={2}
          value={visual.detail ?? ""}
          onChange={(e) => onChange({ ...visual, detail: e.target.value || undefined })}
          placeholder="Optional detail"
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <select
            style={rowSelectStyle}
            value={visual.variant ?? "card"}
            onChange={(e) => onChange({ ...visual, variant: e.target.value as typeof visual.variant })}
          >
            <option value="card">Card</option>
            <option value="compact">Compact</option>
            <option value="pill">Pill</option>
            <option value="outline">Outline</option>
          </select>
          <select
            style={rowSelectStyle}
            value={visual.state ?? "done"}
            onChange={(e) => onChange({ ...visual, state: e.target.value as typeof visual.state })}
          >
            <option value="done">Done ✓</option>
            <option value="pending">Pending ○</option>
            <option value="warning">Warning !</option>
          </select>
        </div>
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

        <SecondsSlider label="Tarpas tarp punktų" frames={visual.stagger ?? 6} maxFrames={60} onChange={(stagger) => onChange({ ...visual, stagger })} />

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
  /** `content.richHeadlineX`/`Y` — placement of the whole stack. */
  stackX?: number;
  stackY?: number;
  onStackMove: (patch: { richHeadlineX?: number; richHeadlineY?: number }) => void;
}> = ({ lines, onChange, stackX, stackY, onStackMove }) => {
  function updateLine(index: number, patch: Partial<RichHeadlineLine>) {
    const next = [...lines];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  /** Array order IS the stack order AND the entrance order — `RichHeadline`
   * renders top-to-bottom and its stagger clock walks the same array — so one
   * swap moves a line both visually and in the sequence, which is what "what
   * comes after what" means here. */
  function moveLine(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {lines.length ? (
        <div>
          <div style={miniLabelStyle}>
            Stack position —{" "}
            {stackX === undefined && stackY === undefined
              ? "in the scene's normal flow"
              : `${stackX === undefined ? "centred" : `x ${stackX.toFixed(0)}%`}, y ${(stackY ?? 50).toFixed(0)}%`}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <div style={miniLabelStyle}>X</div>
              <input
                type="range"
                min={safeAreaPercent.left}
                max={safeAreaPercent.right}
                style={{ width: "100%" }}
                value={stackX ?? 50}
                onChange={(e) => onStackMove({ richHeadlineX: Number(e.target.value) })}
              />
            </div>
            <div>
              <div style={miniLabelStyle}>Y</div>
              <input
                type="range"
                min={safeAreaPercent.top}
                max={safeAreaPercent.bottom}
                style={{ width: "100%" }}
                value={stackY ?? 50}
                onChange={(e) => onStackMove({ richHeadlineY: Number(e.target.value) })}
              />
            </div>
          </div>
          {stackX === undefined && stackY === undefined ? null : (
            <button
              style={{ ...smallButtonStyle, width: "100%", marginTop: 4 }}
              onClick={() => onStackMove({ richHeadlineX: undefined, richHeadlineY: undefined })}
            >
              ↺ Back to the scene's flow
            </button>
          )}
          <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 2 }}>
            Moves the whole stack so consecutive scenes don't all sit on the same line. Leaving X alone keeps the
            headline centred across the safe area, which is usually what you want.
          </div>
        </div>
      ) : null}
      {lines.map((line, index) => (
        <div key={index} style={{ border: `1px solid ${editorColors.border}`, borderRadius: 8, padding: 8 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: editorColors.textDim, alignSelf: "center", minWidth: 16 }}>
              {String(index + 1).padStart(2, "0")}
            </div>
            <input
              style={inputStyle}
              value={line.text}
              onChange={(e) => updateLine(index, { text: e.target.value })}
              placeholder="Line text"
            />
            <button
              style={{ ...smallButtonStyle, opacity: index === 0 ? 0.4 : 1 }}
              disabled={index === 0}
              title="Move up — earlier in the stack and in the entrance order"
              onClick={() => moveLine(index, "up")}
            >
              ↑
            </button>
            <button
              style={{ ...smallButtonStyle, opacity: index === lines.length - 1 ? 0.4 : 1 }}
              disabled={index === lines.length - 1}
              title="Move down — later in the stack and in the entrance order"
              onClick={() => moveLine(index, "down")}
            >
              ↓
            </button>
            <button style={smallButtonStyle} onClick={() => onChange(lines.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
            <div>
              <div style={miniLabelStyle}>Size token</div>
              <select
                style={{ ...rowSelectStyle, width: "100%", opacity: line.sizePx ? 0.5 : 1 }}
                value={line.size}
                onChange={(e) => updateLine(index, { size: e.target.value as RichHeadlineLine["size"] })}
              >
                {richTextSizeSchema.options.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={miniLabelStyle}>Manual px (overrides)</div>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  type="number"
                  min={8}
                  max={400}
                  style={inputStyle}
                  placeholder={String(fontSizes[line.size])}
                  value={line.sizePx ?? ""}
                  onChange={(e) => updateLine(index, { sizePx: e.target.value ? Number(e.target.value) : undefined })}
                />
                {line.sizePx ? (
                  <button
                    style={smallButtonStyle}
                    title="Back to the size token"
                    onClick={() => updateLine(index, { sizePx: undefined })}
                  >
                    ↺
                  </button>
                ) : null}
              </div>
            </div>
          </div>
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
          {line.exit ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
              <SecondsSlider label="Out length" frames={line.exitDuration ?? 18} minFrames={1} maxFrames={60} onChange={(exitDuration) => updateLine(index, { exitDuration })} />
              <SecondsSlider label="Out delay" frames={line.exitDelay ?? 0} minFrames={-60} maxFrames={60} onChange={(exitDelay) => updateLine(index, { exitDelay })} />
              <div>
                <div style={miniLabelStyle}>Out distance</div>
                <input
                  type="number"
                  min={0}
                  max={2400}
                  style={inputStyle}
                  placeholder="70"
                  value={line.exitDistance ?? ""}
                  onChange={(e) =>
                    updateLine(index, { exitDistance: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            </div>
          ) : null}
          {line.exit ? (
            <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 6 }}>
              By default this line finishes leaving exactly on the cut. Raise Out delay to keep it moving into the
              cut so it syncs with a carried visual's glide (set that visual's Glide lead to meet it).
            </div>
          ) : null}
          <div style={miniLabelStyle}>
            {line.x === undefined || line.y === undefined
              ? "This line — stacked with its neighbours"
              : `This line — free at x ${line.x.toFixed(0)}%, y ${line.y.toFixed(0)}%`}
          </div>
          {line.x === undefined || line.y === undefined ? (
            <button
              style={{ ...smallButtonStyle, width: "100%", marginBottom: 6 }}
              onClick={() => updateLine(index, { x: 50, y: 50 })}
            >
              Position this line on its own →
            </button>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div>
                  <div style={miniLabelStyle}>X</div>
                  <input
                    type="range"
                    min={safeAreaPercent.left}
                    max={safeAreaPercent.right}
                    style={{ width: "100%" }}
                    value={line.x}
                    onChange={(e) => updateLine(index, { x: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <div style={miniLabelStyle}>Y</div>
                  <input
                    type="range"
                    min={safeAreaPercent.top}
                    max={safeAreaPercent.bottom}
                    style={{ width: "100%" }}
                    value={line.y}
                    onChange={(e) => updateLine(index, { y: Number(e.target.value) })}
                  />
                </div>
              </div>
              <button
                style={{ ...smallButtonStyle, width: "100%", margin: "4px 0 6px" }}
                onClick={() => updateLine(index, { x: undefined, y: undefined })}
              >
                ↺ Back into the stack
              </button>
            </>
          )}
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
          {/* Right under Split by, because the split IS what the cue is tied to:
           * a word/letter split fires the sound once per unit and a line split
           * once for the whole line, so changing one without seeing the other
           * is how a line ends up ticking twenty times. */}
          <div style={{ marginBottom: 6 }}>
            <div style={miniLabelStyle}>Sound</div>
            <SfxSelect
              mode="auto"
              autoResolvesTo={resolveTextEntranceSfx({
                entrance: line.animation ?? "pop",
                splitBy: line.splitBy ?? "word",
              })}
              value={line.sfx}
              onChange={(sfx) => updateLine(index, { sfx })}
            />
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
          <div style={miniLabelStyle}>Text color</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
            <input
              type="color"
              value={isValidHex(line.color ?? "") ? (line.color as string) : line.pill ? "#171717" : "#ffffff"}
              onChange={(e) => updateLine(index, { color: e.target.value })}
              style={{ width: 32, height: 28, padding: 0, border: `1px solid ${editorColors.border}`, borderRadius: 6, flexShrink: 0 }}
            />
            <input
              style={inputStyle}
              value={line.color ?? ""}
              onChange={(e) => updateLine(index, { color: e.target.value || undefined })}
              placeholder={line.pill ? "default (dark on pill)" : "default (white)"}
            />
            {line.color ? (
              <button style={smallButtonStyle} title="Back to the default" onClick={() => updateLine(index, { color: undefined })}>
                ↺
              </button>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.value}
                title={swatch.label}
                onClick={() => updateLine(index, { color: swatch.value })}
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
          <SecondsSlider label="Pradžios uždelsimas" frames={block.delay ?? 0} onChange={(delay) => updateBlock(index, { delay })} />
          <div style={miniLabelStyle}>Sound</div>
          <SfxSelect
            mode="auto"
            autoResolvesTo={resolveTextEntranceSfx({
              entrance: block.animation ?? "pop",
              splitBy: block.splitBy ?? "word",
            })}
            value={block.sfx}
            onChange={(sfx) => updateBlock(index, { sfx })}
          />
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
          entranceDuration: entry.entranceDuration,
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

      <SecondsSlider label="Pradžios uždelsimas" frames={entry.delay ?? 0} onChange={(delay) => onUpdate({ delay })} />

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
        <>
          <input
            style={{ ...inputStyle, marginBottom: 6 }}
            value={entry.link.groupId}
            onChange={(e) =>
              onUpdate({ link: e.target.value ? { ...entry.link!, groupId: e.target.value } : undefined })
            }
            placeholder="group id — same string on the neighboring scene"
          />
          <SecondsSlider label="Perėjimo pradžia prieš kirpimą" frames={entry.link.glideLead ?? 0} maxFrames={60} onChange={(glideLead) => onUpdate({ link: { ...entry.link!, glideLead } })} />
          <SecondsSlider label="Perėjimo trukmė" frames={entry.link.glideDuration ?? 18} minFrames={1} maxFrames={90} onChange={(glideDuration) => onUpdate({ link: { ...entry.link!, glideDuration } })} />
          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 6 }}>
            {chainRole === "first"
              ? "Glide timing is read from the scene being arrived AT — set it on the LATER scene in the chain, not here."
              : "How this hop moves: lead starts it before the cut (so it travels while the previous scene's text is still exiting), length is how long the move takes."}
          </div>
        </>
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



/**
 * The ElevenLabs generation settings, mirroring the sliders in their own UI.
 *
 * Speed is first and always visible because it is the one that decides whether
 * the narration fits a short: the default pace reads as slow against fast cuts,
 * and generating at 1.1–1.2 is a different thing from playing a slow take
 * faster — one is someone talking quickly, the other is a tape running fast.
 * The rest sit behind a toggle; they are worth having, but they are not what
 * you reach for on every line.
 *
 * The values live in `library/preferences.json`, not in the project: this is
 * how you want your narrator to sound, not a property of one video.
 */
const VoiceSettingsFields: React.FC = () => {
  const preferences = usePreferences();
  const setPreferences = usePreferences((s) => s.set);
  const defaults = useVoiceStore((s) => s.defaults);
  const [open, setOpen] = React.useState(false);

  // Until the server has answered, there is nothing honest to draw a slider
  // against: a hardcoded fallback here would be a second set of defaults, and
  // the one on the server is the set that actually reaches ElevenLabs.
  if (!defaults) return null;

  const slider = (
    label: string,
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
    onChange: (value: number) => void,
    hint?: string
  ) => {
    const resolved = value ?? fallback;
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: editorColors.textDim }}>
          <span>{label}</span>
          <span style={{ color: editorColors.text }}>
            {resolved.toFixed(2)}
            {value === undefined ? " · numatyta" : ""}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={0.05}
          value={resolved}
          onChange={(event) => onChange(Number(event.target.value))}
          style={{ width: "100%", accentColor: editorColors.accent }}
        />
        {hint ? <div style={{ fontSize: 9, color: editorColors.textDim }}>{hint}</div> : null}
      </div>
    );
  };

  const overridden =
    preferences.voiceSpeed !== undefined ||
    preferences.voiceStability !== undefined ||
    preferences.voiceSimilarity !== undefined ||
    preferences.voiceStyle !== undefined ||
    preferences.voiceSpeakerBoost !== undefined;

  return (
    <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${editorColors.border}` }}>
      {slider(
        "Kalbėjimo greitis",
        preferences.voiceSpeed,
        defaults.speed,
        0.7,
        1.2,
        (voiceSpeed) => setPreferences({ voiceSpeed }),
        "Generuojama tokiu tempu — greitas kalbėjimas, ne pagreitintas įrašas."
      )}

      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => setOpen((value) => !value)} style={{ ...smallButtonStyle, padding: "3px 8px", fontSize: 10 }}>
          {open ? "▾ Mažiau" : "▸ Daugiau nustatymų"}
        </button>
        {overridden ? (
          <button
            style={{ ...smallButtonStyle, padding: "3px 8px", fontSize: 10 }}
            title="Grąžinti serverio numatytuosius"
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
            ↺ Numatytieji
          </button>
        ) : null}
      </div>

      {open ? (
        <div style={{ marginTop: 8 }}>
          {slider("Stabilumas", preferences.voiceStability, defaults.stability, 0, 1, (voiceStability) => setPreferences({ voiceStability }), "Aukštesnis — vienodesnis, žemesnis — raiškesnis.")}
          {slider("Panašumas", preferences.voiceSimilarity, defaults.similarityBoost, 0, 1, (voiceSimilarity) => setPreferences({ voiceSimilarity }))}
          {slider("Stiliaus išraiška", preferences.voiceStyle, defaults.style, 0, 1, (voiceStyle) => setPreferences({ voiceStyle }), "ElevenLabs įspėja: virš 0.50 balsas gali tapti nestabilus.")}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: editorColors.textDim }}>
            <input
              type="checkbox"
              checked={preferences.voiceSpeakerBoost ?? defaults.speakerBoost}
              onChange={(event) => setPreferences({ voiceSpeakerBoost: event.target.checked })}
            />
            Speaker boost
          </label>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Turns this scene's `vo` line into an audio clip on the timeline.
 *
 * The clip is placed at the scene's own start frame, which is where a line
 * spoken over this scene belongs — and from there it is an ordinary audio clip:
 * drag it, trim it, change its volume or speed, let it run past the cut.
 *
 * Its length is left UNSET on purpose. The waveform decoder already measures
 * the file when it draws it, and the timeline falls back to that; writing a
 * guessed length here would be a second, worse answer to a question something
 * else already answers exactly.
 */
const VoiceoverGenerator: React.FC<{ sceneId: string; text: string | undefined }> = ({ sceneId, text }) => {
  const configured = useVoiceStore((s) => s.configured);
  const checkStatus = useVoiceStore((s) => s.checkStatus);
  const generate = useVoiceStore((s) => s.generate);
  const generating = useVoiceStore((s) => s.generating.includes(sceneId));
  const error = useVoiceStore((s) => s.error);
  const project = useProjectStore((s) => s.project);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const selectObject = useProjectStore((s) => s.selectObject);
  const preferences = usePreferences();

  React.useEffect(() => {
    if (configured === null) void checkStatus();
  }, [configured, checkStatus]);

  const sceneFrom = computeSceneTimings(project).find((entry) => entry.scene.id === sceneId)?.from ?? 0;

  if (configured === false) {
    return (
      <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 8, lineHeight: 1.5 }}>
        Balso generavimas išjungtas. Įrašyk <code>ELEVENLABS_API_KEY</code> į <code>.env.local</code> ir perkrauk dev
        serverį.
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <VoiceSettingsFields />
      <button
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
          if (inserted) selectObject(`audio-clip-${inserted.id}`);
        }}
        style={{
          ...smallButtonStyle,
          opacity: !text?.trim() || generating ? 0.5 : 1,
          borderColor: editorColors.accent,
          color: editorColors.accent,
        }}
      >
        {generating ? "Generuojama…" : "🎙 Generuoti įgarsinimą"}
      </button>
      {error ? (
        <div style={{ fontSize: 10, color: "#ff8a65", marginTop: 6, whiteSpace: "pre-wrap" }}>{error}</div>
      ) : null}
    </div>
  );
};


/**
 * The scene's objects as a LIST, not as a second editor.
 *
 * Every one of these had a full editor here AND a full editor in the object
 * panel — two sets of controls for one line of text, which is how the two drift
 * and how you end up hunting for the colour picker that only exists in one of
 * them. Configuration lives with the selection: click a row, the object panel
 * opens on it.
 *
 * What stays here is what the SCENE owns and an individual object cannot answer
 * on its own: what exists, in what order, and adding or removing one.
 */
const SceneObjectList: React.FC<{
  rows: { id: string; label: string; detail?: string }[];
  emptyLabel: string;
  onAdd?: () => void;
  addLabel?: string;
  onMove?: (id: string, direction: -1 | 1) => void;
  onRemove?: (id: string) => void;
}> = ({ rows, emptyLabel, onAdd, addLabel, onMove, onRemove }) => {
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectObject = useProjectStore((s) => s.selectObject);
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {rows.length === 0 ? <div style={{ fontSize: 11, color: editorColors.textDim }}>{emptyLabel}</div> : null}
      {rows.map((row, index) => {
        const qualified = qualifySelection(selectedSceneId ?? undefined, row.id);
        const selected = selectedObjectId === qualified;
        return (
          <div
            key={row.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "7px 8px",
              borderRadius: 7,
              border: `1px solid ${selected ? editorColors.accent : editorColors.border}`,
              background: selected ? "rgba(255,112,36,0.08)" : editorColors.panelElevated,
            }}
          >
            <button
              onClick={() => selectObject(qualified)}
              title="Atidaryti nustatymus"
              style={{ flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none", color: editorColors.text, cursor: "pointer", padding: 0 }}
            >
              <div style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.label || <em style={{ color: editorColors.textDim }}>(tuščia)</em>}
              </div>
              {row.detail ? <div style={{ fontSize: 10, color: editorColors.textDim }}>{row.detail}</div> : null}
            </button>
            {onMove ? (
              <>
                <button style={miniButtonStyle} disabled={index === 0} title="Aukštyn" onClick={() => onMove(row.id, -1)}>↑</button>
                <button style={miniButtonStyle} disabled={index === rows.length - 1} title="Žemyn" onClick={() => onMove(row.id, 1)}>↓</button>
              </>
            ) : null}
            {onRemove ? (
              <button style={miniButtonStyle} title="Pašalinti" onClick={() => onRemove(row.id)}>×</button>
            ) : null}
          </div>
        );
      })}
      {onAdd ? (
        <button style={{ ...smallButtonStyle, marginTop: 3 }} onClick={onAdd}>
          {addLabel ?? "+ Pridėti"}
        </button>
      ) : null}
    </div>
  );
};

const miniButtonStyle: React.CSSProperties = {
  padding: "2px 6px",
  fontSize: 10,
  borderRadius: 5,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  cursor: "pointer",
};


/** The whole rich-headline stack's position, which is a SCENE-level choice —
 * it decides where the text column sits, not what any one line does. A line's
 * own x/y lives in that line's panel. */
const StackPositionFields: React.FC<{
  x?: number;
  y?: number;
  onChange: (patch: { richHeadlineX?: number; richHeadlineY?: number }) => void;
}> = ({ x, y, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {([
      ["X", x, (value: number | undefined) => onChange({ richHeadlineX: value })],
      ["Y", y, (value: number | undefined) => onChange({ richHeadlineY: value })],
    ] as const).map(([label, value, set]) => (
      <div key={label}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: editorColors.textDim }}>
          <span>{label}</span>
          <span>{value === undefined ? "auto" : `${Math.round(value)}%`}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={value ?? 50}
            onChange={(event) => set(Number(event.target.value))}
            style={{ flex: 1, accentColor: editorColors.accent }}
          />
          <button
            style={{ ...miniButtonStyle, opacity: value === undefined ? 0.4 : 1 }}
            title="Grąžinti automatinę vietą"
            onClick={() => set(undefined)}
          >
            ↺
          </button>
        </div>
      </div>
    ))}
  </div>
);

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
        {!isSteps && !isComparison ? (
          <>
            <Section title={`Tekstas (${(scene.content.richHeadline ?? []).length})`} defaultOpen>
              <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 8, lineHeight: 1.45 }}>
                Paspausk eilutę — jos turinys, stilius, vieta, animacija ir garsas atsidaro objekto skydelyje.
              </div>
              <SceneObjectList
                rows={(scene.content.richHeadline ?? []).map((line, index) => ({
                  id: `line-${index}`,
                  label: line.text,
                  detail: `${line.size}${line.pill ? " · pill" : ""}${line.x !== undefined && line.y !== undefined ? ` · x${Math.round(line.x)} y${Math.round(line.y)}` : ""}`,
                }))}
                emptyLabel="Šioje scenoje teksto dar nėra."
                addLabel="+ Tekstas"
                onAdd={() => {
                  const lines = scene.content.richHeadline ?? [];
                  if (lines.length >= 6) return;
                  updateSceneRichHeadline(selectedSceneId, [...lines, { text: "Naujas tekstas", size: "headline" as const }]);
                }}
                onMove={(id, direction) => {
                  const lines = [...(scene.content.richHeadline ?? [])];
                  const at = Number(id.slice(5));
                  const to = at + direction;
                  if (to < 0 || to >= lines.length) return;
                  [lines[at], lines[to]] = [lines[to], lines[at]];
                  updateSceneRichHeadline(selectedSceneId, lines);
                }}
                onRemove={(id) => {
                  const at = Number(id.slice(5));
                  updateSceneRichHeadline(selectedSceneId, (scene.content.richHeadline ?? []).filter((_, index) => index !== at));
                }}
              />
              <div style={{ marginTop: 10 }}>
                <div style={labelStyle}>Teksto stulpelio vieta</div>
                <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 6 }}>
                  Perkelia VISĄ stulpelį, kad gretimos scenos nedėtų antraščių ant tos pačios linijos. Atskiros eilutės
                  vieta nustatoma jos pačios skydelyje.
                </div>
                <StackPositionFields
                  x={scene.content.richHeadlineX}
                  y={scene.content.richHeadlineY}
                  onChange={(patch) => updateSceneContent(selectedSceneId, patch)}
                />
              </div>
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
                        entranceDuration: scene.content[side]?.visualEntranceDuration,
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
                          ...("entranceDuration" in patch
                            ? { visualEntranceDuration: patch.entranceDuration }
                            : {}),
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

      {(scene.content.blocks ?? []).length ? (
        <Section title={`Seni teksto blokai (${scene.content.blocks!.length})`} subtitle="Ankstesnio modelio tekstas. Konfigūruojamas pažymėjus, kaip ir visa kita.">
          <SceneObjectList
            rows={(scene.content.blocks ?? []).map((block) => ({
              id: `block-${block.id}`,
              label: block.text,
              detail: `${block.type} · x${Math.round(block.x)} y${Math.round(block.y)}`,
            }))}
            emptyLabel=""
            onRemove={(id) =>
              updateSceneBlocks(selectedSceneId, (scene.content.blocks ?? []).filter((block) => `block-${block.id}` !== id))
            }
          />
        </Section>
      ) : null}

      <Section title="Įgarsinimas" subtitle="Nustato, kiek scena laikosi ekrane" defaultOpen>
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          Tekstas, kurį sakai per šią sceną. Iš jo skaičiuojama scenos trukmė, kad kirpimas nenukristų anksčiau, nei
          baigi sakinį — ir iš jo pat generuojamas balsas.
        </div>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          value={scene.vo ?? ""}
          placeholder="Ką sakai per šią sceną…"
          onChange={(e) => updateScene(selectedSceneId, { vo: e.target.value || undefined })}
        />
        {scene.vo ? (
          <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 4 }}>
            ≈ {voDurationSeconds(scene.vo).toFixed(1)}s ištarti
          </div>
        ) : null}
        <VoiceoverGenerator sceneId={selectedSceneId} text={scene.vo} />
      </Section>

      <Section title="Notes" subtitle="Never rendered — what this frame still needs">
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          Carried over from the storyboard beat that generated this scene (its visual placeholder and notes), so the
          description of what has to be shown stays attached to the frame that needs it.
        </div>
        <textarea
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
          value={scene.notes ?? ""}
          placeholder="e.g. Chrome integration recording"
          onChange={(e) => updateScene(selectedSceneId, { notes: e.target.value || undefined })}
        />
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
        subtitle="Apačioje esantis piešiamas po viršutiniu. ↑ / ↓ keičia eiliškumą; nustatymai — paspaudus sluoksnį. Naujų pridedi iš Visuals kortelės."
      >
        <SceneObjectList
          rows={(scene.content.visuals ?? []).map((entry) => ({
            id: `visual-${entry.id}`,
            label: entry.visual.type,
            detail: `x${Math.round(entry.x)} y${Math.round(entry.y)}${entry.scale ? ` · ${entry.scale.toFixed(2)}×` : ""}${entry.link ? " · perkeliamas" : ""}`,
          }))}
          emptyLabel="Sluoksnių nėra. Pridėk iš Visuals kortelės."
          onMove={(id, direction) => {
            const visuals = [...(scene.content.visuals ?? [])];
            const at = visuals.findIndex((entry) => `visual-${entry.id}` === id);
            const to = at + direction;
            if (at === -1 || to < 0 || to >= visuals.length) return;
            [visuals[at], visuals[to]] = [visuals[to], visuals[at]];
            updateSceneVisuals(selectedSceneId, visuals);
          }}
          onRemove={(id) =>
            updateSceneVisuals(selectedSceneId, (scene.content.visuals ?? []).filter((entry) => `visual-${entry.id}` !== id))
          }
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
        <SecondsSlider label="Entrance duration" frames={scene.motion?.entranceDuration ?? 18} minFrames={1} maxFrames={60} onChange={(entranceDuration) => updateSceneMotion(selectedSceneId, { entranceDuration })} />
        <div style={{ fontSize: 11, color: editorColors.textDim, marginBottom: 6 }}>
          Empty lets the preset run at its own pace — every preset but fade is a spring, which settles on its own.
        </div>
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
          <SecondsSlider label="Exit duration" frames={scene.motion?.exitDuration ?? 18} minFrames={1} maxFrames={60} onChange={(exitDuration) => updateSceneExitDuration(selectedSceneId, exitDuration)} />
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

        <SecondsSlider label="Tarpas tarp elementų" frames={scene.motion?.stagger ?? 6} maxFrames={60} onChange={(stagger) => updateSceneStagger(selectedSceneId, stagger)} />

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
