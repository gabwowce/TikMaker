import { useState } from "react";
import { OffthreadVideo, useVideoConfig } from "remotion";
import { assetUrl } from "../../../utils/assetUrl";
type CropConfig = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type ScreenRecordingProps = {
  src: string;
  startFrom?: number;
  endAt?: number;
  playbackRate?: number;
  fit?: "cover" | "contain";
  crop?: CropConfig;
};
export function ScreenRecording({
  src,
  startFrom = 0,
  endAt,
  playbackRate = 1,
  fit = "cover",
  crop,
}: ScreenRecordingProps) {
  const { fps } = useVideoConfig();
  const [failed, setFailed] = useState(false);
  const startFromFrames = Math.round(startFrom * fps);
  const endAtFramesRaw = endAt ? Math.round(endAt * fps) : undefined;
  const endAtFrames =
    endAtFramesRaw !== undefined && endAtFramesRaw > startFromFrames
      ? endAtFramesRaw
      : undefined;
  const videoNode =
    !src || failed ? (
      <div className="w-full h-full flex items-center justify-center bg-[#222222] text-[#B8B8B8] [font-family:ClashDisplay-Medium] text-[28px] text-center p-6">
        {src ? "Clip not found" : "No clip picked yet"}
      </div>
    ) : (
      <OffthreadVideo
        src={assetUrl(src)}
        onError={() => setFailed(true)}
        startFrom={startFromFrames}
        endAt={endAtFrames}
        playbackRate={playbackRate}
        className="w-full h-full"
        style={{
          objectFit: fit,
        }}
      />
    );
  if (!crop) return videoNode;
  const scaleX = 1 / crop.width;
  const scaleY = 1 / crop.height;
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="absolute"
        style={{
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
}
