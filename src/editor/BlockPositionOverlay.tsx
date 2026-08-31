import React, { useRef, useState } from "react";
import { editorColors } from "./theme";
import { useProjectStore } from "./state/projectStore";
import { safeAreaPercent } from "../video/typography/tokens";
import type { Block, PositionedVisualEntry, RichHeadlineLine } from "../schema/scene";

const VISUAL_MARKER_ID = "__visual__";
const RICH_STACK_MARKER_ID = "__rich-stack__";
const RICH_LINE_MARKER_PREFIX = "__rich-line__";

type BlockPositionOverlayProps = {
  blocks: Block[];
  visuals: PositionedVisualEntry[];
  visualPosition?: { x: number; y: number };
  richHeadline?: RichHeadlineLine[];
  richHeadlineX?: number;
  richHeadlineY?: number;
  width: number;
  height: number;
};

export const BlockPositionOverlay: React.FC<BlockPositionOverlayProps> = ({
  blocks,
  visuals,
  visualPosition,
  richHeadline,
  richHeadlineX,
  richHeadlineY,
  width,
  height,
}) => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
  const updateSceneVisualPosition = useProjectStore((s) => s.updateSceneVisualPosition);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const updateSceneContent = useProjectStore((s) => s.updateSceneContent);
  const updateSceneRichHeadline = useProjectStore((s) => s.updateSceneRichHeadline);
  const beginHistoryTransaction = useProjectStore((s) => s.beginHistoryTransaction);
  const endHistoryTransaction = useProjectStore((s) => s.endHistoryTransaction);

  const lines = richHeadline ?? [];
  const freeLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.x !== undefined && line.y !== undefined);
  const stackPositioned = richHeadlineX !== undefined || richHeadlineY !== undefined;
  const selectObject = useProjectStore((s) => s.selectObject);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  /** The snap lines currently being held, drawn while a drag is active. */
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const draggingIdRef = useRef<string | null>(null);

  React.useEffect(() => () => {
    if (draggingIdRef.current) {
      draggingIdRef.current = null;
      endHistoryTransaction();
    }
  }, [endHistoryTransaction]);

  function clampPercent(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Snapping, in percent of the canvas.
   *
   * Lining something up on the centre line by hand means landing on 50.0 with a
   * mouse, which nobody does — you end up at 49.7 and the frame reads as
   * slightly crooked without it being obvious why. The magnet is a few pixels
   * wide, converted from px so it feels the same at every preview zoom, and it
   * reports WHICH target it caught so the guide line can be drawn: a snap you
   * can't see is indistinguishable from a drag that jumped.
   */
  const SNAP_PX = 7;

  function snapTo(value: number, targets: number[], sizePx: number): { value: number; hit?: number } {
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

  /** Everything worth lining up against: the canvas centre, the safe-area
   * edges, and every OTHER element's own centre — the last one is what makes
   * two props sit on the same line as each other. */
  function snapTargets(markerId: string): { x: number[]; y: number[] } {
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
    const snappedX = snapTo(((clientX - rect.left) / rect.width) * 100, targets.x, rect.width);
    const snappedY = snapTo(((clientY - rect.top) / rect.height) * 100, targets.y, rect.height);
    setGuides({ x: snappedX.hit, y: snappedY.hit });
    const rawX = snappedX.value;
    const rawY = snappedY.value;

    if (markerId === VISUAL_MARKER_ID) {
      updateSceneVisualPosition(selectedSceneId, { x: clampPercent(rawX), y: clampPercent(rawY) });
      return;
    }
    if (markerId === RICH_STACK_MARKER_ID) {
      updateSceneContent(selectedSceneId, {
        richHeadlineX: clampPercent(rawX, safeAreaPercent.left, safeAreaPercent.right),
        richHeadlineY: clampPercent(rawY, safeAreaPercent.top, safeAreaPercent.bottom),
      });
      return;
    }
    if (markerId.startsWith(RICH_LINE_MARKER_PREFIX)) {
      const lineIndex = Number(markerId.slice(RICH_LINE_MARKER_PREFIX.length));
      updateSceneRichHeadline(selectedSceneId, lines.map((line, index) => index === lineIndex ? {
        ...line,
        x: clampPercent(rawX, safeAreaPercent.left, safeAreaPercent.right),
        y: clampPercent(rawY, safeAreaPercent.top, safeAreaPercent.bottom),
      } : line));
      return;
    }
    if (visuals.some((visual) => visual.id === markerId)) {
      const x = clampPercent(rawX);
      const y = clampPercent(rawY);
      updateSceneVisuals(selectedSceneId, visuals.map((visual) => visual.id === markerId ? { ...visual, x, y } : visual));
      return;
    }
    const x = clampPercent(rawX, safeAreaPercent.left, safeAreaPercent.right);
    const y = clampPercent(rawY, safeAreaPercent.top, safeAreaPercent.bottom);
    updateSceneBlocks(selectedSceneId, blocks.map((block) => block.id === markerId ? { ...block, x, y } : block));
  }

  function handlePointerDown(event: React.PointerEvent, markerId: string) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    beginHistoryTransaction();
    draggingIdRef.current = markerId;
    setDraggingId(markerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
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

  /** The hit target stays comfortably large, while only a tiny neutral dot is
   * painted over the video. It becomes clear only on hover or while dragging. */
  function DragHandle({ id, x, y }: { id: string; x: number; y: number }) {
    const active = draggingId === id;
    const hovered = hoveredId === id;
    const inspectorId = id === RICH_STACK_MARKER_ID
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
        onPointerLeave={() => setHoveredId((current) => current === id ? null : current)}
        style={{
          position: "absolute",
          left: `${x}%`,
          top: `${y}%`,
          transform: "translate(-50%, -50%)",
          width: 28,
          height: 28,
          display: "grid",
          placeItems: "center",
          cursor: active ? "grabbing" : "grab",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      >
        <span
          style={{
            width: active ? 12 : hovered ? 10 : 7,
            height: active ? 12 : hovered ? 10 : 7,
            borderRadius: "50%",
            boxSizing: "border-box",
            background: active ? "rgba(255,255,255,.92)" : hovered ? "rgba(255,255,255,.48)" : "rgba(255,255,255,.2)",
            border: `1px solid rgba(255,255,255,${active ? .95 : hovered ? .78 : .5})`,
            boxShadow: active ? "0 0 0 3px rgba(0,0,0,.32), 0 0 8px rgba(255,255,255,.38)" : "0 1px 4px rgba(0,0,0,.55)",
            opacity: active || hovered ? 1 : .62,
            transition: "all 100ms ease",
          }}
        />
      </div>
    );
  }

  if (blocks.length === 0 && visuals.length === 0 && !visualPosition && !stackPositioned && freeLines.length === 0) return null;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ position: "absolute", inset: 0, width, height, pointerEvents: draggingId ? "auto" : "none" }}
    >
      {visualPosition ? <DragHandle id={VISUAL_MARKER_ID} x={visualPosition.x} y={visualPosition.y} /> : null}
      {visuals.map((visual) => <DragHandle key={visual.id} id={visual.id} x={visual.x} y={visual.y} />)}
      {stackPositioned ? <DragHandle id={RICH_STACK_MARKER_ID} x={richHeadlineX ?? 50} y={richHeadlineY ?? 50} /> : null}
      {freeLines.map(({ line, index }) => (
        <DragHandle key={`${RICH_LINE_MARKER_PREFIX}${index}`} id={`${RICH_LINE_MARKER_PREFIX}${index}`} x={line.x!} y={line.y!} />
      ))}
      {blocks.map((block) => <DragHandle key={block.id} id={block.id} x={block.x} y={block.y} />)}

      {/* Drawn only while a drag is holding a snap, so the line means "you are
          locked to this", not "here is a grid". */}
      {draggingId && guides.x !== undefined ? (
        <div style={{ ...guideStyle, left: `${guides.x}%`, top: 0, bottom: 0, width: 1 }} />
      ) : null}
      {draggingId && guides.y !== undefined ? (
        <div style={{ ...guideStyle, top: `${guides.y}%`, left: 0, right: 0, height: 1 }} />
      ) : null}
    </div>
  );
};

const guideStyle: React.CSSProperties = {
  position: "absolute",
  background: editorColors.accent,
  pointerEvents: "none",
  zIndex: 5,
};
