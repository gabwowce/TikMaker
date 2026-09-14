import type { PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import {
  computeSceneTimings,
  projectDurationInFrames,
} from "../utils/duration";
import { useProjectStore } from "./state/projectStore";

export function usePreviewPlayer(mode: "scenes" | "storyboard") {
  const playerRef = useRef<PlayerRef>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const project = useProjectStore((state) => state.project);
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId);
  const selectScene = useProjectStore((state) => state.selectScene);
  const setPlayheadFrame = useProjectStore((state) => state.setPlayheadFrame);
  const durationInFrames = projectDurationInFrames(project);

  function seekTo(frame: number) {
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
    setPlayheadFrame(frame);
  }

  useEffect(() => {
    if (
      !project.scenes.length ||
      project.scenes.some((scene) => scene.id === selectedSceneId)
    )
      return;
    const timing = computeSceneTimings(project).find(
      (entry) =>
        currentFrame >= entry.from &&
        currentFrame < entry.from + entry.durationInFrames,
    );
    selectScene(timing?.scene.id ?? project.scenes[0].id);
  }, [currentFrame, project, selectScene, selectedSceneId]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    function onFrame(event: { detail: { frame: number } }) {
      setCurrentFrame(event.detail.frame);
      setPlayheadFrame(event.detail.frame);
    }
    player.addEventListener("frameupdate", onFrame);
    return () => player.removeEventListener("frameupdate", onFrame);
  }, [durationInFrames, mode, setPlayheadFrame]);

  useEffect(() => {
    const currentProject = useProjectStore.getState().project;
    const timing = computeSceneTimings(currentProject).find(
      (entry) => entry.scene.id === selectedSceneId,
    );
    if (timing) seekTo(timing.from);
  }, [selectedSceneId, mode]);

  return { playerRef, currentFrame, durationInFrames, seekTo };
}
