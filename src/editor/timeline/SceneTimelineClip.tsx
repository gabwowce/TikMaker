import {
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { editorColors } from "../theme";
import { AnimationWindow } from "./AnimationWindow";
import { ClipPreview } from "./ClipPreview";
import {
  clamp,
  ROW_HEIGHT,
  snapFrame,
} from "./sceneTimelineLayout";
import { DragMode, TimelineRow, KIND_COLOR } from "./timelineRowTypes";

type ClipProps = {
  row: TimelineRow;
  max: number;
  pixelsPerFrame: number;
  snapTargets: number[];
  fps: number;
  selected: boolean;
  laneIndex: number;
  laneCount: number;
  onContextMenu: (event: ReactMouseEvent) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: (additive: boolean) => void;
  beginGroupDrag: (() => (delta: number) => void) | null;
};

export function Clip({
  row,
  max,
  pixelsPerFrame,
  snapTargets,
  selected,
  laneIndex,
  laneCount,
  onContextMenu,
  onDragStart,
  onDragEnd,
  onSelect,
  beginGroupDrag,
}: ClipProps) {
  const [laneShift, setLaneShift] = useState(0);
  const start = clamp(Math.round(row.start), 0, Math.max(0, max - 1));
  const end = clamp(Math.round(row.end), start + 1, max);
  function begin(event: ReactPointerEvent, mode: DragMode) {
    event.preventDefault();
    event.stopPropagation();
    const additive = event.ctrlKey || event.metaKey;
    const selectOnRelease = selected && !additive;
    if (!selectOnRelease) onSelect(additive);
    let moved = false;
    onDragStart();
    const originX = event.clientX;
    const originY = event.clientY;
    const originStart = start;
    const originEnd = end;
    const length = originEnd - originStart;
    const moveGroup = mode === "move" ? (beginGroupDrag?.() ?? null) : null;
    function move(pointer: PointerEvent) {
      if (
        !moved &&
        Math.abs(pointer.clientX - originX) +
          Math.abs(pointer.clientY - originY) <
          3
      )
        return;
      moved = true;
      if (mode === "move" && row.setLane) {
        const shift = Math.round((pointer.clientY - originY) / ROW_HEIGHT);
        setLaneShift(clamp(laneIndex + shift, 0, laneCount) - laneIndex);
      }
      const delta = (pointer.clientX - originX) / pixelsPerFrame;
      if (mode === "start") {
        const next = snapFrame(
          originStart + delta,
          snapTargets,
          pixelsPerFrame,
        );
        row.set?.(clamp(next, row.trimMin ?? 0, originEnd - 1), originEnd);
      } else if (mode === "end") {
        const next = snapFrame(originEnd + delta, snapTargets, pixelsPerFrame);
        row.set?.(
          originStart,
          clamp(next, originStart + 1, row.trimEndMax ?? max),
        );
      } else {
        const rawStart = originStart + delta;
        const snappedStart = snapFrame(rawStart, snapTargets, pixelsPerFrame);
        const snappedEnd =
          snapFrame(rawStart + length, snapTargets, pixelsPerFrame) - length;
        const nextStart =
          Math.abs(snappedStart - rawStart) <= Math.abs(snappedEnd - rawStart)
            ? snappedStart
            : snappedEnd;
        const start = clamp(nextStart, 0, max - length);
        if (moveGroup) moveGroup(start - originStart);
        else row.set?.(start, start + length);
      }
    }
    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setLaneShift((shift) => {
        if (shift !== 0) row.setLane?.(laneIndex + shift);
        return 0;
      });
      if (selectOnRelease && !moved) onSelect(false);
      onDragEnd();
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  return (
    <div
      data-timeline-object={row.id}
      onPointerDown={(event) => begin(event, "move")}
      onContextMenu={onContextMenu}
      className={`absolute rounded-[5px] text-white cursor-grab select-none overflow-hidden box-border ${laneShift !== 0 ? "[z-index:6]" : selected ? "[z-index:2]" : "[z-index:1]"} ${laneShift !== 0 ? "opacity-[0.9]" : "opacity-[1]"}`}
      style={{
        left: start * pixelsPerFrame,
        top: 4 + laneShift * ROW_HEIGHT,
        width: Math.max(10, (end - start) * pixelsPerFrame),
        height: ROW_HEIGHT - 8,
        border: selected
          ? `2px solid ${editorColors.accent}`
          : `1px solid ${KIND_COLOR[row.kind]}`,
        background: selected
          ? `${KIND_COLOR[row.kind]}99`
          : `${KIND_COLOR[row.kind]}44`,
        boxShadow: selected
          ? `0 0 0 1px rgba(0,0,0,0.6), 0 2px 10px ${editorColors.accent}55`
          : undefined,
      }}
    >
      {!row.point ? (
        <div
          onPointerDown={(event) => begin(event, "start")}
          className="absolute [z-index:2] top-0 bottom-0 w-[7px] bg-[rgba(255,255,255,0.8)] cursor-ew-resize left-0"
        />
      ) : null}
      {row.preview?.src ? <ClipPreview preview={row.preview} /> : null}
      {row.waveform ? (
        <div className="absolute inset-[4px_8px] flex items-center gap-[1px] opacity-[0.9] pointer-events-none">
          {row.waveform.map((peak, index) => (
            <i
              key={index}
              className="flex-1 min-w-[1px] bg-[#38bdf8] rounded-[1px]"
              style={{
                height: `${Math.max(8, peak * 100)}%`,
              }}
            />
          ))}
        </div>
      ) : null}
      {!row.point && row.entranceDuration ? (
        <AnimationWindow
          side="in"
          frames={row.entranceDuration}
          clipFrames={end - start}
          pixelsPerFrame={pixelsPerFrame}
          onChange={row.setEntranceDuration}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ) : null}
      {!row.point && row.exitDuration ? (
        <AnimationWindow
          side="out"
          frames={row.exitDuration}
          clipFrames={end - start}
          pixelsPerFrame={pixelsPerFrame}
          onChange={row.setExitDuration}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ) : null}
      <div className="p-[5px_12px] text-[10px] whitespace-nowrap overflow-hidden text-ellipsis">
        {row.point ? "♪ " : ""}
        {row.label}
      </div>
      {!row.point ? (
        <div
          onPointerDown={(event) => begin(event, "end")}
          className="absolute [z-index:2] top-0 bottom-0 w-[7px] bg-[rgba(255,255,255,0.8)] cursor-ew-resize right-0"
        />
      ) : null}
    </div>
  );
}

type KeyframeMarkersProps = {
  row: TimelineRow;
  max: number;
  pixelsPerFrame: number;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: () => void;
};

export function KeyframeMarkers({
  row,
  max,
  pixelsPerFrame,
  onDragStart,
  onDragEnd,
  onSelect,
}: KeyframeMarkersProps) {
  if (!row.keyframes?.length || !row.moveKeyframe) return null;
  const move = row.moveKeyframe;
  function begin(event: ReactPointerEvent, keyframeId: string, from: number) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onDragStart();
    const originX = event.clientX;
    function onMove(pointer: PointerEvent) {
      move(
        keyframeId,
        clamp(
          from + Math.round((pointer.clientX - originX) / pixelsPerFrame),
          0,
          max,
        ),
      );
    }
    function finish() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      onDragEnd();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  return (
    <>
      {row.keyframes.map((keyframe) => {
        const both = keyframe.position && keyframe.scale;
        const color = both
          ? "#a855f7"
          : keyframe.scale
            ? "#38bdf8"
            : editorColors.accent;

        const offset = both ? 0 : keyframe.scale ? 5 : -5;
        return (
          <div
            key={keyframe.id}
            onPointerDown={(event) => begin(event, keyframe.id, keyframe.frame)}
            className="absolute w-2.5 h-2.5 [transform:rotate(45deg)] [border:1px_solid_#111] rounded-[2px] cursor-ew-resize [z-index:3]"
            style={{
              left: keyframe.frame * pixelsPerFrame - 5,
              top: ROW_HEIGHT / 2 - 5 + offset,
              background: color,
            }}
          />
        );
      })}
    </>
  );
}
