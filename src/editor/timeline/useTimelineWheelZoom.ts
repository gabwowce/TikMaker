import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
export function useTimelineWheelZoom(
  viewportRef: RefObject<HTMLDivElement>,
  labelWidth: number,
  zoom: number,
  setZoom: Dispatch<SetStateAction<number>>,
  min: number,
  max: number,
) {
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    function onWheel(event: WheelEvent) {
      if (!viewport) return;
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();
      const oldZoom = zoomRef.current;
      const nextZoom = Math.min(
        max,
        Math.max(min, oldZoom * (event.deltaY < 0 ? 1.15 : 0.87)),
      );
      if (nextZoom === oldZoom) return;
      const rect = viewport.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const timelineX = Math.max(
        0,
        viewport.scrollLeft + pointerX - labelWidth,
      );
      const anchorFrame = timelineX / oldZoom;
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        viewport.scrollLeft = Math.max(
          0,
          anchorFrame * nextZoom - (pointerX - labelWidth),
        );
      });
    }
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  });
}
