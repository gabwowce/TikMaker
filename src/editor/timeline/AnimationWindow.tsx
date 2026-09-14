import { type PointerEvent as ReactPointerEvent } from "react";
import { clamp } from "./sceneTimelineLayout";

type AnimationWindowProps = {
  side: "in" | "out";
  frames: number;
  clipFrames: number;
  pixelsPerFrame: number;
  onChange?: (frames: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function AnimationWindow({
  side,
  frames,
  clipFrames,
  pixelsPerFrame,
  onChange,
  onDragStart,
  onDragEnd,
}: AnimationWindowProps) {
  const width = Math.min(Math.max(0, frames), clipFrames) * pixelsPerFrame;
  if (width < 2) return null;
  function begin(event: ReactPointerEvent) {
    if (!onChange) return;
    event.preventDefault();
    event.stopPropagation();
    onDragStart();
    const originX = event.clientX;
    const originFrames = frames;
    function move(pointer: PointerEvent) {
      return onChange?.(
        clamp(
          Math.round(
            originFrames +
              ((pointer.clientX - originX) / pixelsPerFrame) *
                (side === "in" ? 1 : -1),
          ),
          1,
          clipFrames,
        ),
      );
    }
    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      onDragEnd();
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
  }
  return (
    <div
      className={`absolute [z-index:3] top-0 bottom-0`}
      style={{
        width,
        ...(side === "in"
          ? { left: 0, borderRight: "2px solid rgba(255,255,255,.95)" }
          : { right: 0, borderLeft: "2px solid rgba(255,255,255,.95)" }),
        background: "rgba(255,255,255,.07)",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <span
        onPointerDown={begin}
        className={`absolute top-0 bottom-0 w-2.5`}
        style={{
          ...(side === "in" ? { right: -5 } : { left: -5 }),
          pointerEvents: onChange ? "auto" : "none",
          cursor: "ew-resize",
        }}
      />
    </div>
  );
}
