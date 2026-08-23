import React from "react";
import { OffthreadVideo, useVideoConfig } from "remotion";

type CropConfig = { x: number; y: number; width: number; height: number };

type ScreenRecordingProps = {
  src: string;
  startFrom?: number;
  endAt?: number;
  playbackRate?: number;
  fit?: "cover" | "contain";
  crop?: CropConfig;
};

export const ScreenRecording: React.FC<ScreenRecordingProps> = ({
  src,
  startFrom = 0,
  endAt,
  playbackRate = 1,
  fit = "cover",
  crop,
}) => {
  const { fps } = useVideoConfig();
  const startFromFrames = Math.round(startFrom * fps);
  const endAtFrames = endAt ? Math.round(endAt * fps) : undefined;

  const videoNode = (
    <OffthreadVideo
      src={src}
      startFrom={startFromFrames}
      endAt={endAtFrames}
      playbackRate={playbackRate}
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
      }}
    />
  );

  if (!crop) return videoNode;

  const scaleX = 1 / crop.width;
  const scaleY = 1 / crop.height;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: `${scaleX * 100}%`,
          height: `${scaleY * 100}%`,
          left: `${-crop.x * scaleX * 100}%`,
          top: `${-crop.y * scaleY * 100}%`,
        }}
      >
        {videoNode}
      </div>
    </div>
  );
};
