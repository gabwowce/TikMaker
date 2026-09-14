import { snapFrame } from "./sceneTimelineLayout";
import {
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import { AnimationWindow } from "./AnimationWindow";
import { ClipPreview } from "./ClipPreview";
import { clamp, ROW_HEIGHT } from "./fullTimelineLayout";
import { Row } from "./fullTimelineTypes";

type GlobalClipProps = {
  row: Row;
  total: number;
  fps: number;
  ppf: number;
  laneIndex: number;
  laneCount: number;
  selected: boolean;
  snapTargets: number[];
  selectionId: string | null;
  beginGroupDrag: (() => (delta: number) => void) | null;
  onOpen: (additive: boolean) => void;
  onContextMenu: (event: ReactMouseEvent) => void;
};

export function GlobalClip({
  row,
  total,
  ppf,
  laneIndex,
  laneCount,
  selected,
  snapTargets,
  selectionId,
  beginGroupDrag,
  onOpen,
  onContextMenu,
}: GlobalClipProps) {
  const beginHistoryTransaction = useProjectStore(
    (state) => state.beginHistoryTransaction,
  );
  const endHistoryTransaction = useProjectStore(
    (state) => state.endHistoryTransaction,
  );
  const [laneShift, setLaneShift] = useState(0);
  const min = row.min ?? 0;
  const max = row.max ?? total;
  const start = clamp(Math.round(row.start), min, Math.max(min, max - 1));
  const end = clamp(Math.round(row.end), start + 1, max);
  function snap(value: number) {
    return snapFrame(value, snapTargets, ppf);
  }
  function drag(event: ReactPointerEvent, edge: "move" | "start" | "end") {
    event.preventDefault();
    event.stopPropagation();
    const additive = event.ctrlKey || event.metaKey;
    const selectOnRelease = selected && !additive;
    if (!selectOnRelease) onOpen(additive);
    if (
      !row.set ||
      (edge === "move" && row.movable === false) ||
      (edge === "start" && row.trimStart === false)
    )
      return;
    beginHistoryTransaction();
    const originX = event.clientX;
    const originY = event.clientY;
    const length = end - start;
    const moveGroup = edge === "move" ? (beginGroupDrag?.() ?? null) : null;
    let moved = false;
    function move(pointer: PointerEvent) {
      if (
        !moved &&
        Math.abs(pointer.clientX - originX) +
          Math.abs(pointer.clientY - originY) <
          3
      )
        return;
      moved = true;
      if (edge === "move" && row.setLane) {
        const shift = Math.round((pointer.clientY - originY) / ROW_HEIGHT);
        setLaneShift(
          clamp(laneIndex + shift, 0, Math.max(0, laneCount - 1)) - laneIndex,
        );
      }
      const delta = (pointer.clientX - originX) / ppf;
      if (edge === "start")
        row.set?.(clamp(snap(start + delta), row.trimMin ?? min, end - 1), end);
      else if (edge === "end")
        row.set?.(
          start,
          clamp(snap(end + delta), start + 1, row.trimEndMax ?? max),
        );
      else {
        const next = clamp(snap(start + delta), min, max - length);
        if (moveGroup) moveGroup(next - start);
        else row.set?.(next, next + length);
      }
    }
    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      setLaneShift((shift) => {
        if (shift) row.setLane?.(laneIndex + shift);
        return 0;
      });
      if (selectOnRelease && !moved) onOpen(false);
      endHistoryTransaction();
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  return (
    <div
      data-timeline-object={selectionId ?? undefined}
      onPointerDown={(event) => drag(event, "move")}
      onContextMenu={onContextMenu}
      className={`absolute rounded text-white text-[10px] box-border overflow-hidden whitespace-nowrap select-none ${row.movable === false ? "cursor-pointer" : "cursor-grab"} ${laneShift ? "[z-index:10]" : selected ? "[z-index:3]" : "[z-index:1]"}`}
      style={{
        left: start * ppf,
        top: 4 + laneShift * ROW_HEIGHT,
        width: Math.max(row.point ? 20 : 12, (end - start) * ppf),
        height: ROW_HEIGHT - 8,
        border: selected
          ? `2px solid ${editorColors.accent}`
          : `1px solid ${row.color}`,
        background:
          row.kind === "scene"
            ? `repeating-linear-gradient(90deg, ${row.color}66 0 20px, ${row.color}88 20px 40px)`
            : `${row.color}55`,
        boxShadow: selected
          ? `0 0 0 1px #000, 0 0 10px ${editorColors.accent}66`
          : undefined,
      }}
    >
      {!row.point && row.trimStart !== false ? (
        <span
          onPointerDown={(event) => drag(event, "start")}
          className="absolute [z-index:4] top-0 bottom-0 w-[7px] bg-[rgba(255,255,255,.9)] cursor-ew-resize left-0"
        />
      ) : null}
      {row.preview?.src ? <ClipPreview preview={row.preview} /> : null}
      {row.waveform ? <Waveform peaks={row.waveform} /> : null}
      {row.entranceDuration ? (
        <AnimationWindow
          side="in"
          frames={row.entranceDuration}
          clipFrames={end - start}
          pixelsPerFrame={ppf}
          onChange={row.setEntranceDuration}
          onDragStart={beginHistoryTransaction}
          onDragEnd={endHistoryTransaction}
        />
      ) : null}
      {row.exitDuration ? (
        <AnimationWindow
          side="out"
          frames={row.exitDuration}
          clipFrames={end - start}
          pixelsPerFrame={ppf}
          onChange={row.setExitDuration}
          onDragStart={beginHistoryTransaction}
          onDragEnd={endHistoryTransaction}
        />
      ) : null}
      <span className="relative [z-index:2] block p-[6px_11px] overflow-hidden text-ellipsis">
        {row.point ? "♪ " : ""}
        {row.label}
      </span>
      {!row.point && row.set ? (
        <span
          onPointerDown={(event) => drag(event, "end")}
          className="absolute [z-index:4] top-0 bottom-0 w-[7px] bg-[rgba(255,255,255,.9)] cursor-ew-resize right-0"
        />
      ) : null}
    </div>
  );
}

type WaveformProps = {
  peaks: number[];
};

function Waveform({ peaks }: WaveformProps) {
  return (
    <div className="absolute inset-[4px_8px] flex items-center gap-[1px] opacity-[0.9] pointer-events-none">
      {peaks.map((peak, index) => (
        <i
          key={index}
          className="flex-1 min-w-[1px] bg-[#38bdf8] rounded-[1px]"
          style={{
            height: `${Math.max(8, peak * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}
