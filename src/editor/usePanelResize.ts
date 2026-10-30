import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { clamp } from "./timeline/sceneTimelineLayout";

// A panel resized by dragging one of its edges: the timeline's top edge, the
// AI panel's left edge. Dragging away from the panel makes it bigger. The size
// stays between min and max, and `save` remembers it (editorPrefs).
export function usePanelResize(options: {
  edge: "top" | "left";
  stored: number | undefined;
  initial: number;
  min: number;
  max: number;
  save: (size: number) => void;
}) {
  const { edge, stored, initial, min, max, save } = options;
  const [size, setSize] = useState(() =>
    clamp(Number.isFinite(stored) ? (stored as number) : initial, min, max),
  );

  function beginResize(event: ReactPointerEvent) {
    event.preventDefault();
    const axis = edge === "top" ? "clientY" : "clientX";
    const origin = event[axis];
    const originSize = size;
    function move(pointer: PointerEvent) {
      const next = clamp(originSize + (origin - pointer[axis]), min, max);
      setSize(next);
      save(next);
    }
    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
  }

  return { size, beginResize };
}
