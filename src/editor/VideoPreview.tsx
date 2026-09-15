import { ActionIcon, Button, NativeSelect } from "@mantine/core";
import { Player, type PlayerRef } from "@remotion/player";
import { useState, type RefObject } from "react";
import { TikTokVideo } from "../video/TikTokVideo";
import { videoDefaults } from "../video/typography/tokens";
import { BlockPositionOverlay } from "./BlockPositionOverlay";
import {
  SafeZoneOverlay,
  safeZonePresets,
  type SafeZonePlatform,
} from "./SafeZoneOverlay";
import { useProjectStore } from "./state/projectStore";
import { usePreviewSize } from "./usePreviewSize";

type VideoPreviewProps = {
  playerRef: RefObject<PlayerRef>;
  durationInFrames: number;
};

export function VideoPreview({
  playerRef,
  durationInFrames,
}: VideoPreviewProps) {
  const project = useProjectStore((state) => state.project);
  const sceneId = useProjectStore((state) => state.selectedSceneId);
  const scene = project.scenes.find((entry) => entry.id === sceneId);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [platform, setPlatform] = useState<SafeZonePlatform>("all");
  const { stageRef, width, height, zoom, setZoom, zoomBy } = usePreviewSize();

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        ref={stageRef}
        className="absolute inset-0 flex overflow-auto bg-neutral-950 p-6"
      >
        {project.scenes.length ? (
          <div className="relative m-auto shrink-0" style={{ width, height }}>
            <div
              className="overflow-hidden rounded shadow-2xl"
              style={{ width, height }}
            >
              <Player
                ref={playerRef}
                component={TikTokVideo}
                inputProps={{ project }}
                durationInFrames={durationInFrames}
                fps={videoDefaults.fps}
                compositionWidth={videoDefaults.width}
                compositionHeight={videoDefaults.height}
                className={`block`}
                style={{
                  width,
                  height,
                }}
                controls
                initiallyShowControls
                loop
                acknowledgeRemotionLicense
                numberOfSharedAudioTags={0}
              />
            </div>
            {showSafeZones ? <SafeZoneOverlay platform={platform} /> : null}
            <BlockPositionOverlay
              blocks={scene?.content.blocks ?? []}
              visuals={scene?.content.visuals ?? []}
              richHeadline={scene?.content.richHeadline}
              richHeadlineX={scene?.content.richHeadlineX}
              richHeadlineY={scene?.content.richHeadlineY}
              width={width}
              height={height}
            />
          </div>
        ) : (
          <div className="m-auto text-sm text-editor-muted">No scenes</div>
        )}
      </div>
      <div className="editor-ui absolute top-3 right-3 z-20 flex items-center gap-2 rounded bg-editor-panel p-1">
        <Button
          variant={showSafeZones ? "filled" : "default"}
          onClick={() => setShowSafeZones(!showSafeZones)}
        >
          Safe zones
        </Button>
        {showSafeZones ? (
          <NativeSelect
            aria-label="Platform"
            value={platform}
            onChange={(event) =>
              setPlatform(event.currentTarget.value as SafeZonePlatform)
            }
            data={Object.entries(safeZonePresets).map(([value, preset]) => ({
              value,
              label: preset.label,
            }))}
          />
        ) : null}
      </div>
      <div className="editor-ui absolute right-3 bottom-3 z-20 flex items-center gap-1 rounded bg-editor-panel p-1">
        <ActionIcon
          aria-label="Zoom out"
          disabled={zoom <= 0.401}
          onClick={() => zoomBy(1 / 1.2)}
        >
          −
        </ActionIcon>
        <Button
          variant="subtle"
          aria-label="Reset zoom"
          onClick={() => setZoom(1)}
        >
          {Math.round(zoom * 100)}%
        </Button>
        <ActionIcon
          aria-label="Zoom in"
          disabled={zoom >= 2.999}
          onClick={() => zoomBy(1.2)}
        >
          +
        </ActionIcon>
      </div>
    </div>
  );
}
