import { groupDragPositions } from "./groupDrag";
import { Button, Slider } from "@mantine/core";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getSfx } from "../../registries/sfxRegistry";
import {
  computeSceneTimings,
  projectDurationInFrames,
} from "../../utils/duration";
import { formatTimecode } from "../../utils/timecode";
import {
  resolveEntranceSfx,
  resolveExitSfx,
} from "../../video/motion/sfxDefaults";
import { useCustomAssetsStore } from "../state/customAssetsStore";
import { useProjectStore } from "../state/projectStore";
import { isAudioDrag, readAudioDragPayload } from "./audioDrag";
import { buildFullTimelineRows } from "./buildFullTimelineRows";
import { GlobalClip } from "./FullTimelineClip";
import {
  KIND_COLOR,
  KIND_LABEL,
  LABEL,
  MAX_ZOOM,
  MIN_ZOOM,
  buildTracks,
  clamp,
} from "./fullTimelineLayout";
import { Row } from "./fullTimelineTypes";
import { applyTimelineObjectPositions } from "./moveTimelineObjects";
import {
  clipboardHas,
  copyTimelineObjects,
  duplicateTimelineObjects,
  pasteTimelineObjects,
} from "./objectClipboard";
import { qualifySelection } from "./selectionId";
import { TimelineContextMenu, type ContextTarget } from "./TimelineContextMenu";
import { useAudioWaveforms } from "./useAudioWaveforms";
import { useTimelineWheelZoom } from "./useTimelineWheelZoom";

type FullVideoTimelineProps = {
  currentFrame: number;
  onSeek: (frame: number) => void;
  onSceneMode: () => void;
};

export function FullVideoTimeline({
  currentFrame,
  onSeek,
  onSceneMode,
}: FullVideoTimelineProps) {
  const [ppf, setPpf] = useState(1.5);
  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(
    null,
  );
  const [clipboardReady, setClipboardReady] = useState(clipboardHas);
  const rulerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const customAssets = useCustomAssetsStore((state) => state.assets);
  const loadCustomAssets = useCustomAssetsStore((state) => state.load);
  const project = useProjectStore((state) => state.project);
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId);
  const selectedObjectId = useProjectStore((state) => state.selectedObjectId);
  const selectedObjectIds = useProjectStore((state) => state.selectedObjectIds);
  const selectObjects = useProjectStore((state) => state.selectObjects);
  const toggleObjectSelection = useProjectStore(
    (state) => state.toggleObjectSelection,
  );
  const selectScene = useProjectStore((state) => state.selectScene);
  const selectObject = useProjectStore((state) => state.selectObject);
  const updateScene = useProjectStore((state) => state.updateScene);

  const updateAudioClip = useProjectStore((state) => state.updateAudioClip);
  const addAudioClip = useProjectStore((state) => state.addAudioClip);
  const splitAudioClip = useProjectStore((state) => state.splitAudioClip);
  const beginHistoryTransaction = useProjectStore(
    (state) => state.beginHistoryTransaction,
  );
  const endHistoryTransaction = useProjectStore(
    (state) => state.endHistoryTransaction,
  );
  useEffect(() => {
    loadCustomAssets();
  }, [loadCustomAssets]);
  useTimelineWheelZoom(viewportRef, LABEL, ppf, setPpf, MIN_ZOOM, MAX_ZOOM);
  const timings = computeSceneTimings(project);

  const total = Math.max(1, projectDurationInFrames(project));
  const editHorizon = total + project.fps * 60;
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

  const rows = buildFullTimelineRows(
    project,
    editHorizon,
    customAssets,
    audioWaveforms,
  );
  const tracks = buildTracks(rows);
  const width = Math.max(900, total * ppf);
  function seek(clientX: number) {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (rect)
      onSeek(clamp(Math.round((clientX - rect.left) / ppf), 0, total - 1));
  }
  function dragPlayhead(event: ReactPointerEvent) {
    event.preventDefault();
    seek(event.clientX);
    function move(pointer: PointerEvent) {
      return seek(pointer.clientX);
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }
  function beginGroupDragFor(rowSelectionId: string | null) {
    if (
      !rowSelectionId ||
      selectedObjectIds.length < 2 ||
      !selectedObjectIds.includes(rowSelectionId)
    )
      return null;
    return () => {
      const origins = rows
        .filter(
          (row) =>
            row.objectId &&
            selectedObjectIds.includes(
              qualifySelection(row.sceneId, row.objectId),
            ),
        )
        .map((row) => ({
          id: qualifySelection(row.sceneId, row.objectId!),
          start: Math.round(row.start),
          end: Math.round(row.end),
          offset: row.objectId!.includes("audio-clip-")
            ? 0
            : (timings.find((timing) => timing.scene.id === row.sceneId)
                ?.from ?? 0),
        }));
      return (delta: number) => {
        applyTimelineObjectPositions(groupDragPositions(origins, delta));
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
        if (overlaps && id) hits.push(id);
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
      onSeek(clamp(Math.round((pointer.clientX - rect.left) / ppf), 0, total));
      if (!additive) selectObject(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  const [dropFrame, setDropFrame] = useState<number | null>(null);
  function dragOverAudio(event: ReactDragEvent<HTMLElement>) {
    if (!isAudioDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const rect = event.currentTarget.getBoundingClientRect();
    setDropFrame(
      clamp(Math.round((event.clientX - rect.left) / ppf), 0, total),
    );
  }
  function dropAudio(event: ReactDragEvent<HTMLElement>) {
    const payload = readAudioDragPayload(event);
    if (!payload) return;
    event.preventDefault();
    setDropFrame(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const at = clamp(Math.round((event.clientX - rect.left) / ppf), 0, total);
    beginHistoryTransaction();
    addAudioClip(payload.sfxId, at);
    const clips = useProjectStore.getState().project.audioClips ?? [];
    const inserted = clips[clips.length - 1];
    if (inserted) {
      if (payload.cut) updateAudioClip(inserted.id, payload.cut);
      selectObject(`audio-clip-${inserted.id}`);
    }
    endHistoryTransaction();
  }
  function open(row: Row, additive = false) {
    const id = row.objectId
      ? qualifySelection(row.sceneId, row.objectId)
      : null;
    if (!additive && row.sceneId && row.sceneId !== selectedSceneId)
      selectScene(row.sceneId);
    if (id) {
      if (additive) toggleObjectSelection(id);
      else selectObject(id);
    } else if (row.sceneId) onSeek(row.start);
  }
  function snapTargets(row: Row) {
    return [
      0,
      total,
      currentFrame,
      ...timings.flatMap((timing) => [
        timing.from,
        timing.from + timing.durationInFrames,
      ]),
      ...rows
        .filter((entry) => entry.id !== row.id)
        .flatMap((entry) => [entry.start, entry.end]),
    ];
  }
  function fit() {
    return setPpf(
      clamp(
        Math.max(320, (viewportRef.current?.clientWidth ?? 1000) - LABEL - 24) /
          total,
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    );
  }
  const playheadTiming =
    timings.find(
      (timing) =>
        currentFrame >= timing.from &&
        currentFrame < timing.from + timing.durationInFrames,
    ) ?? timings.find((timing) => timing.scene.id === selectedSceneId);
  const localPlayhead = Math.max(0, currentFrame - (playheadTiming?.from ?? 0));
  const selectedAudioId = selectedObjectId?.startsWith("audio-clip-")
    ? selectedObjectId.slice(11)
    : null;
  const selectedAudio = selectedAudioId
    ? (project.audioClips ?? []).find((clip) => clip.id === selectedAudioId)
    : undefined;
  const selectedAudioRow = selectedAudio
    ? rows.find((row) => row.id === selectedAudio.id)
    : undefined;
  const selectedSoundRow = rows.find(
    (row) =>
      row.kind === "sound" &&
      row.objectId &&
      qualifySelection(row.sceneId, row.objectId) === selectedObjectId &&
      row.waveform,
  );
  const playheadInsideSound = Boolean(
    selectedSoundRow &&
    currentFrame > selectedSoundRow.start &&
    currentFrame < selectedSoundRow.end,
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
    selectedSoundRow.set?.(currentFrame, selectedSoundRow.end);
  }
  function trimSelectedAudioRight() {
    if (!selectedSoundRow || !playheadInsideSound) return;
    selectedSoundRow.set?.(selectedSoundRow.start, currentFrame);
  }
  function copySelected() {
    if (copyTimelineObjects(selectedObjectIds)) setClipboardReady(true);
  }
  function pasteAtPlayhead() {
    if (playheadTiming && playheadTiming.scene.id !== selectedSceneId)
      selectScene(playheadTiming.scene.id);
    const pasted = pasteTimelineObjects(localPlayhead);
    if (pasted.length) selectObjects(pasted);
  }
  function duplicateSelected() {
    if (playheadTiming && playheadTiming.scene.id !== selectedSceneId)
      selectScene(playheadTiming.scene.id);
    const pasted = duplicateTimelineObjects(selectedObjectIds, localPlayhead);
    if (pasted.length) selectObjects(pasted);
  }
  function resetSceneGuides() {
    beginHistoryTransaction();
    for (const scene of project.scenes)
      updateScene(scene.id, { timelineRange: undefined });
    endHistoryTransaction();
  }
  return (
    <div className="shrink-0 border-0 border-t border-solid border-editor-border bg-[#151515]">
      <div className="h-10 p-[0_12px] flex items-center gap-2 overflow-x-auto whitespace-nowrap [&_button]:shrink-0 [&_.mantine-NativeSelect-root]:shrink-0 border-0 border-b border-solid border-editor-border text-editor-text">
        <Button variant="default" onClick={onSceneMode}>
          Scene
        </Button>
        <Button variant="default">Full video</Button>
        <span className="text-[10px] text-editor-muted">
          {(total / project.fps).toFixed(1)} s · {rows.length} objects
        </span>
        <Button
          variant="default"
          onClick={resetSceneGuides}
          aria-label="Reset scene guides to automatic sequential order; the video stays the same"
        >
          Reset scene guides
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
          |← Trim left
        </Button>
        <Button
          variant="default"
          disabled={!selectedAudio || !playheadInsideSound}
          onClick={splitSelectedAudio}
          aria-label="Split the audio clip at the playhead"
        >
          ✂ Split
        </Button>
        <Button
          variant="default"
          disabled={!playheadInsideSound}
          onClick={trimSelectedAudioRight}
          aria-label="Trim the end of the clip to the playhead"
        >
          Trim right →|
        </Button>
        <div className="flex-1" />
        <span>−</span>
        <Slider
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.15}
          value={ppf}
          onChange={(value) => setPpf(Number(value))}
          className="w-[120px]"
        />
        <span>+</span>
        <Button variant="default" onClick={fit}>
          Fit
        </Button>
        <span className="min-w-21 text-editor-accent text-[10px] [font-family:ui-monospace,_monospace]">
          {formatTimecode(currentFrame, project.fps)}
        </span>
      </div>
      <div ref={viewportRef} className="h-[330px] overflow-auto">
        <div
          className="relative min-w-full"
          style={{
            width: LABEL + width,
          }}
        >
          <div
            ref={rulerRef}
            onPointerDown={dragPlayhead}
            className={`sticky top-0 [z-index:20] ml-[170px] h-[27px] bg-[#181818] cursor-ew-resize [border-bottom:1px_solid_#2c2c2c]`}
            style={{
              width,
            }}
          >
            {Array.from(
              { length: Math.floor(total / project.fps) + 1 },
              (_, index) => (
                <span
                  key={index}
                  className="absolute top-1 h-5.5 text-[9px] text-editor-muted [border-left:1px_solid_#555] pl-1"
                  style={{
                    left: index * project.fps * ppf,
                  }}
                >
                  {index}s
                </span>
              ),
            )}
          </div>
          <div
            onPointerDown={dragPlayhead}
            className="absolute [z-index:18] top-5 bottom-0 w-[3px] ml-[-1px] [background:white] cursor-ew-resize"
            style={{
              left: LABEL + currentFrame * ppf,
            }}
          >
            <span className="absolute left-[-4px] w-[11px] h-[11px] [background:white] [transform:rotate(45deg)]" />
          </div>
          {tracks.map((track) => {
            const sameKind = tracks.filter(
              (entry) => entry.kind === track.kind,
            );
            const label = `${KIND_LABEL[track.kind]} ${track.lane + 1}`;
            return (
              <div
                key={`${track.kind}-${track.lane}`}
                className="h-9.5 flex [border-bottom:1px_solid_#292929]"
              >
                <div
                  className={`sticky left-0 [z-index:12] w-[170px] shrink-0 p-[11px_10px] box-border border-0 border-r border-solid border-editor-border text-[10px] ${track.rows.length ? "bg-[#191919]" : "bg-[#171717]"} ${track.rows.length ? "text-editor-text" : "text-editor-muted"}`}
                >
                  <i
                    className="inline-block w-[7px] h-[7px] rounded-[2px] mr-[7px]"
                    style={{
                      background: KIND_COLOR[track.kind],
                    }}
                  />
                  {track.rows.length
                    ? label
                    : `+ new ${KIND_LABEL[track.kind].toLowerCase()} track`}
                </div>
                <div
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget)
                      beginMarquee(event);
                  }}
                  onDragOver={dragOverAudio}
                  onDragLeave={() => setDropFrame(null)}
                  onDrop={dropAudio}
                  className={`relative shrink-0`}
                  style={{
                    width,
                    backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent ${Math.max(1, project.fps * ppf - 1)}px, #292929 ${project.fps * ppf}px)`,
                  }}
                >
                  {timings.slice(1).map((timing) => (
                    <span
                      key={timing.scene.id}
                      className="absolute [z-index:0] top-0 bottom-0 [border-left:1px_dashed_#555]"
                      style={{
                        left: timing.from * ppf,
                      }}
                    />
                  ))}
                  {track.rows.map((row) => {
                    const rowSelectionId = row.objectId
                      ? qualifySelection(row.sceneId, row.objectId)
                      : null;
                    return (
                      <GlobalClip
                        key={row.id}
                        row={row}
                        total={total}
                        fps={project.fps}
                        ppf={ppf}
                        laneIndex={sameKind.indexOf(track)}
                        laneCount={sameKind.length}
                        selectionId={rowSelectionId}
                        beginGroupDrag={beginGroupDragFor(rowSelectionId)}
                        selected={Boolean(
                          row.objectId &&
                          selectedObjectIds.includes(
                            qualifySelection(row.sceneId, row.objectId),
                          ),
                        )}
                        snapTargets={snapTargets(row)}
                        onOpen={(additive) => open(row, additive)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          open(row);
                          if (rowSelectionId)
                            setContextTarget({
                              selectionId: rowSelectionId,
                              x: event.clientX,
                              y: event.clientY,
                            });
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {dropFrame !== null ? (
        <div
          className="absolute [z-index:30] top-16.5 bottom-0 w-0.5 bg-[#38bdf8] pointer-events-none"
          style={{
            left: LABEL + dropFrame * ppf,
          }}
        />
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
          playheadLocalFrame={localPlayhead}
          onClose={() => setContextTarget(null)}
          onSelect={selectObject}
        />
      ) : null}
    </div>
  );
}
