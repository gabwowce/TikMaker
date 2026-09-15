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
import { safeAreaPercent } from "../video/typography/tokens";
import { useProjectStore } from "./state/projectStore";
const RICH_STACK_MARKER_ID = "__rich-stack__";
const RICH_LINE_MARKER_PREFIX = "__rich-line__";
type BlockPositionOverlayProps = {
  blocks: Block[];
  visuals: PositionedVisualEntry[];
  richHeadline?: RichHeadlineLine[];
  richHeadlineX?: number;
  richHeadlineY?: number;
  width: number;
  height: number;
};
export function BlockPositionOverlay({
  blocks,
  visuals,
  richHeadline,
  richHeadlineX,
  richHeadlineY,
  width,
  height,
}: BlockPositionOverlayProps) {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{
    x?: number;
    y?: number;
  }>({});
  const draggingIdRef = useRef<string | null>(null);
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
  function moveMarkerTo(markerId: string, clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !selectedSceneId) return;
    const targets = snapTargets(markerId);
    const snappedX = snapTo(
      ((clientX - rect.left) / rect.width) * 100,
      targets.x,
      rect.width,
    );
    const snappedY = snapTo(
      ((clientY - rect.top) / rect.height) * 100,
      targets.y,
      rect.height,
    );
    setGuides({ x: snappedX.hit, y: snappedY.hit });
    const rawX = snappedX.value;
    const rawY = snappedY.value;
    if (markerId === RICH_STACK_MARKER_ID) {
      updateSceneContent(selectedSceneId, {
        richHeadlineX: clampPercent(
          rawX,
          safeAreaPercent.left,
          safeAreaPercent.right,
        ),
        richHeadlineY: clampPercent(
          rawY,
          safeAreaPercent.top,
          safeAreaPercent.bottom,
        ),
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
                x: clampPercent(
                  rawX,
                  safeAreaPercent.left,
                  safeAreaPercent.right,
                ),
                y: clampPercent(
                  rawY,
                  safeAreaPercent.top,
                  safeAreaPercent.bottom,
                ),
              }
            : line,
        ),
      );
      return;
    }
    if (visuals.some((visual) => visual.id === markerId)) {
      const x = clampPercent(rawX);
      const y = clampPercent(rawY);
      updateSceneVisuals(
        selectedSceneId,
        visuals.map((visual) =>
          visual.id === markerId ? { ...visual, x, y } : visual,
        ),
      );
      return;
    }
    const x = clampPercent(rawX, safeAreaPercent.left, safeAreaPercent.right);
    const y = clampPercent(rawY, safeAreaPercent.top, safeAreaPercent.bottom);
    updateSceneBlocks(
      selectedSceneId,
      blocks.map((block) =>
        block.id === markerId ? { ...block, x, y } : block,
      ),
    );
  }
  function handlePointerDown(event: ReactPointerEvent, markerId: string) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    beginHistoryTransaction();
    draggingIdRef.current = markerId;
    setDraggingId(markerId);
  }
  function handlePointerMove(event: ReactPointerEvent) {
    const markerId = draggingIdRef.current;
    if (markerId) moveMarkerTo(markerId, event.clientX, event.clientY);
  }
  function handlePointerUp() {
    if (!draggingIdRef.current) return;
    draggingIdRef.current = null;
    setDraggingId(null);
    setGuides({});
    endHistoryTransaction();
  }
  function DragHandle({ id, x, y }: { id: string; x: number; y: number }) {
    const active = draggingId === id;
    const hovered = hoveredId === id;
    const inspectorId =
      id === RICH_STACK_MARKER_ID
        ? "text-group"
        : id.startsWith(RICH_LINE_MARKER_PREFIX)
          ? `line-${id.slice(RICH_LINE_MARKER_PREFIX.length)}`
          : visuals.some((visual) => visual.id === id)
            ? `visual-${id}`
            : blocks.some((block) => block.id === id)
              ? `block-${id}`
              : null;
    return (
      <div
        onPointerDown={(event) => {
          if (inspectorId) selectObject(inspectorId);
          handlePointerDown(event, id);
        }}
        onPointerEnter={() => setHoveredId(id)}
        onPointerLeave={() =>
          setHoveredId((current) => (current === id ? null : current))
        }
        className={`absolute [transform:translate(-50%,_-50%)] w-7 h-7 grid place-items-center pointer-events-auto [touch-action:none] ${active ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          left: `${x}%`,
          top: `${y}%`,
        }}
      >
        <span
          className={`rounded-[50%] box-border [transition:all_100ms_ease] ${active ? "w-3" : hovered ? "w-2.5" : "w-[7px]"} ${active ? "h-3" : hovered ? "h-2.5" : "h-[7px]"} ${active ? "bg-[rgba(255,255,255,.92)]" : hovered ? "bg-[rgba(255,255,255,.48)]" : "bg-[rgba(255,255,255,.2)]"} ${active ? "[box-shadow:0_0_0_3px_rgba(0,0,0,.32),_0_0_8px_rgba(255,255,255,.38)]" : "[box-shadow:0_1px_4px_rgba(0,0,0,.55)]"} ${active || hovered ? "opacity-[1]" : "opacity-[0.62]"}`}
          style={{
            border: `1px solid rgba(255,255,255,${active ? 0.95 : hovered ? 0.78 : 0.5})`,
          }}
        />
      </div>
    );
  }
  if (
    blocks.length === 0 &&
    visuals.length === 0 &&
    !stackPositioned &&
    freeLines.length === 0
  )
    return null;
  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute inset-0 ${draggingId ? "pointer-events-auto" : "pointer-events-none"}`}
      style={{
        width,
        height,
      }}
    >
      {visuals.map((visual) => (
        <DragHandle key={visual.id} id={visual.id} x={visual.x} y={visual.y} />
      ))}
      {stackPositioned ? (
        <DragHandle
          id={RICH_STACK_MARKER_ID}
          x={richHeadlineX ?? 50}
          y={richHeadlineY ?? 50}
        />
      ) : null}
      {freeLines.map(({ line, index }) => (
        <DragHandle
          key={`${RICH_LINE_MARKER_PREFIX}${index}`}
          id={`${RICH_LINE_MARKER_PREFIX}${index}`}
          x={line.x!}
          y={line.y!}
        />
      ))}
      {blocks.map((block) => (
        <DragHandle key={block.id} id={block.id} x={block.x} y={block.y} />
      ))}

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
