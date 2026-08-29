import React, { useRef, useState } from "react";
import { useProjectStore } from "./state/projectStore";
import { editorColors } from "./theme";
import { safeAreaPercent } from "../video/typography/tokens";
import type { Block, PositionedVisualEntry } from "../schema/scene";

const VISUAL_MARKER_ID = "__visual__";

type BlockPositionOverlayProps = {
  blocks: Block[];
  visuals: PositionedVisualEntry[];
  visualPosition?: { x: number; y: number };
  width: number;
  height: number;
};

export const BlockPositionOverlay: React.FC<BlockPositionOverlayProps> = ({
  blocks,
  visuals,
  visualPosition,
  width,
  height,
}) => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
  const updateSceneVisualPosition = useProjectStore((s) => s.updateSceneVisualPosition);
  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  function clampPercent(value: number, min = 0, max = 100): number {
    return Math.max(min, Math.min(max, value));
  }

  function moveMarkerTo(markerId: string, clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !selectedSceneId) return;

    const rawX = ((clientX - rect.left) / rect.width) * 100;
    const rawY = ((clientY - rect.top) / rect.height) * 100;

    if (markerId === VISUAL_MARKER_ID) {
      updateSceneVisualPosition(selectedSceneId, { x: clampPercent(rawX), y: clampPercent(rawY) });
      return;
    }

    if (visuals.some((v) => v.id === markerId)) {
      const x = clampPercent(rawX);
      const y = clampPercent(rawY);
      const next = visuals.map((v) => (v.id === markerId ? { ...v, x, y } : v));
      updateSceneVisuals(selectedSceneId, next);
      return;
    }

    // Text blocks are clamped to the TikTok-safe zone — they can never be
    // dragged into the area a UI overlay / captions would cover.
    const x = clampPercent(rawX, safeAreaPercent.left, safeAreaPercent.right);
    const y = clampPercent(rawY, safeAreaPercent.top, safeAreaPercent.bottom);
    const next = blocks.map((b) => (b.id === markerId ? { ...b, x, y } : b));
    updateSceneBlocks(selectedSceneId, next);
  }

  function handlePointerDown(e: React.PointerEvent, markerId: string) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingId(markerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!draggingId) return;
    moveMarkerTo(draggingId, e.clientX, e.clientY);
  }

  function handlePointerUp() {
    setDraggingId(null);
  }

  if (blocks.length === 0 && visuals.length === 0 && !visualPosition) return null;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        pointerEvents: draggingId ? "auto" : "none",
      }}
    >
      {visualPosition ? (
        <div
          onPointerDown={(e) => handlePointerDown(e, VISUAL_MARKER_ID)}
          title="Visual — drag to reposition"
          style={{
            position: "absolute",
            left: `${visualPosition.x}%`,
            top: `${visualPosition.y}%`,
            transform: "translate(-50%, -50%)",
            width: 26,
            height: 26,
            borderRadius: 6,
            background: draggingId === VISUAL_MARKER_ID ? "#ffffff" : "rgba(255,255,255,0.5)",
            border: "2px solid #ffffff",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
            cursor: "grab",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              color: editorColors.text,
              background: "rgba(0,0,0,0.75)",
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            visual
          </div>
        </div>
      ) : null}

      {visuals.map((entry, index) => (
        <div
          key={entry.id}
          onPointerDown={(e) => handlePointerDown(e, entry.id)}
          title={`Positioned visual #${index + 1} — drag to reposition`}
          style={{
            position: "absolute",
            left: `${entry.x}%`,
            top: `${entry.y}%`,
            transform: "translate(-50%, -50%)",
            width: 22,
            height: 22,
            borderRadius: 6,
            background: draggingId === entry.id ? "#4da3ff" : "rgba(77,163,255,0.55)",
            border: "2px solid #4da3ff",
            boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
            cursor: "grab",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              color: editorColors.text,
              background: "rgba(0,0,0,0.75)",
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            visual #{index + 1}
          </div>
        </div>
      ))}

      {blocks.map((block) => (
        <div
          key={block.id}
          onPointerDown={(e) => handlePointerDown(e, block.id)}
          title={`${block.text} — drag to reposition`}
          style={{
            position: "absolute",
            left: `${block.x}%`,
            top: `${block.y}%`,
            transform: "translate(-50%, -50%)",
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: draggingId === block.id ? editorColors.accent : "rgba(255,112,36,0.55)",
            border: `2px solid ${editorColors.accent}`,
            boxShadow: "0 0 0 2px rgba(0,0,0,0.5)",
            cursor: "grab",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -20,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              color: editorColors.text,
              background: "rgba(0,0,0,0.75)",
              padding: "2px 6px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {block.text || "block"}
          </div>
        </div>
      ))}
    </div>
  );
};
