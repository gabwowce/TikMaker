import React from "react";
import { computeSceneTimings, projectDurationInFrames } from "../../utils/duration";
import { sceneStartDelay, staggerDelay } from "../../video/scenes/EnterOnCue";
import { splitSpan } from "../../video/typography/splitAnimate";
import { resolveEntranceSfx, resolveExitSfx } from "../../video/motion/sfxDefaults";
import { useProjectStore } from "../state/projectStore";
import { usePreferences } from "../state/fileLibrary";
import { editorColors } from "../theme";
import { FullVideoTimeline } from "./FullVideoTimeline";
import { TimelineContextMenu, type ContextTarget } from "./TimelineContextMenu";
import { useCustomAssetsStore } from "../state/customAssetsStore";
import { useTimelineWheelZoom } from "./useTimelineWheelZoom";
import { visualTimelinePreview, type TimelinePreview } from "./visualTimelinePreview";
import { clipboardHas, copyTimelineObjects, duplicateTimelineObjects, pasteTimelineObjects } from "./objectClipboard";
import { applyTimelineObjectPositions } from "./moveTimelineObjects";
import { isAudioDrag, readAudioDragPayload } from "./audioDrag";
import { formatTimecode } from "../../utils/timecode";
import { qualifySelection } from "./selectionId";
import { keyframePins, sortedKeyframes } from "../../video/layout/visualKeyframes";
import { fallbackWaveform, sliceWaveform, useAudioWaveforms } from "./useAudioWaveforms";
import { getSfx } from "../../registries/sfxRegistry";

const LABEL_WIDTH = 190;
const ROW_HEIGHT = 34;
type TimelineRow = { id: string; label: string; kind: "text" | "visual" | "item" | "sound"; inspectorTab: "content" | "visuals"; start: number; end: number; point?: boolean; set: (start: number, end: number) => void; /** Position and scale are separate tracks, so a diamond says which one (or
   * both) it pins — otherwise every keyframe looks alike and you cannot tell
   * why a move starts where it does. */
  keyframes?: { id: string; frame: number; position?: boolean; scale?: boolean }[]; moveKeyframe?: (keyframeId: string, frame: number) => void;
  /** Animation windows rendered as white dividers inside the clip. */
  entranceDuration?: number;
  exitDuration?: number;
  setEntranceDuration?: (frames: number) => void;
  setExitDuration?: (frames: number) => void;
  preview?: TimelinePreview;
  waveform?: number[];
  trimMin?: number;
  trimEndMax?: number;
  /** The lane the author pinned this object to, and how to re-pin it. Rows
   * without `setLane` (the scene's own text group and its sound cues) stay
   * where the packing puts them — they are not objects you can own a lane. */
  lane?: number;
  setLane?: (lane: number) => void };
type DragMode = "move" | "start" | "end";
const colorsByKind = { text: "#8b5cf6", visual: "#ff7024", item: "#14b8a6", sound: "#3b82f6" };
/** A lane holds several objects, so it is named after what it carries rather
 * than after whichever one happens to sit first. */
const laneLabel = (kind: TimelineRow["kind"]) =>
  kind === "text" ? "Tekstas" : kind === "visual" ? "Vizualai" : kind === "item" ? "Punktai" : "Garsai";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Breathing room between two clips before they are allowed to share a lane —
 * touching edges read as one clip. */
const LANE_GAP_FRAMES = 2;

/** Two clips can share a lane only with clear air between them — touching
 * edges read as one clip. A point marker (a sound cue) has no width of its own,
 * so it is treated as `LANE_GAP_FRAMES` wide. */
/** Fallback for the render that happens BEFORE `materializeLanes` commits a
 * lane — its own ordinal among its kind, which is stable and never depends on
 * where the other clips currently sit. */
function autoLane(row: TimelineRow, ofKind: TimelineRow[]): number {
  return ofKind.indexOf(row);
}

function overlaps(a: { start: number; end: number; point?: boolean }, b: { start: number; end: number; point?: boolean }): boolean {
  const spanOf = (row: { start: number; end: number; point?: boolean }) => ({
    from: row.start - LANE_GAP_FRAMES,
    to: (row.point ? row.start + LANE_GAP_FRAMES : row.end) + LANE_GAP_FRAMES,
  });
  const first = spanOf(a);
  const second = spanOf(b);
  return first.from < second.to && second.from < first.to;
}
/** A scene can be dragged short, but not to nothing — under this it is a
 * dropped frame rather than a fast cut. Matches the pacer's own floor. */
const MIN_SCENE_FRAMES = 9;
const MIN_PANEL_HEIGHT = 120;
const MAX_PANEL_HEIGHT = 900;

/**
 * Snapping for a clip drag.
 *
 * Lining two clips up by eye means landing on the same frame with a mouse over
 * a 5px-per-frame ruler, which is a coin flip — you end up one frame out and
 * the cut reads as sloppy without it being visible in the timeline. The magnet
 * is a few pixels wide, converted to frames so it feels the same at every zoom.
 */
const SNAP_PX = 7;

function snapFrame(frame: number, targets: number[], pixelsPerFrame: number): number {
  const tolerance = SNAP_PX / pixelsPerFrame;
  let best = frame;
  let bestDistance = tolerance;
  for (const target of targets) {
    const distance = Math.abs(target - frame);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = target;
    }
  }
  return Math.round(best);
}

const Clip: React.FC<{
  row: TimelineRow;
  max: number;
  pixelsPerFrame: number;
  snapTargets: number[];
  fps: number;
  selected: boolean;
  /** Where this clip currently sits among the lanes of its own kind, and how
   * many there are — a vertical drag moves it by whole lanes, and one past the
   * last lane creates a new one. */
  laneIndex: number;
  laneCount: number;
  onContextMenu: (event: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: (additive: boolean) => void;
  /**
   * Captures where every OTHER selected clip currently sits and returns the
   * function that moves them by a frame delta — null when this clip is not part
   * of a multi-selection.
   *
   * The dragged clip stays the anchor: it is the one that snaps, and the delta
   * it actually ended up with is what the rest follow. Snapping each clip to
   * its own nearest target would pull the group apart, which is the one thing a
   * group drag must not do.
   */
  beginGroupDrag: (() => (delta: number) => void) | null;
}> = ({ row, max, pixelsPerFrame, snapTargets, fps, selected, laneIndex, laneCount, onContextMenu, onDragStart, onDragEnd, onSelect, beginGroupDrag }) => {
  /** Lanes the pointer has travelled during THIS drag. Local state, because it
   * is a preview of where the clip would land, not a committed change. */
  const [laneShift, setLaneShift] = React.useState(0);
  const start = clamp(Math.round(row.start), 0, Math.max(0, max - 1));
  const end = clamp(Math.round(row.end), start + 1, max);
  function begin(event: React.PointerEvent, mode: DragMode) {
    event.preventDefault();
    event.stopPropagation();
    const additive = event.ctrlKey || event.metaKey;
    /**
     * Pressing on a clip that is ALREADY selected must not collapse the
     * selection — that is the press which starts a group drag, and collapsing
     * first would leave one clip moving and the rest behind. The collapse is
     * deferred to pointer-up-without-a-drag, which is where "I clicked this one
     * to work on it" actually happens. Pressing an unselected clip selects it
     * immediately, so the drag it starts is about the clip under the cursor.
     */
    const selectOnRelease = selected && !additive;
    if (!selectOnRelease) onSelect(additive);
    let moved = false;
    onDragStart();
    const originX = event.clientX;
    const originY = event.clientY;
    const originStart = start;
    const originEnd = end;
    const length = originEnd - originStart;
    const moveGroup = mode === "move" ? beginGroupDrag?.() ?? null : null;
    const move = (pointer: PointerEvent) => {
      if (!moved && Math.abs(pointer.clientX - originX) + Math.abs(pointer.clientY - originY) < 3) return;
      moved = true;
      // Vertical movement only means something for a whole-clip drag — pulling
      // an edge is about timing, not about which lane the clip lives in.
      if (mode === "move" && row.setLane) {
        const shift = Math.round((pointer.clientY - originY) / ROW_HEIGHT);
        setLaneShift(clamp(laneIndex + shift, 0, laneCount) - laneIndex);
      }
      const delta = (pointer.clientX - originX) / pixelsPerFrame;
      // The edge being dragged is what snaps; the other one stays put. On a
      // whole-clip move BOTH edges are candidates, so whichever is closer to a
      // target wins — that is what makes a clip line up with the one above it
      // by either its start or its end, whichever you aimed at.
      if (mode === "start") {
        const next = snapFrame(originStart + delta, snapTargets, pixelsPerFrame);
        row.set(clamp(next, row.trimMin ?? 0, originEnd - 1), originEnd);
      } else if (mode === "end") {
        const next = snapFrame(originEnd + delta, snapTargets, pixelsPerFrame);
        row.set(originStart, clamp(next, originStart + 1, row.trimEndMax ?? max));
      } else {
        const rawStart = originStart + delta;
        const snappedStart = snapFrame(rawStart, snapTargets, pixelsPerFrame);
        const snappedEnd = snapFrame(rawStart + length, snapTargets, pixelsPerFrame) - length;
        const nextStart =
          Math.abs(snappedStart - rawStart) <= Math.abs(snappedEnd - rawStart) ? snappedStart : snappedEnd;
        const start = clamp(nextStart, 0, max - length);
        // In a group drag the anchor is written by the batch along with
        // everyone else; writing it here too would be a second, stale write.
        if (moveGroup) moveGroup(start - originStart);
        else row.set(start, start + length);
      }
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      // Committed on release, not while moving: pinning a lane on every
      // pointermove would rewrite the project (and the undo stack) dozens of
      // times for one gesture.
      setLaneShift((shift) => {
        if (shift !== 0) row.setLane?.(laneIndex + shift);
        return 0;
      });
      if (selectOnRelease && !moved) onSelect(false);
      onDragEnd();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  return (
    <div
      data-timeline-object={row.id}
      onPointerDown={(event) => begin(event, "move")}
      onContextMenu={onContextMenu}
      title={`${row.label} · ${formatTimecode(start, fps)} – ${formatTimecode(end, fps)} (${start}–${end} kadrai)`}
      style={{
        position: "absolute",
        left: start * pixelsPerFrame,
        top: 4 + laneShift * ROW_HEIGHT,
        width: Math.max(10, (end - start) * pixelsPerFrame),
        height: ROW_HEIGHT - 8,
        borderRadius: 5,
        // The selected clip is the one the object panel is editing. Without a
        // visible mark, clicking a clip and then looking at the panel is the
        // only way to tell what you have — and with several clips sharing a
        // lane, that is not a question you should have to ask.
        border: selected ? `2px solid ${editorColors.accent}` : `1px solid ${colorsByKind[row.kind]}`,
        background: selected ? `${colorsByKind[row.kind]}99` : `${colorsByKind[row.kind]}44`,
        boxShadow: selected ? `0 0 0 1px rgba(0,0,0,0.6), 0 2px 10px ${editorColors.accent}55` : undefined,
        // Above its neighbours while it is being carried to another lane.
        zIndex: laneShift !== 0 ? 6 : selected ? 2 : 1,
        opacity: laneShift !== 0 ? 0.9 : 1,
        color: "#fff",
        cursor: "grab",
        userSelect: "none",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {!row.point ? <div onPointerDown={(event) => begin(event, "start")} style={{ ...handleStyle, left: 0 }} /> : null}
      {row.preview?.src ? <ClipPreview preview={row.preview} /> : null}
      {row.waveform ? <div style={{ position: "absolute", inset: "4px 8px", display: "flex", alignItems: "center", gap: 1, opacity: 0.9, pointerEvents: "none" }}>{row.waveform.map((peak, index) => <i key={index} style={{ flex: 1, minWidth: 1, height: `${Math.max(8, peak * 100)}%`, background: "#38bdf8", borderRadius: 1 }} />)}</div> : null}
      {!row.point && row.entranceDuration ? <AnimationWindow side="in" frames={row.entranceDuration} clipFrames={end - start} pixelsPerFrame={pixelsPerFrame} onChange={row.setEntranceDuration} onDragStart={onDragStart} onDragEnd={onDragEnd} /> : null}
      {!row.point && row.exitDuration ? <AnimationWindow side="out" frames={row.exitDuration} clipFrames={end - start} pixelsPerFrame={pixelsPerFrame} onChange={row.setExitDuration} onDragStart={onDragStart} onDragEnd={onDragEnd} /> : null}
      <div style={{ padding: "5px 12px", fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.point ? "♪ " : ""}{row.label}</div>
      {!row.point ? <div onPointerDown={(event) => begin(event, "end")} style={{ ...handleStyle, right: 0 }} /> : null}
    </div>
  );
};

const ClipPreview: React.FC<{ preview: TimelinePreview }> = ({ preview }) => preview.video
  ? <video src={preview.src} muted playsInline preload="auto" style={previewMediaStyle} />
  : <div style={{ ...previewMediaStyle, backgroundImage: preview.src ? `url(${JSON.stringify(preview.src)})` : undefined, backgroundRepeat: "repeat-x", backgroundSize: "auto 100%" }} />;

const AnimationWindow: React.FC<{ side: "in" | "out"; frames: number; clipFrames: number; pixelsPerFrame: number; onChange?: (frames: number) => void; onDragStart: () => void; onDragEnd: () => void }> = ({ side, frames, clipFrames, pixelsPerFrame, onChange, onDragStart, onDragEnd }) => {
  const width = Math.min(Math.max(0, frames), clipFrames) * pixelsPerFrame;
  if (width < 2) return null;
  const begin = (event: React.PointerEvent) => {
    if (!onChange) return;
    event.preventDefault(); event.stopPropagation(); onDragStart();
    const originX = event.clientX; const originFrames = frames;
    const move = (pointer: PointerEvent) => onChange(clamp(Math.round(originFrames + (pointer.clientX - originX) / pixelsPerFrame * (side === "in" ? 1 : -1)), 1, clipFrames));
    const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); onDragEnd(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish, { once: true }); window.addEventListener("pointercancel", finish, { once: true });
  };
  return <div
    title={`${side.toUpperCase()} animacija · ${frames} kadrai`}
    style={{
      position: "absolute",
      zIndex: 3,
      top: 0,
      bottom: 0,
      width,
      ...(side === "in" ? { left: 0, borderRight: "2px solid rgba(255,255,255,.95)" } : { right: 0, borderLeft: "2px solid rgba(255,255,255,.95)" }),
      background: "rgba(255,255,255,.07)",
      pointerEvents: "none",
      boxSizing: "border-box",
    }}
  ><span onPointerDown={begin} style={{ position: "absolute", top: 0, bottom: 0, width: 10, ...(side === "in" ? { right: -5 } : { left: -5 }), pointerEvents: onChange ? "auto" : "none", cursor: "ew-resize" }} /></div>;
};

/**
 * A layer's keyframes, drawn ON the track rather than inside the clip: they are
 * scene-relative moments, and a clip with `overflow: hidden` would swallow any
 * that sit outside the layer's own in/out window — exactly the ones you need to
 * see to understand why a path looks wrong. Dragging one retimes it; the pose
 * it holds is edited in the panel (or by moving the visual at that playhead).
 */
const KeyframeMarkers: React.FC<{ row: TimelineRow; max: number; pixelsPerFrame: number; onDragStart: () => void; onDragEnd: () => void; onSelect: () => void }> = ({ row, max, pixelsPerFrame, onDragStart, onDragEnd, onSelect }) => {
  if (!row.keyframes?.length || !row.moveKeyframe) return null;
  const move = row.moveKeyframe;

  function begin(event: React.PointerEvent, keyframeId: string, from: number) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onDragStart();
    const originX = event.clientX;
    const onMove = (pointer: PointerEvent) => {
      move(keyframeId, clamp(from + Math.round((pointer.clientX - originX) / pixelsPerFrame), 0, max));
    };
    const finish = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      onDragEnd();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }

  return <>
    {row.keyframes.map((keyframe) => {
      // Both tracks on one frame share a diamond; a diamond that pins only one
      // is drawn in that track's colour and sits on its own half of the row.
      const both = keyframe.position && keyframe.scale;
      const color = both ? "#a855f7" : keyframe.scale ? "#38bdf8" : editorColors.accent;
      const label = both ? "pozicija + mastelis" : keyframe.scale ? "mastelis" : "pozicija";
      const offset = both ? 0 : keyframe.scale ? 5 : -5;
      return (
        <div
          key={keyframe.id}
          onPointerDown={(event) => begin(event, keyframe.id, keyframe.frame)}
          title={`Keyframe · ${label} · ${keyframe.frame} kadras`}
          style={{ position: "absolute", left: keyframe.frame * pixelsPerFrame - 5, top: ROW_HEIGHT / 2 - 5 + offset, width: 10, height: 10, transform: "rotate(45deg)", background: color, border: "1px solid #111", borderRadius: 2, cursor: "ew-resize", zIndex: 3 }}
        />
      );
    })}
  </>;
};

type SceneTimelineProps = { currentFrame?: number; onSeek?: (absoluteFrame: number) => void };

/**
 * Keep the mode switch outside the scene timeline itself. SceneTimelineScene
 * owns considerably more hooks than FullVideoTimeline; returning the full
 * timeline halfway through that hook list made React see fewer hooks whenever
 * the user switched modes.
 */
export const SceneTimeline: React.FC<SceneTimelineProps> = ({ currentFrame = 0, onSeek }) => {
  const [mode, setMode] = React.useState<"scene" | "full">("scene");
  const hasScenes = useProjectStore((state) => state.project.scenes.length > 0);

  if (mode === "full") {
    return <FullVideoTimeline currentFrame={currentFrame} onSeek={(frame) => onSeek?.(frame)} onSceneMode={() => setMode("scene")} />;
  }

  // Mount the hook-heavy scene editor only after a scene exists. This also
  // prevents an empty project/import transition from changing its hook count.
  return hasScenes
    ? <SceneTimelineScene currentFrame={currentFrame} onSeek={onSeek} onFullMode={() => setMode("full")} />
    : null;
};

const SceneTimelineScene: React.FC<SceneTimelineProps & { onFullMode: () => void }> = ({ currentFrame = 0, onSeek, onFullMode }) => {
  const [expanded, setExpanded] = React.useState(true);
  const [pixelsPerFrame, setPixelsPerFrame] = React.useState(5);
  const [contextTarget, setContextTarget] = React.useState<ContextTarget | null>(null);
  const [clipboardReady, setClipboardReady] = React.useState(clipboardHas);
  /** How tall the track area is, dragged from the strip above it. Persisted
   * because it is a workspace preference, not something to re-set every time
   * the editor reloads. */
  const storedPanelHeight = usePreferences((state) => state.timelineHeight);
  const setPreferences = usePreferences((state) => state.set);
  const [panelHeight, setPanelHeight] = React.useState(() =>
    Number.isFinite(storedPanelHeight) ? clamp(storedPanelHeight as number, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT) : 250
  );

  const beginPanelResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const originY = event.clientY;
    const originHeight = panelHeight;
    const move = (pointer: PointerEvent) => {
      // Dragging UP grows the panel, which is why the delta is inverted: the
      // handle is on the timeline's top edge and the panel extends downward.
      const next = clamp(originHeight + (originY - pointer.clientY), MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT);
      setPanelHeight(next);
      setPreferences({ timelineHeight: next });
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  };
  const rulerRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const customAssets = useCustomAssetsStore((state) => state.assets);
  const loadCustomAssets = useCustomAssetsStore((state) => state.load);
  const project = useProjectStore((s) => s.project);
  const storedSelectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const selectScene = useProjectStore((s) => s.selectScene);
  const updateScene = useProjectStore((s) => s.updateScene);
  const updateSceneMotion = useProjectStore((s) => s.updateSceneMotion);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const updateSceneItems = useProjectStore((s) => s.updateSceneItems);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
  const updateSceneRichHeadline = useProjectStore((s) => s.updateSceneRichHeadline);
  const updateAudioClip = useProjectStore((s) => s.updateAudioClip);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const splitAudioClip = useProjectStore((s) => s.splitAudioClip);
  const selectObject = useProjectStore((s) => s.selectObject);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectedObjectIds = useProjectStore((s) => s.selectedObjectIds);
  const toggleObjectSelection = useProjectStore((s) => s.toggleObjectSelection);
  const selectObjects = useProjectStore((s) => s.selectObjects);
  const updateVisualKeyframe = useProjectStore((s) => s.updateVisualKeyframe);
  const beginHistoryTransaction = useProjectStore((s) => s.beginHistoryTransaction);
  const endHistoryTransaction = useProjectStore((s) => s.endHistoryTransaction);
  React.useEffect(() => { loadCustomAssets(); }, [loadCustomAssets]);
  useTimelineWheelZoom(viewportRef, LABEL_WIDTH, pixelsPerFrame, setPixelsPerFrame, 0.5, 20);
  const timings = computeSceneTimings(project);
  const cueIds = timings.flatMap(({ scene }) => [resolveEntranceSfx({ override: scene.motion?.sfx, entrance: scene.motion?.entrance }), scene.motion?.exit ? resolveExitSfx({ override: scene.motion?.exitSfx, exit: scene.motion.exit }) : undefined, ...(scene.content.visuals ?? []).flatMap((visual) => [visual.sfx && visual.sfx !== "none" ? visual.sfx : undefined, visual.exitSfx && visual.exitSfx !== "none" ? visual.exitSfx : undefined])]).filter((id): id is string => Boolean(id));
  const audioSources = [...(project.audioClips ?? []).map((clip) => getSfx(clip.sfxId)?.src), ...cueIds.map((id) => getSfx(id)?.src)].filter((src): src is string => Boolean(src));
  const audioWaveforms = useAudioWaveforms(audioSources, project.fps);
  React.useEffect(() => {
    // Legacy clips did not store their decoded length. Persist it as soon as
    // the waveform is available, so VO hand-offs can keep the whole first line
    // and delay the next one instead of guessing at a scene boundary.
    for (const clip of project.audioClips ?? []) {
      if (clip.durationInFrames !== undefined) continue;
      const src = getSfx(clip.sfxId)?.src;
      const durationInFrames = src ? audioWaveforms.get(src)?.durationInFrames : undefined;
      if (durationInFrames !== undefined) updateAudioClip(clip.id, { durationInFrames });
    }
  }, [audioWaveforms, project.audioClips, updateAudioClip]);
  const cueShape = (id: string, sourceStart: number, requestedDuration: number | undefined, seed: string) => {
    const src = getSfx(id)?.src; const info = src ? audioWaveforms.get(src) : undefined;
    const available = Math.max(1, (info?.durationInFrames ?? sourceStart + (requestedDuration ?? 30)) - sourceStart);
    const length = Math.min(requestedDuration ?? available, available);
    return { length, available, waveform: info ? sliceWaveform(info.peaks, sourceStart, length, info.durationInFrames) : fallbackWaveform(seed) };
  };
  const timing = timings.find((entry) => entry.scene.id === storedSelectedSceneId)
    ?? timings.find((entry) => currentFrame >= entry.from && currentFrame < entry.from + entry.durationInFrames)
    ?? timings[0];
  if (!timing) return null;
  const selectedSceneId = timing.scene.id;
  const scene = timing.scene;
  const visuals = scene.content.visuals ?? [];
  const steps = scene.content.items ?? [];
  const blocks = scene.content.blocks ?? [];
  const lines = scene.content.richHeadline ?? [];
  const sceneEnd = timing.durationInFrames;
  const explicitEnd = Math.max(
    scene.motion?.exitAt ?? sceneEnd,
    ...lines.map((line) => line.exitAt ?? sceneEnd),
    ...blocks.map((block) => block.exitAt ?? sceneEnd),
    ...visuals.flatMap((entry) => [
      entry.exitAt ?? sceneEnd,
      ...(entry.visual.type === "checklist" ? entry.visual.items.map((item) => item.exitAt ?? entry.exitAt ?? sceneEnd) : []),
    ]),
    ...steps.map((item) => item.exitAt ?? sceneEnd),
  );
  // The scene is the object's owner and a convenient focused view, not a clip
  // mask. Showing the remainder of the video lets an OUT handle cross cuts.
  const max = Math.max(sceneEnd * 2, projectDurationInFrames(project) - timing.from, explicitEnd);
  const localFrame = clamp(currentFrame - timing.from, 0, max);
  /** Ctrl/Cmd-click adds to the selection instead of replacing it — the
   * standard gesture, and the only way to copy several clips at once. */
  const openInspector = (row: TimelineRow, additive = false) => {
    const id = qualifySelection(selectedSceneId, row.id);
    return additive ? toggleObjectSelection(id) : selectObject(id);
  };
  const setVisual = (index: number, patch: Record<string, unknown>) => updateSceneVisuals(selectedSceneId, visuals.map((value, at) => at === index ? { ...value, ...patch } : value));
  const setChecklistItemLane = (visualIndex: number, itemIndex: number, lane: number) => {
    const entry = visuals[visualIndex];
    if (!entry || entry.visual.type !== "checklist") return;
    const checklist = entry.visual;
    setVisual(visualIndex, {
      visual: { ...checklist, items: checklist.items.map((item, at) => (at === itemIndex ? { ...item, lane } : item)) },
    });
  };

  const setChecklistItem = (visualIndex: number, itemIndex: number, delay: number, exitAt: number) => {
    const entry = visuals[visualIndex];
    if (!entry || entry.visual.type !== "checklist") return;
    setVisual(visualIndex, { visual: { ...entry.visual, items: entry.visual.items.map((value, at) => at === itemIndex ? { ...value, delay, exitAt } : value) } });
  };
  let automaticLineDelay = sceneStartDelay(scene.motion);
  const automaticLineDelays = lines.map((line) => {
    const result = automaticLineDelay;
    const splitBy = line.splitBy ?? "word";
    automaticLineDelay += splitSpan(line.text, splitBy, line.splitDuration, line.entranceDuration) + staggerDelay(1, scene.motion?.stagger);
    return result;
  });
  const rows: TimelineRow[] = [
    ...(lines.length === 0 ? [{ id: "text-group", label: "Scenos tekstai", kind: "text" as const, inspectorTab: "content" as const, start: scene.motion?.startDelay ?? sceneStartDelay(scene.motion), end: scene.motion?.exitAt ?? sceneEnd, entranceDuration: scene.motion?.entrance === "none" ? undefined : scene.motion?.entranceDuration ?? 18, exitDuration: scene.motion?.exit && scene.motion.exit !== "none" ? scene.motion?.exitDuration ?? 18 : undefined, setEntranceDuration: (entranceDuration: number) => updateSceneMotion(selectedSceneId, { entranceDuration }), setExitDuration: (exitDuration: number) => updateSceneMotion(selectedSceneId, { exitDuration }), set: (startDelay: number, exitAt: number) => updateSceneMotion(selectedSceneId, { startDelay, exitAt, exit: scene.motion?.exit ?? "fade" }) }] : []),
    ...lines.map((line, index): TimelineRow => ({ id: `line-${index}`, label: `Tekstas ${index + 1}: ${line.text}`, kind: "text", inspectorTab: "content", start: line.delay ?? automaticLineDelays[index], end: line.exitAt ?? (scene.motion?.exitAt ?? sceneEnd), entranceDuration: line.animation === "none" ? undefined : splitSpan(line.text, line.splitBy ?? "word", line.splitDuration, line.entranceDuration), exitDuration: (line.exit ?? scene.motion?.exit) && (line.exit ?? scene.motion?.exit) !== "none" ? line.exitDuration ?? scene.motion?.exitDuration ?? 18 : undefined, setEntranceDuration: (splitDuration) => updateSceneRichHeadline(selectedSceneId, lines.map((value, at) => at === index ? { ...value, splitDuration, entranceDuration: undefined } : value)), setExitDuration: (exitDuration) => updateSceneRichHeadline(selectedSceneId, lines.map((value, at) => at === index ? { ...value, exitDuration } : value)), set: (delay, exitAt) => updateSceneRichHeadline(selectedSceneId, lines.map((value, at) => at === index ? { ...value, delay, exitAt, exit: value.exit ?? "fade" } : value)), lane: line.lane, setLane: (lane) => updateSceneRichHeadline(selectedSceneId, lines.map((value, at) => at === index ? { ...value, lane } : value)) })),
    ...blocks.map((block, index): TimelineRow => ({ id: `block-${block.id}`, label: `Tekstas: ${block.text}`, kind: "text", inspectorTab: "content", start: block.delay ?? sceneStartDelay(scene.motion), end: block.exitAt ?? sceneEnd, entranceDuration: block.animation === "none" ? undefined : splitSpan(block.text, block.splitBy ?? "word", block.splitDuration, block.entranceDuration), exitDuration: block.exit && block.exit !== "none" ? block.exitDuration ?? 18 : undefined, setEntranceDuration: (splitDuration) => updateSceneBlocks(selectedSceneId, blocks.map((value, at) => at === index ? { ...value, splitDuration, entranceDuration: undefined } : value)), setExitDuration: (exitDuration) => updateSceneBlocks(selectedSceneId, blocks.map((value, at) => at === index ? { ...value, exitDuration } : value)), set: (delay, exitAt) => updateSceneBlocks(selectedSceneId, blocks.map((value, at) => at === index ? { ...value, delay, exitAt } : value)), lane: block.lane, setLane: (lane) => updateSceneBlocks(selectedSceneId, blocks.map((value, at) => at === index ? { ...value, lane } : value)) })),
    ...visuals.flatMap((entry, visualIndex): TimelineRow[] => {
      const preview = visualTimelinePreview(entry.visual, customAssets);
      const visualRow: TimelineRow = { id: `visual-${entry.id}`, label: `Vizualas: ${preview.label}`, kind: "visual", inspectorTab: "visuals", start: entry.delay ?? 0, end: entry.exitAt ?? sceneEnd, preview, entranceDuration: entry.entrance === "none" ? undefined : entry.entranceDuration ?? 18, exitDuration: entry.exit && entry.exit !== "none" ? entry.exitDuration ?? 18 : undefined, setEntranceDuration: (entranceDuration) => setVisual(visualIndex, { entranceDuration }), setExitDuration: (exitDuration) => setVisual(visualIndex, { exitDuration }), set: (delay, exitAt) => setVisual(visualIndex, { delay, exitAt, exit: entry.exit ?? "fade" }), keyframes: sortedKeyframes(entry).map((keyframe) => ({ id: keyframe.id, frame: keyframe.frame, position: keyframePins(keyframe, "position"), scale: keyframePins(keyframe, "scale") })), moveKeyframe: (keyframeId, frame) => updateVisualKeyframe(selectedSceneId, entry.id, keyframeId, { frame }), lane: entry.lane, setLane: (lane) => setVisual(visualIndex, { lane }) };
      if (entry.visual.type !== "checklist") return [visualRow];
      const checklist = entry.visual;
      return [visualRow, ...checklist.items.map((item, itemIndex): TimelineRow => ({ id: `check-${entry.id}-${itemIndex}`, label: `↳ Punktas ${itemIndex + 1}: ${item.label}`, kind: "item", inspectorTab: "visuals", start: item.delay ?? itemIndex * (checklist.stagger ?? 6), end: item.exitAt ?? (entry.exitAt ?? sceneEnd), set: (delay, exitAt) => setChecklistItem(visualIndex, itemIndex, delay, exitAt), lane: item.lane, setLane: (lane) => setChecklistItemLane(visualIndex, itemIndex, lane) }))];
    }),
    ...steps.map((item, index): TimelineRow => ({ id: `step-${index}`, label: `Punktas ${index + 1}: ${item.label}`, kind: "item", inspectorTab: "content", start: item.delay ?? sceneStartDelay(scene.motion) + (index + 1) * (scene.motion?.stagger ?? 6), end: item.exitAt ?? (scene.motion?.exitAt ?? sceneEnd), set: (delay, exitAt) => updateSceneItems(selectedSceneId, steps.map((value, at) => at === index ? { ...value, delay, exitAt } : value)), lane: item.lane, setLane: (lane) => updateSceneItems(selectedSceneId, steps.map((value, at) => at === index ? { ...value, lane } : value)) })),
    ...((): TimelineRow[] => {
      const id = resolveEntranceSfx({ override: scene.motion?.sfx, entrance: scene.motion?.entrance }); if (!id) return [];
      const start = scene.motion?.sfxAt ?? scene.motion?.startDelay ?? 0; const sourceStart = scene.motion?.sfxStartFrom ?? 0; const shape = cueShape(id, sourceStart, scene.motion?.sfxDuration, `${scene.id}-in`); const end = start + shape.length;
      return [{ id: "sound-scene-in", label: "Scenos IN garsas", kind: "sound", inspectorTab: "content", start, end, waveform: shape.waveform, trimMin: Math.max(0, start - sourceStart), trimEndMax: start + shape.available, set: (nextStart, nextEnd) => { const sameLength = nextEnd - nextStart === end - start; if (sameLength) updateSceneMotion(selectedSceneId, { sfxAt: nextStart, sfxDuration: shape.length }); else if (nextEnd === end) updateSceneMotion(selectedSceneId, { sfxAt: nextStart, sfxStartFrom: sourceStart + nextStart - start, sfxDuration: nextEnd - nextStart }); else updateSceneMotion(selectedSceneId, { sfxDuration: nextEnd - nextStart }); } }];
    })(),
    ...((): TimelineRow[] => {
      const id = scene.motion?.exit ? resolveExitSfx({ override: scene.motion?.exitSfx, exit: scene.motion.exit }) : undefined; if (!id) return [];
      const start = scene.motion?.exitSfxAt ?? Math.max(0, (scene.motion?.exitAt ?? sceneEnd) - (scene.motion?.exitDuration ?? 18)); const sourceStart = scene.motion?.exitSfxStartFrom ?? 0; const shape = cueShape(id, sourceStart, scene.motion?.exitSfxDuration, `${scene.id}-out`); const end = start + shape.length;
      return [{ id: "sound-scene-out", label: "Scenos OUT garsas", kind: "sound", inspectorTab: "content", start, end, waveform: shape.waveform, trimMin: Math.max(0, start - sourceStart), trimEndMax: start + shape.available, set: (nextStart, nextEnd) => { const sameLength = nextEnd - nextStart === end - start; if (sameLength) updateSceneMotion(selectedSceneId, { exitSfxAt: nextStart, exitSfxDuration: shape.length }); else if (nextEnd === end) updateSceneMotion(selectedSceneId, { exitSfxAt: nextStart, exitSfxStartFrom: sourceStart + nextStart - start, exitSfxDuration: nextEnd - nextStart }); else updateSceneMotion(selectedSceneId, { exitSfxDuration: nextEnd - nextStart }); } }];
    })(),
    ...visuals.flatMap((entry, index): TimelineRow[] => {
      const soundRows: TimelineRow[] = [];
      if (entry.sfx && entry.sfx !== "none") {
        const start = entry.sfxAt ?? entry.delay ?? 0; const sourceStart = entry.sfxStartFrom ?? 0; const shape = cueShape(entry.sfx, sourceStart, entry.sfxDuration, `${entry.id}-in`); const end = start + shape.length;
        soundRows.push({ id: `sound-visual-${entry.id}-in`, label: `IN garsas: ${entry.visual.type}`, kind: "sound", inspectorTab: "visuals", start, end, waveform: shape.waveform, trimMin: Math.max(0, start - sourceStart), trimEndMax: start + shape.available, set: (nextStart, nextEnd) => { const sameLength = nextEnd - nextStart === end - start; if (sameLength) setVisual(index, { sfxAt: nextStart, sfxDuration: shape.length }); else if (nextEnd === end) setVisual(index, { sfxAt: nextStart, sfxStartFrom: sourceStart + nextStart - start, sfxDuration: nextEnd - nextStart }); else setVisual(index, { sfxDuration: nextEnd - nextStart }); } });
      }
      if (entry.exit && entry.exitSfx && entry.exitSfx !== "none") {
        const start = entry.exitSfxAt ?? Math.max(0, (entry.exitAt ?? sceneEnd) - (entry.exitDuration ?? 18)); const sourceStart = entry.exitSfxStartFrom ?? 0; const shape = cueShape(entry.exitSfx, sourceStart, entry.exitSfxDuration, `${entry.id}-out`); const end = start + shape.length;
        soundRows.push({ id: `sound-visual-${entry.id}-out`, label: `OUT garsas: ${entry.visual.type}`, kind: "sound", inspectorTab: "visuals", start, end, waveform: shape.waveform, trimMin: Math.max(0, start - sourceStart), trimEndMax: start + shape.available, set: (nextStart, nextEnd) => { const sameLength = nextEnd - nextStart === end - start; if (sameLength) setVisual(index, { exitSfxAt: nextStart, exitSfxDuration: shape.length }); else if (nextEnd === end) setVisual(index, { exitSfxAt: nextStart, exitSfxStartFrom: sourceStart + nextStart - start, exitSfxDuration: nextEnd - nextStart }); else setVisual(index, { exitSfxDuration: nextEnd - nextStart }); } });
      }
      return soundRows;
    }),
    /**
     * An audio clip belongs to the scene it STARTS in — and only that one.
     *
     * This used to filter against `max`, the editing HORIZON, which is at least
     * twice the scene's length and usually the whole rest of the video. So a
     * voiceover placed in scene 4 also appeared in scenes 1, 2 and 3, looking
     * like four copies of one clip: it played once, but every scene claimed it,
     * and pasting into one scene appeared to land in another.
     *
     * The horizon exists so an OUT handle can be dragged PAST the cut, which is
     * about where a clip ends. Where it starts is what decides whose clip it is.
     */
    ...(project.audioClips ?? []).filter((clip) => clip.from >= timing.from && clip.from < timing.from + sceneEnd).flatMap((clip): TimelineRow[] => {
      const definition = getSfx(clip.sfxId);
      const info = definition?.src ? audioWaveforms.get(definition.src) : undefined;
      const sourceStart = clip.startFrom ?? 0;
      const available = Math.max(1, (info?.durationInFrames ?? sourceStart + (clip.durationInFrames ?? 30)) - sourceStart);
      const length = Math.min(clip.durationInFrames ?? available, available);
      const start = clip.from - timing.from;
      const end = start + length;
      return [{
        id: `audio-clip-${clip.id}`, label: definition?.label ?? clip.sfxId, kind: "sound", inspectorTab: "content",
        start, end,
        lane: clip.lane ?? 0,
        setLane: (lane) => updateAudioClip(clip.id, { lane }),
        waveform: info ? sliceWaveform(info.peaks, sourceStart, length, info.durationInFrames) : fallbackWaveform(clip.id),
        trimMin: Math.max(0, start - sourceStart),
        trimEndMax: start + available,
        set: (nextStart, nextEnd) => {
          const sameLength = nextEnd - nextStart === end - start;
          if (sameLength) updateAudioClip(clip.id, { from: timing.from + nextStart, durationInFrames: length });
          else if (nextEnd === end) updateAudioClip(clip.id, { from: timing.from + nextStart, startFrom: Math.max(0, sourceStart + nextStart - start), durationInFrames: nextEnd - nextStart });
          else updateAudioClip(clip.id, { durationInFrames: nextEnd - nextStart });
        },
      }];
    }),
  ];
  /** Moving a visual row is a stack reorder, not merely writing the same lane
   * onto two clips. Everything between the old and new position shifts once,
   * and one scene update saves the whole operation atomically. */
  const moveVisualRowToLane = (movedId: string, targetLane: number) => {
    const visualRows = rows.filter((row) => row.kind !== "sound" && row.setLane);
    const moved = visualRows.find((row) => row.id === movedId);
    if (!moved || moved.lane === undefined || moved.lane === targetLane) return;
    const originLane = moved.lane;
    const nextLane = new Map<string, number>();
    for (const row of visualRows) {
      if (row.id === movedId) nextLane.set(row.id, targetLane);
      else if (row.lane === undefined) continue;
      else if (targetLane < originLane && row.lane >= targetLane && row.lane < originLane) nextLane.set(row.id, row.lane + 1);
      else if (targetLane > originLane && row.lane > originLane && row.lane <= targetLane) nextLane.set(row.id, row.lane - 1);
    }
    updateScene(selectedSceneId, {
      content: {
        ...scene.content,
        richHeadline: lines.map((line, index) => ({ ...line, lane: nextLane.get(`line-${index}`) ?? line.lane })),
        blocks: blocks.map((block) => ({ ...block, lane: nextLane.get(`block-${block.id}`) ?? block.lane })),
        items: steps.map((item, index) => ({ ...item, lane: nextLane.get(`step-${index}`) ?? item.lane })),
        visuals: visuals.map((entry) => ({
          ...entry,
          lane: nextLane.get(`visual-${entry.id}`) ?? entry.lane,
          visual: entry.visual.type === "checklist" ? {
            ...entry.visual,
            items: entry.visual.items.map((item, itemIndex) => ({
              ...item,
              lane: nextLane.get(`check-${entry.id}-${itemIndex}`) ?? item.lane,
            })),
          } : entry.visual,
        })),
      },
    });
  };
  for (const row of rows) {
    if (row.kind !== "sound" && row.setLane) row.setLane = (lane) => moveVisualRowToLane(row.id, lane);
  }
  /** Frames worth landing on: the scene's own ends, the playhead, and every
   * OTHER clip's start and end — the last is what "align these two" means. */
  const snapTargetsFor = (rowId: string): number[] => {
    const targets = [0, max, localFrame];
    for (const other of rows) {
      if (other.id === rowId) continue;
      targets.push(Math.round(other.start), Math.round(other.end));
    }
    return targets;
  };

  /**
   * Lanes: where each clip sits vertically.
   *
   * Every object owns an explicit `lane`, and NOTHING re-derives it. That is
   * the whole design, and the previous version got it wrong: lanes were packed
   * from scratch on every render, so moving one clip re-packed all the others —
   * and dragging a clip sideways changed its own start time, which changed the
   * packing, which threw the clip you were holding into a different row
   * mid-drag. Objects jumping around on their own is what an auto-layout looks
   * like from the outside.
   *
   * Packing survives as the FIRST-TIME assignment only (`materializeLanes`
   * below): a scene opens compact, and from then on a clip moves when you move
   * it and never otherwise.
   *
   * Lane numbering is per KIND, so the timeline still reads top to bottom as
   * text, then visuals, then sound, and a vertical drag moves a clip between
   * lanes of its own kind. Trailing empty lanes are dropped; an empty lane
   * BETWEEN two others is kept, because closing the gap would shift every clip
   * below it — the exact jump this design exists to prevent.
   */
  const lanes: { kind: TimelineRow["kind"]; rows: TimelineRow[] }[] = [];
  for (const ofKind of [rows.filter((row) => row.kind !== "sound"), rows.filter((row) => row.kind === "sound")]) {
    if (ofKind.length === 0) continue;

    const buckets: TimelineRow[][] = [];
    for (const row of ofKind) {
      const index = row.lane ?? autoLane(row, ofKind);
      while (buckets.length <= index) buckets.push([]);
      buckets[index].push(row);
    }
    while (buckets.length && buckets[buckets.length - 1].length === 0) buckets.pop();
    for (const bucket of buckets) {
      const first = bucket[0];
      if (first) lanes.push({ kind: first.kind, rows: bucket });
    }
  }

  /**
   * Writes the packed starting layout into the scene, once.
   *
   * Until every object owns a lane the layout is still being derived, which is
   * what makes clips move on their own. One update for the whole scene (one
   * undo entry) settles it; after that `row.lane` is always a number and the
   * timeline is pure presentation.
   */
  React.useEffect(() => {
    const visualRows = rows.filter((row) => row.kind !== "sound" && row.setLane);
    const soundRows = rows.filter((row) => row.kind === "sound" && row.setLane);
    const visualNeedsLayout = visualRows.some((row) => row.lane === undefined)
      || visualRows.some((row, index) => visualRows.slice(index + 1).some((other) => row.lane === other.lane && overlaps(row, other)));
    const soundNeedsLayout = soundRows.some((row) => row.lane === undefined);
    if (!visualNeedsLayout && !soundNeedsLayout) return;

    const assigned = new Map<string, number>();
    for (const [ofKind, rebuild] of [[visualRows, visualNeedsLayout], [soundRows, false]] as const) {
      const buckets: TimelineRow[][] = [];
      // Pinned rows hold their slot; the rest fill the first lane with room.
      for (const row of ofKind.filter((row) => !rebuild && row.lane !== undefined)) {
        while (buckets.length <= row.lane!) buckets.push([]);
        buckets[row.lane!].push(row);
      }
      for (const row of ofKind.filter((row) => rebuild || row.lane === undefined)) {
        let index = buckets.findIndex((bucket) => bucket.every((other) => !overlaps(row, other)));
        if (index === -1) {
          index = buckets.length;
          buckets.push([]);
        }
        buckets[index].push(row);
        assigned.set(row.id, index);
      }
    }

    // ONE write for the whole scene. Calling each row's `setLane` in turn would
    // be N store updates and N undo entries — and worse, each setter closes
    // over the array as it was at render, so every call after the first would
    // overwrite the one before it and only the last lane would survive.
    updateScene(selectedSceneId, {
      content: {
        ...scene.content,
        richHeadline: lines.length
          ? lines.map((line, index) => ({ ...line, lane: assigned.get(`line-${index}`) ?? line.lane }))
          : scene.content.richHeadline,
        blocks: blocks.length
          ? blocks.map((block) => ({ ...block, lane: assigned.get(`block-${block.id}`) ?? block.lane }))
          : scene.content.blocks,
        items: steps.length
          ? steps.map((item, index) => ({ ...item, lane: assigned.get(`step-${index}`) ?? item.lane }))
          : scene.content.items,
        visuals: visuals.length
          ? visuals.map((entry) => ({
              ...entry,
              lane: assigned.get(`visual-${entry.id}`) ?? entry.lane,
              visual:
                entry.visual.type === "checklist"
                  ? {
                      ...entry.visual,
                      items: entry.visual.items.map((item, itemIndex) => ({
                        ...item,
                        lane: assigned.get(`check-${entry.id}-${itemIndex}`) ?? item.lane,
                      })),
                    }
                  : entry.visual,
            }))
          : scene.content.visuals,
      },
    });
    // `rows` is rebuilt every render; keying on the scene is what makes this
    // run once per scene rather than on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSceneId, rows.length]);

  /** A lane's position among the lanes of ITS OWN kind — what a vertical drag
   * counts in, since a text clip can only move between text lanes. */
  const laneIndexOf = (lane: (typeof lanes)[number]) =>
    lanes.filter((candidate) => (candidate.kind === "sound") === (lane.kind === "sound")).indexOf(lane);

  const trackWidth = Math.max(640, max * pixelsPerFrame);
  const tickEveryFrames = pixelsPerFrame >= 8 ? project.fps / 2 : project.fps;
  /**
   * Everything selected moves together.
   *
   * Called once when a drag begins so the origins are the poses the clips held
   * BEFORE the gesture — reading them per pointermove would compound each
   * frame's delta onto the previous one and send the group sliding away.
   */
  const beginGroupDragFor = (rowId: string) => {
    const draggedId = qualifySelection(selectedSceneId, rowId);
    if (selectedObjectIds.length < 2 || !selectedObjectIds.includes(draggedId)) return null;
    return () => {
      const origins = rows
        .filter((row) => selectedObjectIds.includes(qualifySelection(selectedSceneId, row.id)))
        .map((row) => ({ id: qualifySelection(selectedSceneId, row.id), start: Math.round(row.start), end: Math.round(row.end) }));
      return (delta: number) => {
        const positions = new Map<string, { start: number; end: number }>();
        for (const origin of origins) {
          const length = origin.end - origin.start;
          const start = clamp(origin.start + delta, 0, max - length);
          positions.set(origin.id, { start, end: start + length });
        }
        applyTimelineObjectPositions(positions);
      };
    };
  };

  /**
   * Rubber-band selection, the way a file manager does it: press on empty track
   * and drag a box over the clips you want. Ctrl/Shift adds to what is already
   * selected instead of replacing it.
   *
   * Hit-testing reads the clips' real `getBoundingClientRect()` rather than
   * recomputing their geometry from frames and lanes. The layout already knows
   * where every clip is; deriving it a second time is a second source of truth
   * that would drift the moment lane packing or zoom changed.
   */
  const [marquee, setMarquee] = React.useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const beginMarquee = (event: React.PointerEvent<HTMLElement>) => {
    const additive = event.ctrlKey || event.metaKey || event.shiftKey;
    const base = additive ? [...selectedObjectIds] : [];
    const originX = event.clientX;
    const originY = event.clientY;
    const seekTarget = event.currentTarget;
    let dragging = false;

    const move = (pointer: PointerEvent) => {
      // A few pixels of slack, so a plain click on empty track still seeks
      // instead of being swallowed by a zero-size selection box.
      if (!dragging && Math.abs(pointer.clientX - originX) + Math.abs(pointer.clientY - originY) < 4) return;
      dragging = true;
      const box = {
        left: Math.min(originX, pointer.clientX),
        top: Math.min(originY, pointer.clientY),
        width: Math.abs(pointer.clientX - originX),
        height: Math.abs(pointer.clientY - originY),
      };
      setMarquee(box);
      const hits: string[] = [];
      for (const element of viewportRef.current?.querySelectorAll("[data-timeline-object]") ?? []) {
        const rect = element.getBoundingClientRect();
        const overlaps =
          rect.left < box.left + box.width &&
          box.left < rect.right &&
          rect.top < box.top + box.height &&
          box.top < rect.bottom;
        const id = element.getAttribute("data-timeline-object");
        if (overlaps && id) hits.push(qualifySelection(selectedSceneId, id));
      }
      selectObjects([...new Set([...base, ...hits])]);
    };

    const finish = (pointer: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setMarquee(null);
      if (dragging) return;
      // A click, not a drag: the old behaviour — move the playhead, and drop
      // the selection, which is what clicking empty space means everywhere.
      const rect = seekTarget.getBoundingClientRect();
      onSeek?.(timing.from + clamp(Math.round((pointer.clientX - rect.left) / pixelsPerFrame), 0, max - 1));
      if (!additive) selectObject(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  };

  /**
   * Dragging the scene-end line sets the scene's length by hand.
   *
   * By default a scene has NO `durationSeconds` and `resolveSceneDuration`
   * paces it from the voiceover and the on-screen text — which is the right
   * default and stays the right default. But the dashed line was the one thing
   * on the timeline you could see and not touch, and "make this frame hold two
   * seconds longer" had to be typed into the Motion tab in seconds while
   * looking at a ruler in frames.
   *
   * Dragging writes an explicit `durationSeconds`, so the scene stops being
   * auto-paced — double-click clears it and hands the scene back to the pacer.
   */
  /**
   * Keeps every object's on-screen length when the cut moves EARLIER.
   *
   * An object with no `exitAt` means "until the scene ends", which is the right
   * default and is what makes a lengthened scene carry its content with it. But
   * it also meant a scene could never be shortened without shortening
   * everything in it — drag the cut left and the visual you wanted to run into
   * the next scene shrank with it, which is the opposite of the reason you were
   * shortening the scene.
   *
   * So the implicit end is MATERIALISED at the length it had a moment ago:
   * every object that was riding the cut keeps exactly the length it had, and
   * now genuinely overflows past it. Only on shortening — lengthening leaves
   * implicit ends implicit, so "until the scene ends" keeps meaning that.
   *
   * One write, inside the drag's history transaction, so Ctrl+Z undoes the cut
   * and the pinning together.
   */
  const pinImplicitEnds = (previousEnd: number) => {
    const content = scene.content;
    const pin = <T extends { exitAt?: number }>(value: T): T =>
      value.exitAt === undefined ? { ...value, exitAt: previousEnd } : value;

    updateScene(selectedSceneId, {
      content: {
        ...content,
        richHeadline: content.richHeadline?.map(pin),
        blocks: content.blocks?.map(pin),
        items: content.items?.map(pin),
        visuals: content.visuals?.map((entry) => {
          const pinned = pin(entry);
          // A checklist's rows carry their own ends and ride the layer's.
          if (pinned.visual.type === "checklist") {
            return {
              ...pinned,
              visual: { ...pinned.visual, items: pinned.visual.items.map(pin) },
            };
          }
          return pinned;
        }),
      },
      motion: content.richHeadline?.length || scene.motion?.exitAt !== undefined
        ? scene.motion
        : { ...scene.motion, exitAt: previousEnd },
    });
  };

  const beginSceneEndDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    beginHistoryTransaction();
    const originX = event.clientX;
    const originEnd = sceneEnd;
    // Everything a clip snaps to, so the cut can be lined up with the end of
    // the layer it is waiting for.
    const targets = [...new Set([...rows.flatMap((row) => [Math.round(row.start), Math.round(row.end)]), localFrame])];
    let latest = originEnd;
    const move = (pointer: PointerEvent) => {
      const raw = originEnd + (pointer.clientX - originX) / pixelsPerFrame;
      latest = clamp(snapFrame(raw, targets, pixelsPerFrame), MIN_SCENE_FRAMES, max);
      updateScene(selectedSceneId, { durationSeconds: latest / project.fps });
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      // Moving the cut must not retime the content. See `pinImplicitEnds`.
      if (latest < originEnd) pinImplicitEnds(originEnd);
      endHistoryTransaction();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  };

  /** Back to automatic pacing — `durationSeconds` unset is what makes
   * `resolveSceneDuration` own the length again. */
  const clearSceneDuration = () => updateScene(selectedSceneId, { durationSeconds: undefined });

  /**
   * Dropping a sound from the Voice or Sound panel lands it where the pointer
   * is, not at the playhead: you aimed at a spot, so that spot is the answer.
   * The frame is read from the track's own rect, the same conversion the
   * playhead scrub uses.
   */
  const dropAudio = (event: React.DragEvent<HTMLElement>) => {
    const payload = readAudioDragPayload(event);
    if (!payload) return;
    event.preventDefault();
    setDropFrame(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const local = clamp(Math.round((event.clientX - rect.left) / pixelsPerFrame), 0, max);
    beginHistoryTransaction();
    addAudioClip(payload.sfxId, timing.from + local);
    const clips = useProjectStore.getState().project.audioClips ?? [];
    const inserted = clips[clips.length - 1];
    if (inserted) {
      if (payload.cut) updateAudioClip(inserted.id, payload.cut);
      selectObject(`audio-clip-${inserted.id}`);
    }
    endHistoryTransaction();
  };

  /** Where the drop would land, so the guide line can be drawn there. A drop
   * target you cannot aim at is a drop target you land next to. */
  const [dropFrame, setDropFrame] = React.useState<number | null>(null);

  const dragOverAudio = (event: React.DragEvent<HTMLElement>) => {
    if (!isAudioDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const rect = event.currentTarget.getBoundingClientRect();
    setDropFrame(clamp(Math.round((event.clientX - rect.left) / pixelsPerFrame), 0, max));
  };

  const seekAt = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onSeek?.(timing.from + clamp(Math.round((event.clientX - rect.left) / pixelsPerFrame), 0, max - 1));
  };
  const beginPlayheadDrag = (event: React.PointerEvent) => {
    event.preventDefault();
    const seekClientX = (clientX: number) => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect) return;
      onSeek?.(timing.from + clamp(Math.round((clientX - rect.left) / pixelsPerFrame), 0, max - 1));
    };
    seekClientX(event.clientX);
    const move = (pointer: PointerEvent) => seekClientX(pointer.clientX);
    const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  };
  const resetToAutomatic = () => {
    beginHistoryTransaction();
    updateSceneMotion(selectedSceneId, { startDelay: undefined, exitAt: undefined, sfxAt: undefined, exitSfxAt: undefined, sfxStartFrom: undefined, sfxDuration: undefined, exitSfxStartFrom: undefined, exitSfxDuration: undefined });
    updateSceneRichHeadline(selectedSceneId, lines.map((line) => ({ ...line, delay: undefined, exitAt: undefined })));
    updateSceneBlocks(selectedSceneId, blocks.map((block) => ({ ...block, delay: undefined, exitAt: undefined })));
    updateSceneItems(selectedSceneId, steps.map((item) => ({ ...item, delay: undefined, exitAt: undefined })));
    updateSceneVisuals(selectedSceneId, visuals.map((entry) => ({
      ...entry,
      delay: undefined,
      exitAt: undefined,
      sfxAt: undefined,
      exitSfxAt: undefined,
      sfxStartFrom: undefined,
      sfxDuration: undefined,
      exitSfxStartFrom: undefined,
      exitSfxDuration: undefined,
      visual: entry.visual.type === "checklist" ? { ...entry.visual, items: entry.visual.items.map((item) => ({ ...item, delay: undefined, exitAt: undefined })) } : entry.visual,
    })));
    endHistoryTransaction();
  };
  const fitTimeline = () => {
    const available = Math.max(320, (viewportRef.current?.clientWidth ?? 900) - LABEL_WIDTH - 24);
    setPixelsPerFrame(clamp(available / Math.max(1, max), 0.5, 20));
  };
  const sceneIndex = timings.findIndex((entry) => entry.scene.id === selectedSceneId);
  const copySelected = () => {
    if (copyTimelineObjects(selectedObjectIds)) setClipboardReady(true);
  };
  const pasteAtPlayhead = () => {
    const pasted = pasteTimelineObjects(localFrame);
    if (pasted.length) selectObjects(pasted);
  };
  const duplicateSelected = () => {
    const pasted = duplicateTimelineObjects(selectedObjectIds, localFrame);
    if (pasted.length) selectObjects(pasted);
  };
  const selectedAudioId = selectedObjectId?.startsWith("audio-clip-") ? selectedObjectId.slice(11) : null;
  const selectedAudio = selectedAudioId ? (project.audioClips ?? []).find((clip) => clip.id === selectedAudioId) : undefined;
  const selectedAudioRow = selectedAudio ? rows.find((row) => row.id === `audio-clip-${selectedAudio.id}`) : undefined;
  const selectedSoundRow = rows.find((row) => row.kind === "sound" && qualifySelection(selectedSceneId, row.id) === selectedObjectId && row.waveform);
  const playheadInsideSound = Boolean(selectedSoundRow && localFrame > selectedSoundRow.start && localFrame < selectedSoundRow.end);
  const splitSelectedAudio = () => {
    if (!selectedAudio || !selectedAudioRow) return;
    const id = splitAudioClip(selectedAudio.id, currentFrame, selectedAudioRow.end - selectedAudioRow.start);
    if (id) selectObject(`audio-clip-${id}`);
  };
  const trimSelectedAudioLeft = () => {
    if (!selectedSoundRow || !playheadInsideSound) return;
    selectedSoundRow.set(localFrame, selectedSoundRow.end);
  };
  const trimSelectedAudioRight = () => {
    if (!selectedSoundRow || !playheadInsideSound) return;
    selectedSoundRow.set(selectedSoundRow.start, localFrame);
  };
  return (
    <div style={{ flexShrink: 0, position: "relative", borderTop: `1px solid ${editorColors.border}`, background: "#151515" }}>
      {/* Grab the top edge to make the timeline taller. A scene with a lot of
          layers needs more than the fixed 250px it used to get, and how much is
          a per-session judgement rather than something to hardcode. */}
      {expanded ? (
        <div
          onPointerDown={beginPanelResize}
          title="Tempk, kad pakeistum timeline aukštį"
          style={{ position: "absolute", top: -3, left: 0, right: 0, height: 7, cursor: "ns-resize", zIndex: 20 }}
        />
      ) : null}
      <div style={{ height: 38, padding: "0 12px", display: "flex", alignItems: "center", gap: 12, overflowX: "auto", whiteSpace: "nowrap", borderBottom: expanded ? `1px solid ${editorColors.border}` : "none" }}>
        <button onClick={() => setExpanded((value) => !value)} style={toolButtonStyle}>{expanded ? "▾" : "▸"} Timeline</button>
        <button style={{ ...toolButtonStyle, color: editorColors.accent, borderColor: editorColors.accent }}>Scene</button>
        <button onClick={onFullMode} style={toolButtonStyle}>Full video</button>
        <button disabled={sceneIndex <= 0} onClick={() => selectScene(timings[sceneIndex - 1]?.scene.id ?? null)} style={toolButtonStyle} title="Ankstesnė scena">‹</button>
        <select value={selectedSceneId} onChange={(event) => selectScene(event.target.value)} style={{ ...toolButtonStyle, maxWidth: 180 }} title="Pasirinkti sceną">
          {timings.map((entry, index) => <option key={entry.scene.id} value={entry.scene.id}>{index + 1}. {entry.scene.type}</option>)}
        </select>
        <button disabled={sceneIndex >= timings.length - 1} onClick={() => selectScene(timings[sceneIndex + 1]?.scene.id ?? null)} style={toolButtonStyle} title="Kita scena">›</button>
        <strong style={{ fontSize: 11, color: editorColors.text }}>{scene.type}</strong>
        <span style={{ fontSize: 10, color: editorColors.textDim }}>{(sceneEnd / project.fps).toFixed(1)} s scena</span>
        <button onClick={resetToAutomatic} style={toolButtonStyle} title="Pašalinti rankinius IN/OUT laikus ir vėl naudoti automatinius stagger laikus">↺ Reset to Auto</button>
        <button disabled={!selectedObjectIds.length} onClick={copySelected} style={toolButtonStyle} title="Ctrl+C · Ctrl+click žymi kelis">Copy{selectedObjectIds.length > 1 ? ` (${selectedObjectIds.length})` : ""}</button>
        <button disabled={!clipboardReady} onClick={pasteAtPlayhead} style={toolButtonStyle} title="Ctrl+V · įkelti ties balta linija">Paste</button>
        <button disabled={!selectedObjectIds.length} onClick={duplicateSelected} style={toolButtonStyle} title="Ctrl+D">Duplicate{selectedObjectIds.length > 1 ? ` (${selectedObjectIds.length})` : ""}</button>
        <span style={{ width: 1, height: 20, background: editorColors.border }} />
        <button disabled={!playheadInsideSound} onClick={trimSelectedAudioLeft} style={toolButtonStyle} title="Nukirpti klipo kairę iki baltos linijos">|←</button>
        <button disabled={!selectedAudio || !playheadInsideSound} onClick={splitSelectedAudio} style={toolButtonStyle} title="Padalinti savarankišką audio klipą ties balta linija">✂</button>
        <button disabled={!playheadInsideSound} onClick={trimSelectedAudioRight} style={toolButtonStyle} title="Nukirpti klipo dešinę iki baltos linijos">→|</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: editorColors.textDim }}>−</span>
        <input type="range" min={0.5} max={20} step={0.25} value={pixelsPerFrame} onChange={(event) => setPixelsPerFrame(Number(event.target.value))} style={{ width: 110, accentColor: editorColors.accent }} title="Timeline mastelis" />
        <span style={{ fontSize: 10, color: editorColors.textDim }}>+</span>
        <button onClick={fitTimeline} style={toolButtonStyle} title="Sutalpinti visą sceną">Fit</button>
        <span title={`${localFrame} kadras`} style={{ minWidth: 84, textAlign: "right", fontSize: 10, color: editorColors.accent, fontFamily: "ui-monospace, monospace" }}>{formatTimecode(localFrame, project.fps)}</span>
      </div>
      {expanded ? <div ref={viewportRef} style={{ height: panelHeight, overflow: "auto" }}>
        <div style={{ position: "relative", width: LABEL_WIDTH + trackWidth, minWidth: "100%" }}>
          <div ref={rulerRef} onPointerDown={beginPlayheadDrag} style={{ position: "sticky", top: 0, zIndex: 5, marginLeft: LABEL_WIDTH, width: trackWidth, height: 26, background: "#181818", cursor: "ew-resize", borderBottom: `1px solid ${editorColors.border}` }}>
            {Array.from({ length: Math.floor(max / tickEveryFrames) + 1 }, (_, index) => { const frame = Math.round(index * tickEveryFrames); return <div key={frame} style={{ position: "absolute", left: frame * pixelsPerFrame, top: 0, bottom: 0, borderLeft: "1px solid #444" }}><span style={{ position: "absolute", left: 4, top: 4, fontSize: 9, color: editorColors.textDim }}>{(frame / project.fps).toFixed(frame % project.fps ? 2 : 0)}s</span></div>; })}
          </div>
          <div onPointerDown={beginPlayheadDrag} style={{ position: "absolute", zIndex: 8, left: LABEL_WIDTH + localFrame * pixelsPerFrame, top: 20, bottom: 0, width: 3, marginLeft: -1, background: "#fff", cursor: "ew-resize", touchAction: "none" }}><div style={{ position: "absolute", left: -4, top: 0, width: 11, height: 11, background: "#fff", transform: "rotate(45deg)" }} /></div>
          {/* The scene-end line, as a grab target. The dashed marks inside each
              lane stay purely decorative (`pointerEvents: none`); one handle
              spanning every lane is what makes it draggable anywhere down the
              timeline instead of only in the lane the pointer happens to be in. */}
          <div
            onPointerDown={beginSceneEndDrag}
            onDoubleClick={clearSceneDuration}
            title={
              scene.durationSeconds === undefined
                ? `Scenos pabaiga ${(sceneEnd / project.fps).toFixed(2)}s — automatinė pagal VO ir tekstą. Tempk, kad nustatytum ranka.`
                : `Scenos pabaiga ${(sceneEnd / project.fps).toFixed(2)}s — nustatyta ranka. Dvigubas paspaudimas grąžina automatinę.`
            }
            style={{
              position: "absolute",
              // ABOVE the playhead and every clip. The scene end almost always
              // sits right where the last clip ends and the playhead is parked,
              // and a target you have to hunt for between two other grabbable
              // things is one you give up on.
              zIndex: 9,
              // Wider than it looks: the dashed line is 2px, and a 2px grab
              // target is a target you miss.
              left: LABEL_WIDTH + sceneEnd * pixelsPerFrame - 9,
              // Starts INSIDE the ruler, where nothing else competes for the
              // pointer, so there is always a clear place to grab it.
              top: 8,
              bottom: 0,
              width: 19,
              cursor: "ew-resize",
              touchAction: "none",
            }}
          >
            <span style={{ position: "absolute", left: 8, top: 18, bottom: 0, borderLeft: `2px dashed ${editorColors.accent}`, opacity: 0.9 }} />
            <span
              style={{
                position: "absolute",
                left: 3,
                top: 2,
                width: 13,
                height: 13,
                background: editorColors.accent,
                borderRadius: 2,
                // Filled when the length is the author's, hollow when the pacer
                // still owns it — the same distinction the tooltip spells out.
                opacity: scene.durationSeconds === undefined ? 0.45 : 1,
              }}
            />
          </div>
          {dropFrame !== null ? (
            <div style={{ position: "absolute", zIndex: 9, left: LABEL_WIDTH + dropFrame * pixelsPerFrame, top: 26, bottom: 0, width: 2, background: "#38bdf8", pointerEvents: "none" }} />
          ) : null}
          {lanes.map((lane, laneIndex) => <div key={`${lane.kind}-${laneIndex}`} style={{ height: ROW_HEIGHT, display: "flex", borderBottom: "1px solid #252525" }}>
            <div onClick={() => openInspector(lane.rows[0])} style={{ position: "sticky", left: 0, zIndex: 4, width: LABEL_WIDTH, flexShrink: 0, boxSizing: "border-box", padding: "9px 10px", background: "#191919", borderRight: `1px solid ${editorColors.border}`, color: editorColors.text, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }} title={lane.rows.map((row) => row.label).join(" · ")}><span style={{ display: "inline-block", width: 7, height: 7, marginRight: 7, borderRadius: 2, background: colorsByKind[lane.kind] }} />{laneLabel(lane.kind)}{lane.rows.length > 1 ? ` (${lane.rows.length})` : ""}</div>
            <div onPointerDown={(event) => { if (event.target === event.currentTarget) beginMarquee(event); }} onDragOver={dragOverAudio} onDragLeave={() => setDropFrame(null)} onDrop={dropAudio} style={{ position: "relative", width: trackWidth, flexShrink: 0, backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${project.fps * pixelsPerFrame - 1}px, #292929 ${project.fps * pixelsPerFrame}px)` }}>
              <span title="Scenos riba · objektai gali tęstis toliau" style={{ position: "absolute", zIndex: 2, left: sceneEnd * pixelsPerFrame, top: 0, bottom: 0, borderLeft: `2px dashed ${editorColors.accent}`, pointerEvents: "none", opacity: 0.75 }} />
              {lane.rows.map((row) => <React.Fragment key={row.id}>
                <Clip row={row} max={max} pixelsPerFrame={pixelsPerFrame} snapTargets={snapTargetsFor(row.id)} fps={project.fps} selected={selectedObjectIds.includes(qualifySelection(selectedSceneId, row.id))} laneIndex={laneIndexOf(lane)} laneCount={lanes.filter((candidate) => (candidate.kind === "sound") === (lane.kind === "sound")).length} onContextMenu={(event) => { event.preventDefault(); openInspector(row); setContextTarget({ selectionId: qualifySelection(selectedSceneId, row.id), x: event.clientX, y: event.clientY }); }} onDragStart={beginHistoryTransaction} onDragEnd={endHistoryTransaction} onSelect={(additive) => openInspector(row, additive)} beginGroupDrag={beginGroupDragFor(row.id)} />
                <KeyframeMarkers row={row} max={max} pixelsPerFrame={pixelsPerFrame} onDragStart={beginHistoryTransaction} onDragEnd={endHistoryTransaction} onSelect={() => openInspector(row)} />
              </React.Fragment>)}
            </div>
          </div>)}
        </div>
      </div> : null}

      {marquee ? (
        <div
          style={{
            position: "fixed",
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
            border: `1px solid ${editorColors.accent}`,
            background: `${editorColors.accent}22`,
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      ) : null}

      {contextTarget ? (
        <TimelineContextMenu
          target={contextTarget}
          playheadLocalFrame={localFrame}
          onClose={() => setContextTarget(null)}
          onSelect={(id) => selectObject(id)}
        />
      ) : null}
    </div>
  );
};

const handleStyle: React.CSSProperties = { position: "absolute", zIndex: 2, top: 0, bottom: 0, width: 7, background: "rgba(255,255,255,0.8)", cursor: "ew-resize" };
const previewMediaStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.34, pointerEvents: "none" };
const toolButtonStyle: React.CSSProperties = { padding: "5px 9px", borderRadius: 5, border: `1px solid ${editorColors.border}`, background: editorColors.panelElevated, color: editorColors.text, fontSize: 11, cursor: "pointer" };
