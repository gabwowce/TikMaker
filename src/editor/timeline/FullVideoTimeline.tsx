import React from "react";
import { computeSceneTimings, projectDurationInFrames } from "../../utils/duration";
import { sceneStartDelay, staggerDelay } from "../../video/scenes/EnterOnCue";
import { splitSpan } from "../../video/typography/splitAnimate";
import { getSfx } from "../../registries/sfxRegistry";
import { resolveEntranceSfx, resolveExitSfx } from "../../video/motion/sfxDefaults";
import { hoistedOwnership, resolveHoistedLinkGroups } from "../../utils/visualLinks";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import { useCustomAssetsStore } from "../state/customAssetsStore";
import { TimelineContextMenu, type ContextTarget } from "./TimelineContextMenu";
import { useTimelineWheelZoom } from "./useTimelineWheelZoom";
import { visualTimelinePreview, type TimelinePreview } from "./visualTimelinePreview";
import { clipboardHas, copyTimelineObject, duplicateTimelineObject, pasteTimelineObject } from "./objectClipboard";
import { fallbackWaveform, sliceWaveform, useAudioWaveforms } from "./useAudioWaveforms";

type Kind = "scene" | "text" | "visual" | "item" | "sound";
type Row = {
  id: string; sceneId?: string; objectId?: string; label: string; kind: Kind; color: string;
  start: number; end: number; min?: number; max?: number; point?: boolean; movable?: boolean;
  trimStart?: boolean; trimMin?: number; trimEndMax?: number; lane?: number; entranceDuration?: number; exitDuration?: number;
  setEntranceDuration?: (frames: number) => void; setExitDuration?: (frames: number) => void;
  preview?: TimelinePreview;
  waveform?: number[];
  set?: (start: number, end: number) => void; setLane?: (lane: number) => void;
};
type Track = { kind: Kind; lane: number; rows: Row[] };

const LABEL = 170;
const ROW_HEIGHT = 38;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 14;
const KIND_ORDER: Kind[] = ["scene", "text", "visual", "item", "sound"];
const KIND_LABEL: Record<Kind, string> = { scene: "Scenų gairės", text: "Tekstas", visual: "Vizualai", item: "Punktai", sound: "Garsai" };
const KIND_COLOR: Record<Kind, string> = { scene: "#64748b", text: "#8b5cf6", visual: "#ff7024", item: "#14b8a6", sound: "#3b82f6" };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const overlaps = (a: Row, b: Row) => a.start < b.end + 2 && b.start < a.end + 2;

function buildTracks(rows: Row[]): Track[] {
  const tracks: Track[] = [];
  for (const kind of KIND_ORDER) {
    const matching = rows.filter((row) => row.kind === kind);
    if (!matching.length) continue;
    const lanes: Row[][] = [];
    for (const row of matching) {
      let lane = row.lane;
      if (lane === undefined) {
        lane = lanes.findIndex((entries) => entries.every((entry) => !overlaps(row, entry)));
        if (lane < 0) lane = lanes.length;
      }
      while (lanes.length <= lane) lanes.push([]);
      lanes[lane].push(row);
    }
    lanes.forEach((entries, lane) => tracks.push({ kind, lane, rows: entries }));
    if (kind !== "scene" && matching.some((row) => row.setLane)) tracks.push({ kind, lane: lanes.length, rows: [] });
  }
  return tracks;
}

const AnimationWindow: React.FC<{ side: "in" | "out"; frames: number; clipFrames: number; ppf: number; onChange?: (frames: number) => void; onDragStart: () => void; onDragEnd: () => void }> = ({ side, frames, clipFrames, ppf, onChange, onDragStart, onDragEnd }) => {
  const width = Math.min(Math.max(0, frames), clipFrames) * ppf;
  if (width < 2) return null;
  const begin = (event: React.PointerEvent) => {
    if (!onChange) return;
    event.preventDefault(); event.stopPropagation(); onDragStart();
    const originX = event.clientX; const originFrames = frames;
    const move = (pointer: PointerEvent) => onChange(clamp(Math.round(originFrames + (pointer.clientX - originX) / ppf * (side === "in" ? 1 : -1)), 1, clipFrames));
    const finish = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish); onDragEnd(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish, { once: true }); window.addEventListener("pointercancel", finish, { once: true });
  };
  return <span title={`${side.toUpperCase()} · ${frames} kadrai`} style={{ position: "absolute", zIndex: 3, top: 0, bottom: 0, width, pointerEvents: "none", background: "rgba(255,255,255,.07)", ...(side === "in" ? { left: 0, borderRight: "2px solid white" } : { right: 0, borderLeft: "2px solid white" }) }}><span onPointerDown={begin} style={{ position: "absolute", top: 0, bottom: 0, width: 10, ...(side === "in" ? { right: -5 } : { left: -5 }), pointerEvents: onChange ? "auto" : "none", cursor: "ew-resize" }} /></span>;
};

const GlobalClip: React.FC<{ row: Row; total: number; fps: number; ppf: number; laneIndex: number; laneCount: number; selected: boolean; snapTargets: number[]; onOpen: () => void; onContextMenu: (event: React.MouseEvent) => void }> = ({ row, total, fps, ppf, laneIndex, laneCount, selected, snapTargets, onOpen, onContextMenu }) => {
  const beginHistoryTransaction = useProjectStore((state) => state.beginHistoryTransaction);
  const endHistoryTransaction = useProjectStore((state) => state.endHistoryTransaction);
  const [laneShift, setLaneShift] = React.useState(0);
  const min = row.min ?? 0;
  const max = row.max ?? total;
  const start = clamp(Math.round(row.start), min, Math.max(min, max - 1));
  const end = clamp(Math.round(row.end), start + 1, max);
  const snap = (value: number) => {
    const tolerance = 7 / ppf;
    let result = value;
    let distance = tolerance;
    for (const target of snapTargets) {
      const next = Math.abs(target - value);
      if (next <= distance) { result = target; distance = next; }
    }
    return Math.round(result);
  };
  const drag = (event: React.PointerEvent, edge: "move" | "start" | "end") => {
    event.preventDefault(); event.stopPropagation(); onOpen();
    if (!row.set || (edge === "move" && row.movable === false) || (edge === "start" && row.trimStart === false)) return;
    beginHistoryTransaction();
    const originX = event.clientX; const originY = event.clientY; const length = end - start;
    const move = (pointer: PointerEvent) => {
      if (edge === "move" && row.setLane) {
        const shift = Math.round((pointer.clientY - originY) / ROW_HEIGHT);
        setLaneShift(clamp(laneIndex + shift, 0, Math.max(0, laneCount - 1)) - laneIndex);
      }
      const delta = (pointer.clientX - originX) / ppf;
      if (edge === "start") row.set?.(clamp(snap(start + delta), row.trimMin ?? min, end - 1), end);
      else if (edge === "end") row.set?.(start, clamp(snap(end + delta), start + 1, row.trimEndMax ?? max));
      else { const next = clamp(snap(start + delta), min, max - length); row.set?.(next, next + length); }
    };
    const finish = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      setLaneShift((shift) => { if (shift) row.setLane?.(laneIndex + shift); return 0; });
      endHistoryTransaction();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish, { once: true }); window.addEventListener("pointercancel", finish, { once: true });
  };
  return <div onPointerDown={(event) => drag(event, "move")} onContextMenu={onContextMenu} title={`${row.label} · ${(start / fps).toFixed(2)}–${(end / fps).toFixed(2)} s`} style={{ position: "absolute", left: start * ppf, top: 4 + laneShift * ROW_HEIGHT, width: Math.max(row.point ? 20 : 12, (end - start) * ppf), height: ROW_HEIGHT - 8, borderRadius: 4, border: selected ? `2px solid ${editorColors.accent}` : `1px solid ${row.color}`, background: row.kind === "scene" ? `repeating-linear-gradient(90deg, ${row.color}66 0 20px, ${row.color}88 20px 40px)` : `${row.color}55`, boxShadow: selected ? `0 0 0 1px #000, 0 0 10px ${editorColors.accent}66` : undefined, color: "white", fontSize: 10, boxSizing: "border-box", cursor: row.movable === false ? "pointer" : "grab", overflow: "hidden", whiteSpace: "nowrap", zIndex: laneShift ? 10 : selected ? 3 : 1, userSelect: "none" }}>
    {!row.point && row.trimStart !== false ? <span onPointerDown={(event) => drag(event, "start")} style={{ ...edgeStyle, left: 0 }} /> : null}
    {row.preview?.src ? <ClipPreview preview={row.preview} /> : null}
    {row.waveform ? <Waveform peaks={row.waveform} /> : null}
    {row.entranceDuration ? <AnimationWindow side="in" frames={row.entranceDuration} clipFrames={end - start} ppf={ppf} onChange={row.setEntranceDuration} onDragStart={beginHistoryTransaction} onDragEnd={endHistoryTransaction} /> : null}
    {row.exitDuration ? <AnimationWindow side="out" frames={row.exitDuration} clipFrames={end - start} ppf={ppf} onChange={row.setExitDuration} onDragStart={beginHistoryTransaction} onDragEnd={endHistoryTransaction} /> : null}
    <span style={{ position: "relative", zIndex: 2, display: "block", padding: "6px 11px", overflow: "hidden", textOverflow: "ellipsis" }}>{row.point ? "♪ " : ""}{row.label}</span>
    {!row.point && row.set ? <span onPointerDown={(event) => drag(event, "end")} style={{ ...edgeStyle, right: 0 }} /> : null}
  </div>;
};

const ClipPreview: React.FC<{ preview: TimelinePreview }> = ({ preview }) => preview.video
  ? <video src={preview.src} muted playsInline preload="auto" style={previewMediaStyle} />
  : <div style={{ ...previewMediaStyle, backgroundImage: preview.src ? `url(${JSON.stringify(preview.src)})` : undefined, backgroundRepeat: "repeat-x", backgroundSize: "auto 100%" }} />;

const Waveform: React.FC<{ peaks: number[] }> = ({ peaks }) => <div style={{ position: "absolute", inset: "4px 8px", display: "flex", alignItems: "center", gap: 1, opacity: 0.9, pointerEvents: "none" }}>{peaks.map((peak, index) => <i key={index} style={{ flex: 1, minWidth: 1, height: `${Math.max(8, peak * 100)}%`, background: "#38bdf8", borderRadius: 1 }} />)}</div>;

export const FullVideoTimeline: React.FC<{ currentFrame: number; onSeek: (frame: number) => void; onSceneMode: () => void }> = ({ currentFrame, onSeek, onSceneMode }) => {
  const [ppf, setPpf] = React.useState(1.5);
  const [contextTarget, setContextTarget] = React.useState<ContextTarget | null>(null);
  const [clipboardReady, setClipboardReady] = React.useState(clipboardHas);
  const rulerRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const customAssets = useCustomAssetsStore((state) => state.assets);
  const loadCustomAssets = useCustomAssetsStore((state) => state.load);
  const project = useProjectStore((state) => state.project);
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId);
  const selectedObjectId = useProjectStore((state) => state.selectedObjectId);
  const selectScene = useProjectStore((state) => state.selectScene);
  const selectObject = useProjectStore((state) => state.selectObject);
  const updateScene = useProjectStore((state) => state.updateScene);
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  const updateSceneRichHeadline = useProjectStore((state) => state.updateSceneRichHeadline);
  const updateSceneBlocks = useProjectStore((state) => state.updateSceneBlocks);
  const updateSceneVisuals = useProjectStore((state) => state.updateSceneVisuals);
  const updateSceneItems = useProjectStore((state) => state.updateSceneItems);
  const updateAudioClip = useProjectStore((state) => state.updateAudioClip);
  const splitAudioClip = useProjectStore((state) => state.splitAudioClip);
  const beginHistoryTransaction = useProjectStore((state) => state.beginHistoryTransaction);
  const endHistoryTransaction = useProjectStore((state) => state.endHistoryTransaction);
  React.useEffect(() => { loadCustomAssets(); }, [loadCustomAssets]);
  useTimelineWheelZoom(viewportRef, LABEL, ppf, setPpf, MIN_ZOOM, MAX_ZOOM);
  const timings = computeSceneTimings(project);
  const linkGroups = resolveHoistedLinkGroups(timings);
  const linkedOwnership = hoistedOwnership(linkGroups);
  const total = Math.max(1, projectDurationInFrames(project));
  const editHorizon = total + project.fps * 60;
  const cueIds = timings.flatMap(({ scene }) => [
    resolveEntranceSfx({ override: scene.motion?.sfx, entrance: scene.motion?.entrance }),
    scene.motion?.exit ? resolveExitSfx({ override: scene.motion?.exitSfx, exit: scene.motion.exit }) : undefined,
    ...(scene.content.visuals ?? []).flatMap((visual) => [visual.sfx && visual.sfx !== "none" ? visual.sfx : undefined, visual.exitSfx && visual.exitSfx !== "none" ? visual.exitSfx : undefined]),
  ]).filter((id): id is string => Boolean(id));
  const audioSources = [...(project.audioClips ?? []).map((clip) => getSfx(clip.sfxId)?.src), ...cueIds.map((id) => getSfx(id)?.src)].filter((src): src is string => Boolean(src));
  const audioWaveforms = useAudioWaveforms(audioSources, project.fps);
  const cueShape = (id: string, sourceStart: number, requestedDuration: number | undefined, seed: string) => {
    const src = getSfx(id)?.src;
    const info = src ? audioWaveforms.get(src) : undefined;
    const available = Math.max(1, (info?.durationInFrames ?? sourceStart + (requestedDuration ?? 30)) - sourceStart);
    const length = Math.min(requestedDuration ?? available, available);
    return { length, available, waveform: info ? sliceWaveform(info.peaks, sourceStart, length, info.durationInFrames) : fallbackWaveform(seed) };
  };
  const rows: Row[] = [];

  for (const [sceneIndex, timing] of timings.entries()) {
    const { scene, from, durationInFrames } = timing;
    const sceneEnd = editHorizon;
    const guideStart = scene.timelineRange?.from ?? from;
    const guideEnd = guideStart + (scene.timelineRange?.durationInFrames ?? durationInFrames);
    rows.push({ id: `scene-${scene.id}`, sceneId: scene.id, label: `${String(sceneIndex + 1).padStart(2, "0")} · ${scene.type}${scene.vo ? ` · ${scene.vo}` : ""}`, kind: "scene", color: KIND_COLOR.scene, start: guideStart, end: guideEnd, max: editHorizon, lane: 0, set: (start, end) => updateScene(scene.id, { timelineRange: { from: start, durationInFrames: Math.max(1, end - start) } }) });
    let automatic = sceneStartDelay(scene.motion);
    for (const [index, line] of (scene.content.richHeadline ?? []).entries()) {
      const localStart = line.delay ?? automatic;
      automatic += splitSpan(line.text, line.splitBy ?? "word", line.splitDuration, line.entranceDuration) + staggerDelay(1, scene.motion?.stagger);
      rows.push({ id: `${scene.id}-line-${index}`, sceneId: scene.id, objectId: `line-${index}`, label: line.text, kind: "text", color: KIND_COLOR.text, start: from + localStart, end: from + (line.exitAt ?? durationInFrames), min: from, max: sceneEnd, lane: line.lane, entranceDuration: line.animation === "none" ? undefined : splitSpan(line.text, line.splitBy ?? "word", line.splitDuration, line.entranceDuration), exitDuration: (line.exit ?? scene.motion?.exit) && (line.exit ?? scene.motion?.exit) !== "none" ? line.exitDuration ?? scene.motion?.exitDuration ?? 18 : undefined, setEntranceDuration: (splitDuration) => updateSceneRichHeadline(scene.id, (scene.content.richHeadline ?? []).map((value, at) => at === index ? { ...value, splitDuration, entranceDuration: undefined } : value)), setExitDuration: (exitDuration) => updateSceneRichHeadline(scene.id, (scene.content.richHeadline ?? []).map((value, at) => at === index ? { ...value, exitDuration } : value)), set: (start, end) => updateSceneRichHeadline(scene.id, (scene.content.richHeadline ?? []).map((value, at) => at === index ? { ...value, delay: start - from, exitAt: end - from } : value)), setLane: (lane) => updateSceneRichHeadline(scene.id, (scene.content.richHeadline ?? []).map((value, at) => at === index ? { ...value, lane } : value)) });
    }
    for (const [index, block] of (scene.content.blocks ?? []).entries()) rows.push({ id: `${scene.id}-block-${block.id}`, sceneId: scene.id, objectId: `block-${block.id}`, label: block.text, kind: "text", color: KIND_COLOR.text, start: from + (block.delay ?? 0), end: from + (block.exitAt ?? durationInFrames), min: from, max: sceneEnd, lane: block.lane, entranceDuration: block.animation === "none" ? undefined : splitSpan(block.text, block.splitBy ?? "word", block.splitDuration, block.entranceDuration), exitDuration: block.exit && block.exit !== "none" ? block.exitDuration ?? 18 : undefined, setEntranceDuration: (splitDuration) => updateSceneBlocks(scene.id, (scene.content.blocks ?? []).map((value, at) => at === index ? { ...value, splitDuration, entranceDuration: undefined } : value)), setExitDuration: (exitDuration) => updateSceneBlocks(scene.id, (scene.content.blocks ?? []).map((value, at) => at === index ? { ...value, exitDuration } : value)), set: (start, end) => updateSceneBlocks(scene.id, (scene.content.blocks ?? []).map((value, at) => at === index ? { ...value, delay: start - from, exitAt: end - from } : value)), setLane: (lane) => updateSceneBlocks(scene.id, (scene.content.blocks ?? []).map((value, at) => at === index ? { ...value, lane } : value)) });
    for (const [index, visual] of (scene.content.visuals ?? []).entries()) {
      if (linkedOwnership.get(scene.id)?.has(visual.id)) continue;
      const setVisual = (patch: Record<string, unknown>) => updateSceneVisuals(scene.id, (scene.content.visuals ?? []).map((value, at) => at === index ? { ...value, ...patch } : value));
      const preview = visualTimelinePreview(visual.visual, customAssets);
      rows.push({ id: `${scene.id}-visual-${visual.id}`, sceneId: scene.id, objectId: `visual-${visual.id}`, label: preview.label, preview, kind: "visual", color: KIND_COLOR.visual, start: from + (visual.delay ?? 0), end: from + (visual.exitAt ?? durationInFrames), min: from, max: sceneEnd, lane: visual.lane, entranceDuration: visual.entrance === "none" ? undefined : visual.entranceDuration ?? 18, exitDuration: visual.exit && visual.exit !== "none" ? visual.exitDuration ?? 18 : undefined, setEntranceDuration: (entranceDuration) => setVisual({ entranceDuration }), setExitDuration: (exitDuration) => setVisual({ exitDuration }), set: (start, end) => setVisual({ delay: start - from, exitAt: end - from }), setLane: (lane) => setVisual({ lane }) });
      if (visual.sfx && visual.sfx !== "none") {
        const cue = from + (visual.sfxAt ?? visual.delay ?? 0); const sourceStart = visual.sfxStartFrom ?? 0; const shape = cueShape(visual.sfx, sourceStart, visual.sfxDuration, `${visual.id}-in`); const end = cue + shape.length;
        rows.push({ id: `${scene.id}-visual-sound-in-${visual.id}`, sceneId: scene.id, objectId: `sound-visual-${visual.id}-in`, label: `${visual.visual.type} IN`, kind: "sound", color: KIND_COLOR.sound, waveform: shape.waveform, start: cue, end, min: from, max: sceneEnd, trimMin: Math.max(from, cue - sourceStart), trimEndMax: cue + shape.available, set: (start, nextEnd) => { const sameLength = nextEnd - start === end - cue; if (sameLength) setVisual({ sfxAt: start - from, sfxDuration: shape.length }); else if (nextEnd === end) setVisual({ sfxAt: start - from, sfxStartFrom: sourceStart + start - cue, sfxDuration: nextEnd - start }); else setVisual({ sfxDuration: nextEnd - start }); } });
      }
      if (visual.exit && visual.exitSfx && visual.exitSfx !== "none") {
        const cue = from + (visual.exitSfxAt ?? Math.max(0, (visual.exitAt ?? durationInFrames) - (visual.exitDuration ?? 18))); const sourceStart = visual.exitSfxStartFrom ?? 0; const shape = cueShape(visual.exitSfx, sourceStart, visual.exitSfxDuration, `${visual.id}-out`); const end = cue + shape.length;
        rows.push({ id: `${scene.id}-visual-sound-out-${visual.id}`, sceneId: scene.id, objectId: `sound-visual-${visual.id}-out`, label: `${visual.visual.type} OUT`, kind: "sound", color: KIND_COLOR.sound, waveform: shape.waveform, start: cue, end, min: from, max: sceneEnd, trimMin: Math.max(from, cue - sourceStart), trimEndMax: cue + shape.available, set: (start, nextEnd) => { const sameLength = nextEnd - start === end - cue; if (sameLength) setVisual({ exitSfxAt: start - from, exitSfxDuration: shape.length }); else if (nextEnd === end) setVisual({ exitSfxAt: start - from, exitSfxStartFrom: sourceStart + start - cue, exitSfxDuration: nextEnd - start }); else setVisual({ exitSfxDuration: nextEnd - start }); } });
      }
    }
    for (const [index, item] of (scene.content.items ?? []).entries()) rows.push({ id: `${scene.id}-step-${index}`, sceneId: scene.id, objectId: `step-${index}`, label: item.label, kind: "item", color: KIND_COLOR.item, start: from + (item.delay ?? (index + 1) * 6), end: from + (item.exitAt ?? durationInFrames), min: from, max: sceneEnd, lane: item.lane, set: (start, end) => updateSceneItems(scene.id, (scene.content.items ?? []).map((value, at) => at === index ? { ...value, delay: start - from, exitAt: end - from } : value)), setLane: (lane) => updateSceneItems(scene.id, (scene.content.items ?? []).map((value, at) => at === index ? { ...value, lane } : value)) });
    const sceneInId = resolveEntranceSfx({ override: scene.motion?.sfx, entrance: scene.motion?.entrance });
    if (sceneInId) {
      const cue = from + (scene.motion?.sfxAt ?? scene.motion?.startDelay ?? 0); const sourceStart = scene.motion?.sfxStartFrom ?? 0; const shape = cueShape(sceneInId, sourceStart, scene.motion?.sfxDuration, `${scene.id}-in`); const end = cue + shape.length;
      rows.push({ id: `${scene.id}-sound-in`, sceneId: scene.id, objectId: "sound-scene-in", label: "Scena IN", kind: "sound", color: KIND_COLOR.sound, waveform: shape.waveform, start: cue, end, min: from, max: sceneEnd, trimMin: Math.max(from, cue - sourceStart), trimEndMax: cue + shape.available, set: (start, nextEnd) => { const sameLength = nextEnd - start === end - cue; if (sameLength) updateSceneMotion(scene.id, { sfxAt: start - from, sfxDuration: shape.length }); else if (nextEnd === end) updateSceneMotion(scene.id, { sfxAt: start - from, sfxStartFrom: sourceStart + start - cue, sfxDuration: nextEnd - start }); else updateSceneMotion(scene.id, { sfxDuration: nextEnd - start }); } });
    }
    const sceneOutId = scene.motion?.exit ? resolveExitSfx({ override: scene.motion?.exitSfx, exit: scene.motion.exit }) : undefined;
    if (sceneOutId) {
      const cue = from + (scene.motion?.exitSfxAt ?? Math.max(0, (scene.motion?.exitAt ?? durationInFrames) - (scene.motion?.exitDuration ?? 18))); const sourceStart = scene.motion?.exitSfxStartFrom ?? 0; const shape = cueShape(sceneOutId, sourceStart, scene.motion?.exitSfxDuration, `${scene.id}-out`); const end = cue + shape.length;
      rows.push({ id: `${scene.id}-sound-out`, sceneId: scene.id, objectId: "sound-scene-out", label: "Scena OUT", kind: "sound", color: KIND_COLOR.sound, waveform: shape.waveform, start: cue, end, min: from, max: sceneEnd, trimMin: Math.max(from, cue - sourceStart), trimEndMax: cue + shape.available, set: (start, nextEnd) => { const sameLength = nextEnd - start === end - cue; if (sameLength) updateSceneMotion(scene.id, { exitSfxAt: start - from, exitSfxDuration: shape.length }); else if (nextEnd === end) updateSceneMotion(scene.id, { exitSfxAt: start - from, exitSfxStartFrom: sourceStart + start - cue, exitSfxDuration: nextEnd - start }); else updateSceneMotion(scene.id, { exitSfxDuration: nextEnd - start }); } });
    }
  }

  for (const group of linkGroups) {
    const firstMember = group.members[0]; const lastMember = group.members[group.members.length - 1];
    const firstTiming = timings.find((value) => value.scene.id === firstMember.sceneId)!; const lastTiming = timings.find((value) => value.scene.id === lastMember.sceneId)!;
    const firstVisual = firstTiming.scene.content.visuals?.find((value) => value.id === firstMember.entryId); const lastVisual = lastTiming.scene.content.visuals?.find((value) => value.id === lastMember.entryId);
    if (!firstVisual || !lastVisual) continue;
    rows.push({ id: `carry-${group.groupId}-${group.from}`, sceneId: firstMember.sceneId, objectId: `visual-${firstMember.entryId}`, label: `${firstVisual.visual.type} ↔ ${group.members.length} scenos`, kind: "visual", color: "#f97316", start: firstTiming.from + (firstVisual.delay ?? 0), end: lastTiming.from + (lastVisual.exitAt ?? lastTiming.durationInFrames), lane: firstVisual.lane, entranceDuration: firstVisual.entrance === "none" ? undefined : firstVisual.entranceDuration ?? 18, exitDuration: lastVisual.exit && lastVisual.exit !== "none" ? lastVisual.exitDuration ?? 18 : undefined, set: (start, end) => { updateSceneVisuals(firstMember.sceneId, (firstTiming.scene.content.visuals ?? []).map((value) => value.id === firstMember.entryId ? { ...value, delay: start - firstTiming.from } : value)); updateSceneVisuals(lastMember.sceneId, (lastTiming.scene.content.visuals ?? []).map((value) => value.id === lastMember.entryId ? { ...value, exitAt: end - lastTiming.from } : value)); }, setLane: (lane) => updateSceneVisuals(firstMember.sceneId, (firstTiming.scene.content.visuals ?? []).map((value) => value.id === firstMember.entryId ? { ...value, lane } : value)) });
  }
  for (const clip of project.audioClips ?? []) {
    const definition = getSfx(clip.sfxId);
    const info = definition?.src ? audioWaveforms.get(definition.src) : undefined;
    const sourceStart = clip.startFrom ?? 0;
    const available = Math.max(1, (info?.durationInFrames ?? sourceStart + (clip.durationInFrames ?? 30)) - sourceStart);
    const length = Math.min(clip.durationInFrames ?? available, available);
    const waveform = info ? sliceWaveform(info.peaks, sourceStart, length, info.durationInFrames) : fallbackWaveform(clip.id);
    const start = clip.from;
    const end = start + length;
    rows.push({
      id: clip.id,
      objectId: `audio-clip-${clip.id}`,
      label: definition?.label ?? clip.sfxId,
      kind: "sound",
      color: "#2563eb",
      waveform,
      start,
      end,
      lane: clip.lane ?? 0,
      setLane: (lane) => updateAudioClip(clip.id, { lane }),
      max: editHorizon,
      trimMin: Math.max(0, start - sourceStart),
      trimEndMax: start + available,
      set: (nextStart, nextEnd) => {
        const sameLength = nextEnd - nextStart === end - start;
        if (sameLength) updateAudioClip(clip.id, { from: nextStart, durationInFrames: length });
        else if (nextEnd === end) updateAudioClip(clip.id, { from: nextStart, startFrom: Math.max(0, sourceStart + nextStart - start), durationInFrames: nextEnd - nextStart });
        else updateAudioClip(clip.id, { durationInFrames: nextEnd - nextStart });
      },
    });
  }

  const tracks = buildTracks(rows);
  const width = Math.max(900, total * ppf);
  const seek = (clientX: number) => { const rect = rulerRef.current?.getBoundingClientRect(); if (rect) onSeek(clamp(Math.round((clientX - rect.left) / ppf), 0, total - 1)); };
  const dragPlayhead = (event: React.PointerEvent) => { event.preventDefault(); seek(event.clientX); const move = (pointer: PointerEvent) => seek(pointer.clientX); const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true }); };
  const open = (row: Row) => { if (row.sceneId) selectScene(row.sceneId); if (row.objectId) selectObject(row.objectId); else if (row.sceneId) onSeek(row.start); };
  const snapTargets = (row: Row) => [0, total, currentFrame, ...timings.flatMap((timing) => [timing.from, timing.from + timing.durationInFrames]), ...rows.filter((entry) => entry.id !== row.id).flatMap((entry) => [entry.start, entry.end])];
  const fit = () => setPpf(clamp(Math.max(320, (viewportRef.current?.clientWidth ?? 1000) - LABEL - 24) / total, MIN_ZOOM, MAX_ZOOM));
  const selectedTiming = timings.find((timing) => timing.scene.id === selectedSceneId);
  const localPlayhead = Math.max(0, currentFrame - (selectedTiming?.from ?? 0));
  const selectedAudioId = selectedObjectId?.startsWith("audio-clip-") ? selectedObjectId.slice(11) : null;
  const selectedAudio = selectedAudioId ? (project.audioClips ?? []).find((clip) => clip.id === selectedAudioId) : undefined;
  const selectedAudioRow = selectedAudio ? rows.find((row) => row.id === selectedAudio.id) : undefined;
  const selectedSoundRow = rows.find((row) => row.kind === "sound" && row.objectId === selectedObjectId && row.waveform);
  const playheadInsideSound = Boolean(selectedSoundRow && currentFrame > selectedSoundRow.start && currentFrame < selectedSoundRow.end);
  const splitSelectedAudio = () => {
    if (!selectedAudio || !selectedAudioRow) return;
    const id = splitAudioClip(selectedAudio.id, currentFrame, selectedAudioRow.end - selectedAudioRow.start);
    if (id) selectObject(`audio-clip-${id}`);
  };
  const trimSelectedAudioLeft = () => {
    if (!selectedSoundRow || !playheadInsideSound) return;
    selectedSoundRow.set?.(currentFrame, selectedSoundRow.end);
  };
  const trimSelectedAudioRight = () => {
    if (!selectedSoundRow || !playheadInsideSound) return;
    selectedSoundRow.set?.(selectedSoundRow.start, currentFrame);
  };
  const copySelected = () => {
    if (selectedObjectId && copyTimelineObject(selectedObjectId)) setClipboardReady(true);
  };
  const pasteAtPlayhead = () => {
    const pasted = pasteTimelineObject(localPlayhead);
    if (pasted) selectObject(pasted);
  };
  const duplicateSelected = () => {
    if (!selectedObjectId) return;
    const pasted = duplicateTimelineObject(selectedObjectId, localPlayhead);
    if (pasted) selectObject(pasted);
  };
  const resetSceneGuides = () => {
    beginHistoryTransaction();
    for (const scene of project.scenes) updateScene(scene.id, { timelineRange: undefined });
    endHistoryTransaction();
  };

  return <div style={{ flexShrink: 0, borderTop: `1px solid ${editorColors.border}`, background: "#151515" }}>
    <div style={toolbar}><button style={buttonStyle} onClick={onSceneMode}>Scene</button><button style={{ ...buttonStyle, color: editorColors.accent, borderColor: editorColors.accent }}>Full video</button><span style={{ fontSize: 10, color: editorColors.textDim }}>{(total / project.fps).toFixed(1)} s · {rows.length} objektai</span><button onClick={resetSceneGuides} style={buttonStyle} title="Atstatyti scenų gaires pagal automatinę nuoseklią tvarką; video nepasikeis">Reset scene guides</button><button disabled={!selectedObjectId} onClick={copySelected} style={buttonStyle} title="Ctrl+C">Copy</button><button disabled={!clipboardReady} onClick={pasteAtPlayhead} style={buttonStyle} title="Ctrl+V · įkelti ties balta linija">Paste</button><button disabled={!selectedObjectId} onClick={duplicateSelected} style={buttonStyle} title="Ctrl+D">Duplicate</button><span style={{ width: 1, height: 20, background: editorColors.border }} /><button disabled={!playheadInsideSound} onClick={trimSelectedAudioLeft} style={buttonStyle} title="Nukirpti klipo kairę iki baltos linijos">|← Trim left</button><button disabled={!selectedAudio || !playheadInsideSound} onClick={splitSelectedAudio} style={buttonStyle} title="Padalinti savarankišką audio klipą ties balta linija">✂ Split</button><button disabled={!playheadInsideSound} onClick={trimSelectedAudioRight} style={buttonStyle} title="Nukirpti klipo dešinę iki baltos linijos">Trim right →|</button><div style={{ flex: 1 }} /><span>−</span><input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.15} value={ppf} onChange={(event) => setPpf(Number(event.target.value))} style={{ width: 120, accentColor: editorColors.accent }} /><span>+</span><button onClick={fit} style={buttonStyle}>Fit</button><span style={{ minWidth: 62, color: editorColors.accent, fontSize: 10 }}>{(currentFrame / project.fps).toFixed(2)} s</span></div>
    <div ref={viewportRef} style={{ height: 330, overflow: "auto" }}><div style={{ position: "relative", width: LABEL + width, minWidth: "100%" }}>
      <div ref={rulerRef} onPointerDown={dragPlayhead} style={{ position: "sticky", top: 0, zIndex: 20, marginLeft: LABEL, width, height: 27, background: "#181818", cursor: "ew-resize", borderBottom: `1px solid ${editorColors.border}` }}>{Array.from({ length: Math.floor(total / project.fps) + 1 }, (_, index) => <span key={index} style={{ position: "absolute", left: index * project.fps * ppf, top: 4, height: 22, fontSize: 9, color: editorColors.textDim, borderLeft: "1px solid #555", paddingLeft: 4 }}>{index}s</span>)}</div>
      <div onPointerDown={dragPlayhead} style={{ position: "absolute", zIndex: 18, left: LABEL + currentFrame * ppf, top: 20, bottom: 0, width: 3, marginLeft: -1, background: "white", cursor: "ew-resize" }}><span style={{ position: "absolute", left: -4, width: 11, height: 11, background: "white", transform: "rotate(45deg)" }} /></div>
      {tracks.map((track) => {
        const sameKind = tracks.filter((entry) => entry.kind === track.kind);
        const label = `${KIND_LABEL[track.kind]} ${track.lane + 1}`;
        return <div key={`${track.kind}-${track.lane}`} style={{ height: ROW_HEIGHT, display: "flex", borderBottom: "1px solid #292929" }}><div style={{ position: "sticky", left: 0, zIndex: 12, width: LABEL, flexShrink: 0, padding: "11px 10px", boxSizing: "border-box", background: track.rows.length ? "#191919" : "#171717", borderRight: `1px solid ${editorColors.border}`, color: track.rows.length ? editorColors.text : editorColors.textDim, fontSize: 10 }}><i style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, marginRight: 7, background: KIND_COLOR[track.kind] }} />{track.rows.length ? label : `+ nauja ${KIND_LABEL[track.kind].toLowerCase()} linija`}</div><div style={{ position: "relative", width, flexShrink: 0, backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${Math.max(1, project.fps * ppf - 1)}px, #292929 ${project.fps * ppf}px)` }}>{timings.slice(1).map((timing) => <span key={timing.scene.id} style={{ position: "absolute", zIndex: 0, left: timing.from * ppf, top: 0, bottom: 0, borderLeft: "1px dashed #555" }} />)}{track.rows.map((row) => <GlobalClip key={row.id} row={row} total={total} fps={project.fps} ppf={ppf} laneIndex={sameKind.indexOf(track)} laneCount={sameKind.length} selected={row.objectId === selectedObjectId} snapTargets={snapTargets(row)} onOpen={() => open(row)} onContextMenu={(event) => { event.preventDefault(); open(row); if (row.objectId) setContextTarget({ selectionId: row.objectId, x: event.clientX, y: event.clientY }); }} />)}</div></div>;
      })}
    </div></div>
    {contextTarget ? <TimelineContextMenu target={contextTarget} playheadLocalFrame={localPlayhead} onClose={() => setContextTarget(null)} onSelect={selectObject} /> : null}
  </div>;
};

const edgeStyle: React.CSSProperties = { position: "absolute", zIndex: 4, top: 0, bottom: 0, width: 7, background: "rgba(255,255,255,.9)", cursor: "ew-resize" };
const previewMediaStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.44, pointerEvents: "none" };
const toolbar: React.CSSProperties = { height: 40, padding: "0 12px", display: "flex", alignItems: "center", gap: 8, overflowX: "auto", whiteSpace: "nowrap", borderBottom: `1px solid ${editorColors.border}`, color: editorColors.text };
const buttonStyle: React.CSSProperties = { padding: "5px 10px", borderRadius: 5, border: `1px solid ${editorColors.border}`, background: editorColors.panelElevated, color: editorColors.text, cursor: "pointer", fontSize: 11 };
