import React from "react";
import { OffthreadVideo, useVideoConfig } from "remotion";
import { colors, fontFamilies } from "../../typography/tokens";
import { assetUrl } from "../../../utils/assetUrl";

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
  // A project can legitimately reference a clip that isn't there yet (a fresh
  // template, or a project cloned without its recordings). Without this, one
  // missing file throws out of the video player and takes the whole editor
  // preview down instead of just showing an empty screen.
  const [failed, setFailed] = React.useState(false);
  const startFromFrames = Math.round(startFrom * fps);
  const endAtFramesRaw = endAt ? Math.round(endAt * fps) : undefined;
  // Remotion throws (and takes the whole Player down with it, not just this
  // clip) if `endAt` isn't strictly greater than `startFrom` — trivially
  // reachable from the Inspector's plain number fields (an End frame typed
  // before, or equal to, Start frame). Treat that as "no trim" instead of a
  // crash: it's what the field meant to say anyway.
  const endAtFrames =
    endAtFramesRaw !== undefined && endAtFramesRaw > startFromFrames ? endAtFramesRaw : undefined;

  const videoNode =
    !src || failed ? (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          color: colors.textSecondary,
          fontFamily: fontFamilies.clashMedium,
          fontSize: 28,
          textAlign: "center",
          padding: 24,
        }}
      >
        {src ? "Clip not found" : "No clip picked yet"}
      </div>
    ) : (
      <OffthreadVideo
        src={assetUrl(src)}
        onError={() => setFailed(true)}
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
