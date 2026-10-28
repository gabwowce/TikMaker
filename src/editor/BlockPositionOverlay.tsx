import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  Block,
  PositionedVisualEntry,
  RichHeadlineLine,
} from "../schema/scene";
import { VISUAL_POSITION_MAX, VISUAL_POSITION_MIN } from "../schema/capabilities";
import { safeAreaPercent } from "../video/typography/tokens";
import { useProjectStore } from "./state/projectStore";
import { objectIdOf, sceneIdOf } from "./timeline/selectionId";
const VISUAL_MARKER_ID = "__visual__";
const RICH_STACK_MARKER_ID = "__rich-stack__";
const RICH_LINE_MARKER_PREFIX = "__rich-line__";
type BlockPositionOverlayProps = {
  blocks: Block[];
  visuals: PositionedVisualEntry[];
  visualPosition?: {
    x: number;
    y: number;
  };
  richHeadline?: RichHeadlineLine[];
  richHeadlineX?: number;
  richHeadlineY?: number;
  width: number;
  height: number;
};
export function BlockPositionOverlay({
  blocks,
  visuals,
  visualPosition,
  richHeadline,
  richHeadlineX,
  richHeadlineY,
  width,
  height,
}: BlockPositionOverlayProps) {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
  const updateSceneVisualPosition = useProjectStore(
    (s) => s.updateSceneVisualPosition,
  );
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const updateSceneContent = useProjectStore((s) => s.updateSceneContent);
  const updateSceneRichHeadline = useProjectStore(
    (s) => s.updateSceneRichHeadline,
  );
  const beginHistoryTransaction = useProjectStore(
    (s) => s.beginHistoryTransaction,
  );
  const endHistoryTransaction = useProjectStore((s) => s.endHistoryTransaction);
  const lines = richHeadline ?? [];
  const freeLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.x !== undefined && line.y !== undefined);
  const stackPositioned =
    richHeadlineX !== undefined || richHeadlineY !== undefined;
  const selectObject = useProjectStore((s) => s.selectObject);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{
    x?: number;
    y?: number;
  }>({});
  const draggingIdRef = useRef<string | null>(null);
  // where the drag started: pointer (px) and the element's anchor (%)
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
  } | null>(null);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  useEffect(
    () => () => {
      if (draggingIdRef.current) {
        draggingIdRef.current = null;
        endHistoryTransaction();
      }
    },
    [endHistoryTransaction],
  );
  function clampPercent(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
  }
  const SNAP_PX = 7;
  function snapTo(
    value: number,
    targets: number[],
    sizePx: number,
  ): {
    value: number;
    hit?: number;
  } {
    if (sizePx <= 0) return { value };
    const tolerance = (SNAP_PX / sizePx) * 100;
    let best: number | undefined;
    let bestDistance = tolerance;
    for (const target of targets) {
      const distance = Math.abs(target - value);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = target;
      }
    }
    return best === undefined ? { value } : { value: best, hit: best };
  }
  function snapTargets(markerId: string): {
    x: number[];
    y: number[];
  } {
    const x = [50, safeAreaPercent.left, safeAreaPercent.right];
    const y = [50, safeAreaPercent.top, safeAreaPercent.bottom];
    for (const visual of visuals) {
      if (visual.id === markerId) continue;
      x.push(visual.x);
      y.push(visual.y);
    }
    for (const block of blocks) {
      if (block.id === markerId) continue;
      x.push(block.x);
      y.push(block.y);
    }
    for (const { line, index } of freeLines) {
      if (markerId === `${RICH_LINE_MARKER_PREFIX}${index}`) continue;
      if (line.x !== undefined) x.push(line.x);
      if (line.y !== undefined) y.push(line.y);
    }
    return { x, y };
  }
  // The marker (element anchor) the drag moves: the element selected in the
  // timeline. A text line that is not placed on its own moves the whole text.
  function selectedMarker(): { id: string; x: number; y: number } | null {
    if (!selectedObjectId) return null;
    // timeline ids look like "<scene id>::visual-<id>"; only this scene's count
    if (sceneIdOf(selectedObjectId, selectedSceneId) !== selectedSceneId) return null;
    const id = objectIdOf(selectedObjectId);
    if (id.startsWith("visual-")) {
      const visual = visuals.find((v) => `visual-${v.id}` === id);
      return visual ? { id: visual.id, x: visual.x, y: visual.y } : null;
    }
    if (id.startsWith("block-")) {
      const block = blocks.find((b) => `block-${b.id}` === id);
      return block ? { id: block.id, x: block.x, y: block.y } : null;
    }
    if (id.startsWith("line-")) {
      const free = freeLines.find(({ index }) => `line-${index}` === id);
      if (free)
        return {
          id: `${RICH_LINE_MARKER_PREFIX}${free.index}`,
          x: free.line.x!,
          y: free.line.y!,
        };
    }
    if ((id === "text-group" || id.startsWith("line-")) && lines.length > 0)
      return {
        id: RICH_STACK_MARKER_ID,
        x: richHeadlineX ?? 50,
        y: richHeadlineY ?? 50,
      };
    return null;
  }
  const marker = selectedMarker();
  function moveMarkerTo(markerId: string, percentX: number, percentY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !selectedSceneId) return;
    const targets = snapTargets(markerId);
    const snappedX = snapTo(percentX, targets.x, rect.width);
    const snappedY = snapTo(percentY, targets.y, rect.height);
    setGuides({ x: snappedX.hit, y: snappedY.hit });
    const rawX = snappedX.value;
    const rawY = snappedY.value;
    if (markerId === VISUAL_MARKER_ID) {
      updateSceneVisualPosition(selectedSceneId, {
        x: clampPercent(rawX),
        y: clampPercent(rawY),
      });
      return;
    }
    if (markerId === RICH_STACK_MARKER_ID) {
      updateSceneContent(selectedSceneId, {
        richHeadlineX: clampPercent(rawX),
        richHeadlineY: clampPercent(rawY),
      });
      return;
    }
    if (markerId.startsWith(RICH_LINE_MARKER_PREFIX)) {
      const lineIndex = Number(markerId.slice(RICH_LINE_MARKER_PREFIX.length));
      updateSceneRichHeadline(
        selectedSceneId,
        lines.map((line, index) =>
          index === lineIndex
            ? {
                ...line,
                x: clampPercent(rawX),
                y: clampPercent(rawY),
              }
            : line,
        ),
      );
      return;
    }
    if (visuals.some((visual) => visual.id === markerId)) {
      const x = clampPercent(rawX, VISUAL_POSITION_MIN, VISUAL_POSITION_MAX);
      const y = clampPercent(rawY, VISUAL_POSITION_MIN, VISUAL_POSITION_MAX);
      updateSceneVisuals(
        selectedSceneId,
        visuals.map((visual) =>
          visual.id === markerId ? { ...visual, x, y } : visual,
        ),
      );
      return;
    }
    const x = clampPercent(rawX);
    const y = clampPercent(rawY);
    updateSceneBlocks(
      selectedSceneId,
      blocks.map((block) =>
        block.id === markerId ? { ...block, x, y } : block,
      ),
    );
  }
  // Grab anywhere: the element moves by as much as the pointer moved, so it
  // does not jump to the pointer.
  function handlePointerDown(event: ReactPointerEvent) {
    if (!marker) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    beginHistoryTransaction();
    draggingIdRef.current = marker.id;
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: marker.x,
      y: marker.y,
    };
    setDraggingId(marker.id);
  }
  function handlePointerMove(event: ReactPointerEvent) {
    const markerId = draggingIdRef.current;
    const start = dragStartRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!markerId || !start || !rect) return;
    moveMarkerTo(
      markerId,
      start.x + ((event.clientX - start.pointerX) / rect.width) * 100,
      start.y + ((event.clientY - start.pointerY) / rect.height) * 100,
    );
  }
  function handlePointerUp() {
    if (!draggingIdRef.current) return;
    draggingIdRef.current = null;
    dragStartRef.current = null;
    setDraggingId(null);
    setGuides({});
    endHistoryTransaction();
  }
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        width,
        height,
      }}
    >
      {marker ? (
        // the drag area: the whole frame except the player controls at the bottom
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`absolute inset-x-0 top-0 bottom-16 pointer-events-auto [touch-action:none] ${draggingId ? "cursor-grabbing" : "cursor-grab"}`}
        />
      ) : null}
      {draggingId && guides.x !== undefined ? (
        <div
          className="absolute bg-editor-accent pointer-events-none [z-index:5] top-0 bottom-0 w-[1px]"
          style={{
            left: `${guides.x}%`,
          }}
        />
      ) : null}
      {draggingId && guides.y !== undefined ? (
        <div
          className="absolute bg-editor-accent pointer-events-none [z-index:5] left-0 right-0 h-[1px]"
          style={{
            top: `${guides.y}%`,
          }}
        />
      ) : null}
    </div>
  );
}
