import React from "react";

/** Ctrl/Cmd + wheel zoom that belongs to the timeline, not the browser.
 * The frame under the pointer stays under the pointer while the scale changes. */
export function useTimelineWheelZoom(
  viewportRef: React.RefObject<HTMLDivElement>,
  labelWidth: number,
  zoom: number,
  setZoom: React.Dispatch<React.SetStateAction<number>>,
  min: number,
  max: number
) {
  const zoomRef = React.useRef(zoom);
  React.useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();

      const oldZoom = zoomRef.current;
      const nextZoom = Math.min(max, Math.max(min, oldZoom * (event.deltaY < 0 ? 1.15 : 0.87)));
      if (nextZoom === oldZoom) return;
      const rect = viewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const timelineX = Math.max(0, viewport.scrollLeft + pointerX - labelWidth);
      const anchorFrame = timelineX / oldZoom;
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        viewport.scrollLeft = Math.max(0, anchorFrame * nextZoom - (pointerX - labelWidth));
      });
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  });
}
