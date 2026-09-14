import { useEffect, useRef, useState } from "react";
import { videoDefaults } from "../video/typography/tokens";

export function usePreviewSize() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(300);
  const [zoom, setZoom] = useState(1);
  const ratio = videoDefaults.height / videoDefaults.width;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function measure() {
      if (!stage) return;
      const width = stage.clientWidth - 48;
      const height = stage.clientHeight - 48;
      setFitWidth(
        Math.round(Math.max(300, Math.min(620, width, height / ratio))),
      );
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [ratio]);

  function zoomBy(factor: number) {
    setZoom((value) => Math.min(3, Math.max(0.4, value * factor)));
  }

  const width = Math.round(fitWidth * zoom);
  return {
    stageRef,
    width,
    height: Math.round(width * ratio),
    zoom,
    setZoom,
    zoomBy,
  };
}
