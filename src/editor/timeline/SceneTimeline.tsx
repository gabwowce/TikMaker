import { sceneTimelineEnd } from "./sceneTimelineEnd";
import { groupDragPositions } from "./groupDrag";
import { Button, NativeSelect, Slider } from "@mantine/core";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getSfx } from "../../registries/sfxRegistry";
import { computeSceneTimings } from "../../utils/duration";
import { formatTimecode } from "../../utils/timecode";
import {
  resolveEntranceSfx,
  resolveExitSfx,
} from "../../video/motion/sfxDefaults";
import { useCustomAssetsStore } from "../state/customAssetsStore";
import { usePreferences } from "../state/fileLibrary";
import { useProjectStore } from "../state/projectStore";
import { isAudioDrag, readAudioDragPayload } from "./audioDrag";
import { buildSceneTimelineRows } from "./buildSceneTimelineRows";
import { FullVideoTimeline } from "./FullVideoTimeline";
import { applyTimelineObjectPositions } from "./moveTimelineObjects";
import {
  clipboardHas,
  copyTimelineObjects,
  duplicateTimelineObjects,
  pasteTimelineObjects,
} from "./objectClipboard";
import { Clip, KeyframeMarkers } from "./SceneTimelineClip";
import {
  LABEL_WIDTH,
  MAX_PANEL_HEIGHT,
  MIN_PANEL_HEIGHT,
  MIN_SCENE_FRAMES,
  autoLane,
  clamp,
  colorsByKind,
  laneLabel,
  overlaps,
  snapFrame,
} from "./sceneTimelineLayout";
import { TimelineRow } from "./sceneTimelineTypes";
import { qualifySelection } from "./selectionId";
import { TimelineContextMenu, type ContextTarget } from "./TimelineContextMenu";
import { useAudioWaveforms } from "./useAudioWaveforms";
import { useTimelineWheelZoom } from "./useTimelineWheelZoom";

type SceneTimelineProps = {
  currentFrame?: number;
  onSeek?: (absoluteFrame: number) => void;
};

export function SceneTimeline({
  currentFrame = 0,
  onSeek,
}: SceneTimelineProps) {
  const [mode, setMode] = useState<"scene" | "full">("scene");
  const hasScenes = useProjectStore((state) => state.project.scenes.length > 0);
  if (mode === "full") {
    return (
      <FullVideoTimeline
        currentFrame={currentFrame}
        onSeek={(frame) => onSeek?.(frame)}
        onSceneMode={() => setMode("scene")}
      />
    );
  }
  return hasScenes ? (
    <SceneTimelineScene
      currentFrame={currentFrame}
      onSeek={onSeek}
      onFullMode={() => setMode("full")}
    />
  ) : null;
}

function SceneTimelineScene({
  currentFrame = 0,
  onSeek,
  onFullMode,
}: SceneTimelineProps & {
  onFullMode: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [pixelsPerFrame, setPixelsPerFrame] = useState(5);
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(
    null,
  );
  const [clipboardReady, setClipboardReady] = useState(clipboardHas);
  const storedPanelHeight = usePreferences((state) => state.timelineHeight);
  const setPreferences = usePreferences((state) => state.set);
  const [panelHeight, setPanelHeight] = useState(() =>
    Number.isFinite(storedPanelHeight)
      ? clamp(storedPanelHeight as number, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT)
      : 250,
  );
  function beginPanelResize(event: ReactPointerEvent) {
    event.preventDefault();
    const originY = event.clientY;
    const originHeight = panelHeight;
    function move(pointer: PointerEvent) {
      const next = clamp(
        originHeight + (originY - pointer.clientY),
        MIN_PANEL_HEIGHT,
        MAX_PANEL_HEIGHT,
      );
      setPanelHeight(next);
      setPreferences({ timelineHeight: next });
    }
    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  }
  const rulerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
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
  const updateSceneRichHeadline = useProjectStore(
    (s) => s.updateSceneRichHeadline,
  );
  const updateAudioClip = useProjectStore((s) => s.updateAudioClip);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const splitAudioClip = useProjectStore((s) => s.splitAudioClip);
  const selectObject = useProjectStore((s) => s.selectObject);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  const selectedObjectIds = useProjectStore((s) => s.selectedObjectIds);
  const toggleObjectSelection = useProjectStore((s) => s.toggleObjectSelection);
  const selectObjects = useProjectStore((s) => s.selectObjects);

  const beginHistoryTransaction = useProjectStore(
    (s) => s.beginHistoryTransaction,
  );
  const endHistoryTransaction = useProjectStore((s) => s.endHistoryTransaction);
  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);
  useTimelineWheelZoom(
    viewportRef,
    LABEL_WIDTH,
    pixelsPerFrame,
    setPixelsPerFrame,
    0.5,
    20,
  );
  const timings = computeSceneTimings(project);
  const cueIds = timings
    .flatMap(({ scene }) => [
      resolveEntranceSfx({
        override: scene.motion?.sfx,
        entrance: scene.motion?.entrance,
      }),
      scene.motion?.exit
        ? resolveExitSfx({
            override: scene.motion?.exitSfx,
            exit: scene.motion.exit,
          })
        : undefined,
      ...(scene.content.visuals ?? []).flatMap((visual) => [
        visual.sfx && visual.sfx !== "none" ? visual.sfx : undefined,
        visual.exitSfx && visual.exitSfx !== "none"
          ? visual.exitSfx
          : undefined,
      ]),
    ])
    .filter((id): id is string => Boolean(id));
  const audioSources = [
    ...(project.audioClips ?? []).map((clip) => getSfx(clip.sfxId)?.src),
    ...cueIds.map((id) => getSfx(id)?.src),
  ].filter((src): src is string => Boolean(src));
  const audioWaveforms = useAudioWaveforms(audioSources, project.fps);
  useEffect(() => {
    for (const clip of project.audioClips ?? []) {
      if (clip.durationInFrames !== undefined) continue;
      const src = getSfx(clip.sfxId)?.src;
      const durationInFrames = src
        ? audioWaveforms.get(src)?.durationInFrames
        : undefined;
      if (durationInFrames !== undefined)
        updateAudioClip(clip.id, { durationInFrames });
    }
  }, [audioWaveforms, project.audioClips, updateAudioClip]);

  const timing =
    timings.find((entry) => entry.scene.id === storedSelectedSceneId) ??
    timings.find(
      (entry) =>
        currentFrame >= entry.from &&
        currentFrame < entry.from + entry.durationInFrames,
    ) ??
    timings[0];
  if (!timing) return null;
  const selectedSceneId = timing.scene.id;
  const scene = timing.scene;
  const visuals = scene.content.visuals ?? [];
  const steps = scene.content.items ?? [];
  const blocks = scene.content.blocks ?? [];
  const lines = scene.content.richHeadline ?? [];
  const sceneEnd = timing.durationInFrames;
  const max = sceneTimelineEnd(project, timing);
  const localFrame = clamp(currentFrame - timing.from, 0, max);
  function openInspector(row: TimelineRow, additive = false) {
    const id = qualifySelection(selectedSceneId, row.id);
    return additive ? toggleObjectSelection(id) : selectObject(id);
  }
  const rows = buildSceneTimelineRows(
    project,
    timing,
    customAssets,
    audioWaveforms,
  );
  function moveVisualRowToLane(movedId: string, targetLane: number) {
    const visualRows = rows.filter(
      (row) => row.kind !== "sound" && row.setLane,
    );
    const moved = visualRows.find((row) => row.id === movedId);
    if (!moved || moved.lane === undefined || moved.lane === targetLane) return;
    const originLane = moved.lane;
    const nextLane = new Map<string, number>();
    for (const row of visualRows) {
      if (row.id === movedId) nextLane.set(row.id, targetLane);
      else if (row.lane === undefined) continue;
      else if (
        targetLane < originLane &&
        row.lane >= targetLane &&
        row.lane < originLane
      )
        nextLane.set(row.id, row.lane + 1);
      else if (
        targetLane > originLane &&
        row.lane > originLane &&
        row.lane <= targetLane
      )
        nextLane.set(row.id, row.lane - 1);
    }
    updateScene(selectedSceneId, {
      content: {
        ...scene.content,
        richHeadline: lines.map((line, index) => ({
          ...line,
          lane: nextLane.get(`line-${index}`) ?? line.lane,
        })),
        blocks: blocks.map((block) => ({
          ...block,
          lane: nextLane.get(`block-${block.id}`) ?? block.lane,
        })),
        items: steps.map((item, index) => ({
          ...item,
          lane: nextLane.get(`step-${index}`) ?? item.lane,
        })),
        visuals: visuals.map((entry) => ({
          ...entry,
          lane: nextLane.get(`visual-${entry.id}`) ?? entry.lane,
          visual:
            entry.visual.type === "checklist"
              ? {
                  ...entry.visual,
                  items: entry.visual.items.map((item, itemIndex) => ({
                    ...item,
                    lane:
                      nextLane.get(`check-${entry.id}-${itemIndex}`) ??
                      item.lane,
                  })),
                }
              : entry.visual,
        })),
      },
    });
  }
  for (const row of rows) {
    if (row.kind !== "sound" && row.setLane)
      row.setLane = (lane) => moveVisualRowToLane(row.id, lane);
  }
  function snapTargetsFor(rowId: string): number[] {
    const targets = [0, max, localFrame];
    for (const other of rows) {
      if (other.id === rowId) continue;
      targets.push(Math.round(other.start), Math.round(other.end));
    }
    return targets;
  }
  const lanes: {
    kind: TimelineRow["kind"];
    rows: TimelineRow[];
  }[] = [];
  for (const ofKind of [
    rows.filter((row) => row.kind !== "sound"),
    rows.filter((row) => row.kind === "sound"),
  ]) {
    if (ofKind.length === 0) continue;
    const buckets: TimelineRow[][] = [];
    for (const row of ofKind) {
      const index = row.lane ?? autoLane(row, ofKind);
      while (buckets.length <= index) buckets.push([]);
      buckets[index].push(row);
    }
    while (buckets.length && buckets[buckets.length - 1].length === 0)
      buckets.pop();
    for (const bucket of buckets) {
      const first = bucket[0];
      if (first) lanes.push({ kind: first.kind, rows: bucket });
    }
  }
  useEffect(() => {
    const visualRows = rows.filter(
      (row) => row.kind !== "sound" && row.setLane,
    );
    const soundRows = rows.filter((row) => row.kind === "sound" && row.setLane);
    const visualNeedsLayout =
      visualRows.some((row) => row.lane === undefined) ||
      visualRows.some((row, index) =>
        visualRows
          .slice(index + 1)
          .some((other) => row.lane === other.lane && overlaps(row, other)),
      );
    const soundNeedsLayout = soundRows.some((row) => row.lane === undefined);
    if (!visualNeedsLayout && !soundNeedsLayout) return;
    const assigned = new Map<string, number>();
    for (const [ofKind, rebuild] of [
      [visualRows, visualNeedsLayout],
      [soundRows, false],
    ] as const) {
      const buckets: TimelineRow[][] = [];
      for (const row of ofKind.filter(
        (row) => !rebuild && row.lane !== undefined,
      )) {
        while (buckets.length <= row.lane!) buckets.push([]);
        buckets[row.lane!].push(row);
      }
      for (const row of ofKind.filter(
        (row) => rebuild || row.lane === undefined,
      )) {
        let index = buckets.findIndex((bucket) =>
          bucket.every((other) => !overlaps(row, other)),
        );
        if (index === -1) {
          index = buckets.length;
          buckets.push([]);
        }
        buckets[index].push(row);
        assigned.set(row.id, index);
      }
    }
    updateScene(selectedSceneId, {
      content: {
        ...scene.content,
        richHeadline: lines.length
          ? lines.map((line, index) => ({
              ...line,
              lane: assigned.get(`line-${index}`) ?? line.lane,
            }))
          : scene.content.richHeadline,
        blocks: blocks.length
          ? blocks.map((block) => ({
              ...block,
              lane: assigned.get(`block-${block.id}`) ?? block.lane,
            }))
          : scene.content.blocks,
        items: steps.length
          ? steps.map((item, index) => ({
              ...item,
              lane: assigned.get(`step-${index}`) ?? item.lane,
            }))
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
                        lane:
                          assigned.get(`check-${entry.id}-${itemIndex}`) ??
                          item.lane,
                      })),
                    }
                  : entry.visual,
            }))
          : scene.content.visuals,
      },
    });
  }, [selectedSceneId, rows.length]);
  function laneIndexOf(lane: (typeof lanes)[number]) {
    return lanes
      .filter(
        (candidate) => (candidate.kind === "sound") === (lane.kind === "sound"),
      )
      .indexOf(lane);
  }
  const trackWidth = Math.max(640, max * pixelsPerFrame);
  const tickEveryFrames = pixelsPerFrame >= 8 ? project.fps / 2 : project.fps;
  function beginGroupDragFor(rowId: string) {
    const draggedId = qualifySelection(selectedSceneId, rowId);
    if (selectedObjectIds.length < 2 || !selectedObjectIds.includes(draggedId))
      return null;
    return () => {
      const origins = rows
        .filter((row) =>
          selectedObjectIds.includes(qualifySelection(selectedSceneId, row.id)),
        )
        .map((row) => ({
          id: qualifySelection(selectedSceneId, row.id),
          start: Math.round(row.start),
          end: Math.round(row.end),
        }));
      return (delta: number) => {
        applyTimelineObjectPositions(groupDragPositions(origins, delta, max));
      };
    };
  }
  const [marquee, setMarquee] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  function beginMarquee(event: ReactPointerEvent<HTMLElement>) {
    const additive = event.ctrlKey || event.metaKey || event.shiftKey;
    const base = additive ? [...selectedObjectIds] : [];
    const originX = event.clientX;
    const originY = event.clientY;
    const seekTarget = event.currentTarget;
    let dragging = false;
    function move(pointer: PointerEvent) {
      if (
        !dragging &&
        Math.abs(pointer.clientX - originX) +
          Math.abs(pointer.clientY - originY) <
          4
      )
        return;
      dragging = true;
      const box = {
        left: Math.min(originX, pointer.clientX),
        top: Math.min(originY, pointer.clientY),
        width: Math.abs(pointer.clientX - originX),
        height: Math.abs(pointer.clientY - originY),
      };
      setMarquee(box);
      const hits: string[] = [];
      for (const element of viewportRef.current?.querySelectorAll(
        "[data-timeline-object]",
      ) ?? []) {
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
    }
    function finish(pointer: PointerEvent) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setMarquee(null);
      if (dragging) return;
      const rect = seekTarget.getBoundingClientRect();
      onSeek?.(
        timing.from +
          clamp(
            Math.round((pointer.clientX - rect.left) / pixelsPerFrame),
            0,
            max - 1,
          ),
      );
      if (!additive) selectObject(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  function pinImplicitEnds(previousEnd: number) {
    const content = scene.content;
    function pin<
      T extends {
        exitAt?: number;
      },
    >(value: T): T {
      return value.exitAt === undefined
        ? { ...value, exitAt: previousEnd }
        : value;
    }
    updateScene(selectedSceneId, {
      content: {
        ...content,
        richHeadline: content.richHeadline?.map(pin),
        blocks: content.blocks?.map(pin),
        items: content.items?.map(pin),
        visuals: content.visuals?.map((entry) => {
          const pinned = pin(entry);
          if (pinned.visual.type === "checklist") {
            return {
              ...pinned,
              visual: { ...pinned.visual, items: pinned.visual.items.map(pin) },
            };
          }
          return pinned;
        }),
      },
      motion:
        content.richHeadline?.length || scene.motion?.exitAt !== undefined
          ? scene.motion
          : { ...scene.motion, exitAt: previousEnd },
    });
  }
  function beginSceneEndDrag(event: ReactPointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    beginHistoryTransaction();
    const originX = event.clientX;
    const originEnd = sceneEnd;
    const targets = [
      ...new Set([
        ...rows.flatMap((row) => [Math.round(row.start), Math.round(row.end)]),
        localFrame,
      ]),
    ];
    let latest = originEnd;
    function move(pointer: PointerEvent) {
      const raw = originEnd + (pointer.clientX - originX) / pixelsPerFrame;
      latest = clamp(
        snapFrame(raw, targets, pixelsPerFrame),
        MIN_SCENE_FRAMES,
        max,
      );
      updateScene(selectedSceneId, { durationSeconds: latest / project.fps });
    }
    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (latest < originEnd) pinImplicitEnds(originEnd);
      endHistoryTransaction();
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  function clearSceneDuration() {
    return updateScene(selectedSceneId, { durationSeconds: undefined });
  }
  function dropAudio(event: ReactDragEvent<HTMLElement>) {
    const payload = readAudioDragPayload(event);
    if (!payload) return;
    event.preventDefault();
    setDropFrame(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const local = clamp(
      Math.round((event.clientX - rect.left) / pixelsPerFrame),
      0,
      max,
    );
    beginHistoryTransaction();
    addAudioClip(payload.sfxId, timing.from + local);
    const clips = useProjectStore.getState().project.audioClips ?? [];
    const inserted = clips[clips.length - 1];
    if (inserted) {
      if (payload.cut) updateAudioClip(inserted.id, payload.cut);
      selectObject(`audio-clip-${inserted.id}`);
    }
    endHistoryTransaction();
  }
  const [dropFrame, setDropFrame] = useState<number | null>(null);
  function dragOverAudio(event: ReactDragEvent<HTMLElement>) {
    if (!isAudioDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const rect = event.currentTarget.getBoundingClientRect();
    setDropFrame(
      clamp(Math.round((event.clientX - rect.left) / pixelsPerFrame), 0, max),
    );
  }

  function beginPlayheadDrag(event: ReactPointerEvent) {
    event.preventDefault();
    function seekClientX(clientX: number) {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect) return;
      onSeek?.(
        timing.from +
          clamp(Math.round((clientX - rect.left) / pixelsPerFrame), 0, max - 1),
      );
    }
    seekClientX(event.clientX);
    function move(pointer: PointerEvent) {
      return seekClientX(pointer.clientX);
    }
    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  }
  function resetToAutomatic() {
    beginHistoryTransaction();
    updateSceneMotion(selectedSceneId, {
      startDelay: undefined,
      exitAt: undefined,
      sfxAt: undefined,
      exitSfxAt: undefined,
      sfxStartFrom: undefined,
      sfxDuration: undefined,
      exitSfxStartFrom: undefined,
      exitSfxDuration: undefined,
    });
    updateSceneRichHeadline(
      selectedSceneId,
      lines.map((line) => ({ ...line, delay: undefined, exitAt: undefined })),
    );
    updateSceneBlocks(
      selectedSceneId,
      blocks.map((block) => ({
        ...block,
        delay: undefined,
        exitAt: undefined,
      })),
    );
    updateSceneItems(
      selectedSceneId,
      steps.map((item) => ({ ...item, delay: undefined, exitAt: undefined })),
    );
    updateSceneVisuals(
      selectedSceneId,
      visuals.map((entry) => ({
        ...entry,
        delay: undefined,
        exitAt: undefined,
        sfxAt: undefined,
        exitSfxAt: undefined,
        sfxStartFrom: undefined,
        sfxDuration: undefined,
        exitSfxStartFrom: undefined,
        exitSfxDuration: undefined,
        visual:
          entry.visual.type === "checklist"
            ? {
                ...entry.visual,
                items: entry.visual.items.map((item) => ({
                  ...item,
                  delay: undefined,
                  exitAt: undefined,
                })),
              }
            : entry.visual,
      })),
    );
    endHistoryTransaction();
  }
  function fitTimeline() {
    const available = Math.max(
      320,
      (viewportRef.current?.clientWidth ?? 900) - LABEL_WIDTH - 24,
    );
    setPixelsPerFrame(clamp(available / Math.max(1, max), 0.5, 20));
  }
  const sceneIndex = timings.findIndex(
    (entry) => entry.scene.id === selectedSceneId,
  );
  function copySelected() {
    if (copyTimelineObjects(selectedObjectIds)) setClipboardReady(true);
  }
  function pasteAtPlayhead() {
    const pasted = pasteTimelineObjects(localFrame);
    if (pasted.length) selectObjects(pasted);
  }
  function duplicateSelected() {
    const pasted = duplicateTimelineObjects(selectedObjectIds, localFrame);
    if (pasted.length) selectObjects(pasted);
  }
  const selectedAudioId = selectedObjectId?.startsWith("audio-clip-")
    ? selectedObjectId.slice(11)
    : null;
  const selectedAudio = selectedAudioId
    ? (project.audioClips ?? []).find((clip) => clip.id === selectedAudioId)
    : undefined;
  const selectedAudioRow = selectedAudio
    ? rows.find((row) => row.id === `audio-clip-${selectedAudio.id}`)
    : undefined;
  const selectedSoundRow = rows.find(
    (row) =>
      row.kind === "sound" &&
      qualifySelection(selectedSceneId, row.id) === selectedObjectId &&
      row.waveform,
  );
  const playheadInsideSound = Boolean(
    selectedSoundRow &&
    localFrame > selectedSoundRow.start &&
    localFrame < selectedSoundRow.end,
  );
  function splitSelectedAudio() {
    if (!selectedAudio || !selectedAudioRow) return;
    const id = splitAudioClip(
      selectedAudio.id,
      currentFrame,
      selectedAudioRow.end - selectedAudioRow.start,
    );
    if (id) selectObject(`audio-clip-${id}`);
  }
  function trimSelectedAudioLeft() {
    if (!selectedSoundRow || !playheadInsideSound) return;
    selectedSoundRow.set(localFrame, selectedSoundRow.end);
  }
  function trimSelectedAudioRight() {
    if (!selectedSoundRow || !playheadInsideSound) return;
    selectedSoundRow.set(selectedSoundRow.start, localFrame);
  }
  return (
    <div className="shrink-0 relative border-0 border-t border-solid border-editor-border bg-[#151515]">
      {expanded ? (
        <div
          onPointerDown={beginPanelResize}
          className="absolute top-[-3px] left-0 right-0 h-[7px] [cursor:ns-resize] [z-index:20]"
        />
      ) : null}
      <div
        className={`h-9.5 p-[0_12px] flex items-center gap-3 overflow-x-auto whitespace-nowrap [&_button]:shrink-0 [&_.mantine-NativeSelect-root]:shrink-0 ${expanded ? "[border-bottom:1px_solid_#2c2c2c]" : "[border-bottom:none]"}`}
      >
        <Button
          variant="default"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "▾" : "▸"} Timeline
        </Button>
        <Button variant="default">Scene</Button>
        <Button variant="default" onClick={onFullMode}>
          Full video
        </Button>
        <Button
          variant="default"
          disabled={sceneIndex <= 0}
          onClick={() => selectScene(timings[sceneIndex - 1]?.scene.id ?? null)}
          aria-label="Previous scene"
        >
          ‹
        </Button>
        <NativeSelect
          value={selectedSceneId}
          onChange={(event) => selectScene(event.target.value)}
          className="max-w-[180px]"
          aria-label="Select scene"
        >
          {timings.map((entry, index) => (
            <option key={entry.scene.id} value={entry.scene.id}>
              {index + 1}. {entry.scene.type}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant="default"
          disabled={sceneIndex >= timings.length - 1}
          onClick={() => selectScene(timings[sceneIndex + 1]?.scene.id ?? null)}
          aria-label="Next scene"
        >
          ›
        </Button>
        <strong className="text-[11px] text-editor-text">{scene.type}</strong>
        <span className="text-[10px] text-editor-muted">
          {(sceneEnd / project.fps).toFixed(1)} s scene
        </span>
        <Button
          variant="default"
          onClick={resetToAutomatic}
          aria-label="Clear manual IN/OUT times and restore automatic stagger timing"
        >
          ↺ Reset to Auto
        </Button>
        <Button
          variant="default"
          disabled={!selectedObjectIds.length}
          onClick={copySelected}
          aria-label="Ctrl+C · Ctrl+click to select multiple objects"
        >
          Copy
          {selectedObjectIds.length > 1 ? ` (${selectedObjectIds.length})` : ""}
        </Button>
        <Button
          variant="default"
          disabled={!clipboardReady}
          onClick={pasteAtPlayhead}
          aria-label="Ctrl+V · paste at the playhead"
        >
          Paste
        </Button>
        <Button
          variant="default"
          disabled={!selectedObjectIds.length}
          onClick={duplicateSelected}
          aria-label="Ctrl+D"
        >
          Duplicate
          {selectedObjectIds.length > 1 ? ` (${selectedObjectIds.length})` : ""}
        </Button>
        <span className="w-[1px] h-5 bg-editor-border" />
        <Button
          variant="default"
          disabled={!playheadInsideSound}
          onClick={trimSelectedAudioLeft}
          aria-label="Trim the start of the clip to the playhead"
        >
          |←
        </Button>
        <Button
          variant="default"
          disabled={!selectedAudio || !playheadInsideSound}
          onClick={splitSelectedAudio}
          aria-label="Split the audio clip at the playhead"
        >
          ✂
        </Button>
        <Button
          variant="default"
          disabled={!playheadInsideSound}
          onClick={trimSelectedAudioRight}
          aria-label="Trim the end of the clip to the playhead"
        >
          →|
        </Button>
        <div className="flex-1" />
        <span className="text-[10px] text-editor-muted">−</span>
        <Slider
          min={0.5}
          max={20}
          step={0.25}
          value={pixelsPerFrame}
          onChange={(value) => setPixelsPerFrame(Number(value))}
          className="w-[110px]"
          aria-label="Timeline zoom"
        />
        <span className="text-[10px] text-editor-muted">+</span>
        <Button
          variant="default"
          onClick={fitTimeline}
          aria-label="Fit the entire scene"
        >
          Fit
        </Button>
        <span className="min-w-21 text-right text-[10px] text-editor-accent [font-family:ui-monospace,_monospace]">
          {formatTimecode(localFrame, project.fps)}
        </span>
      </div>
      {expanded ? (
        <div
          ref={viewportRef}
          className="overflow-auto"
          style={{
            height: panelHeight,
          }}
        >
          <div
            className="relative min-w-full"
            style={{
              width: LABEL_WIDTH + trackWidth,
            }}
          >
            <div
              ref={rulerRef}
              onPointerDown={beginPlayheadDrag}
              className="sticky top-0 [z-index:5] ml-[190px] h-6.5 bg-[#181818] cursor-ew-resize border-0 border-b border-solid border-editor-border"
              style={{
                width: trackWidth,
              }}
            >
              {Array.from(
                { length: Math.floor(max / tickEveryFrames) + 1 },
                (_, index) => {
                  const frame = Math.round(index * tickEveryFrames);
                  return (
                    <div
                      key={frame}
                      className="absolute top-0 bottom-0 [border-left:1px_solid_#444]"
                      style={{
                        left: frame * pixelsPerFrame,
                      }}
                    >
                      <span className="absolute left-1 top-1 text-[9px] text-editor-muted">
                        {(frame / project.fps).toFixed(
                          frame % project.fps ? 2 : 0,
                        )}
                        s
                      </span>
                    </div>
                  );
                },
              )}
            </div>
            <div
              onPointerDown={beginPlayheadDrag}
              className="absolute [z-index:8] top-5 bottom-0 w-[3px] ml-[-1px] bg-white cursor-ew-resize [touch-action:none]"
              style={{
                left: LABEL_WIDTH + localFrame * pixelsPerFrame,
              }}
            >
              <div className="absolute left-[-4px] top-0 w-[11px] h-[11px] bg-white [transform:rotate(45deg)]" />
            </div>

            <div
              onPointerDown={beginSceneEndDrag}
              onDoubleClick={clearSceneDuration}
              className="absolute [z-index:9] top-2 bottom-0 w-[19px] cursor-ew-resize [touch-action:none]"
              style={{
                left: LABEL_WIDTH + sceneEnd * pixelsPerFrame - 9,
              }}
            >
              <span className="absolute left-2 top-4.5 bottom-0 [border-left:2px_dashed_#FF7024] opacity-[0.9]" />
              <span
                className={`absolute left-[3px] top-0.5 w-[13px] h-[13px] bg-editor-accent rounded-[2px] ${scene.durationSeconds === undefined ? "opacity-[0.45]" : "opacity-[1]"}`}
              />
            </div>
            {dropFrame !== null ? (
              <div
                className="absolute [z-index:9] top-6.5 bottom-0 w-0.5 bg-[#38bdf8] pointer-events-none"
                style={{
                  left: LABEL_WIDTH + dropFrame * pixelsPerFrame,
                }}
              />
            ) : null}
            {lanes.map((lane, laneIndex) => (
              <div
                key={`${lane.kind}-${laneIndex}`}
                className="h-8.5 flex [border-bottom:1px_solid_#252525]"
              >
                <div
                  onClick={() => openInspector(lane.rows[0])}
                  className="sticky left-0 [z-index:4] w-[190px] shrink-0 box-border p-[9px_10px] bg-[#191919] border-0 border-r border-solid border-editor-border text-editor-text text-[10px] whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer"
                >
                  <span
                    className="inline-block w-[7px] h-[7px] mr-[7px] rounded-[2px]"
                    style={{
                      background: colorsByKind[lane.kind],
                    }}
                  />
                  {laneLabel(lane.kind)}
                  {lane.rows.length > 1 ? ` (${lane.rows.length})` : ""}
                </div>
                <div
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget)
                      beginMarquee(event);
                  }}
                  onDragOver={dragOverAudio}
                  onDragLeave={() => setDropFrame(null)}
                  onDrop={dropAudio}
                  className="relative shrink-0"
                  style={{
                    width: trackWidth,
                    backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${project.fps * pixelsPerFrame - 1}px, #292929 ${project.fps * pixelsPerFrame}px)`,
                  }}
                >
                  <span
                    className="absolute [z-index:2] top-0 bottom-0 [border-left:2px_dashed_#FF7024] pointer-events-none opacity-[0.75]"
                    style={{
                      left: sceneEnd * pixelsPerFrame,
                    }}
                  />
                  {lane.rows.map((row) => (
                    <Fragment key={row.id}>
                      <Clip
                        row={row}
                        max={max}
                        pixelsPerFrame={pixelsPerFrame}
                        snapTargets={snapTargetsFor(row.id)}
                        fps={project.fps}
                        selected={selectedObjectIds.includes(
                          qualifySelection(selectedSceneId, row.id),
                        )}
                        laneIndex={laneIndexOf(lane)}
                        laneCount={
                          lanes.filter(
                            (candidate) =>
                              (candidate.kind === "sound") ===
                              (lane.kind === "sound"),
                          ).length
                        }
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openInspector(row);
                          setContextTarget({
                            selectionId: qualifySelection(
                              selectedSceneId,
                              row.id,
                            ),
                            x: event.clientX,
                            y: event.clientY,
                          });
                        }}
                        onDragStart={beginHistoryTransaction}
                        onDragEnd={endHistoryTransaction}
                        onSelect={(additive) => openInspector(row, additive)}
                        beginGroupDrag={beginGroupDragFor(row.id)}
                      />
                      <KeyframeMarkers
                        row={row}
                        max={max}
                        pixelsPerFrame={pixelsPerFrame}
                        onDragStart={beginHistoryTransaction}
                        onDragEnd={endHistoryTransaction}
                        onSelect={() => openInspector(row)}
                      />
                    </Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {marquee ? (
        <div
          className="fixed [border:1px_solid_#FF7024] bg-[#FF702422] pointer-events-none [z-index:50]"
          style={{
            left: marquee.left,
            top: marquee.top,
            width: marquee.width,
            height: marquee.height,
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
}
