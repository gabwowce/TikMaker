import React from "react";
import { AbsoluteFill } from "remotion";
import type { VideoProject } from "../schema/project";
import { SceneRenderer } from "./SceneRenderer";
import { colors } from "./typography/tokens";
import { ensureFontsLoaded } from "./typography/fonts";

export const TikTokVideo: React.FC<{ project: VideoProject }> = ({ project }) => {
  ensureFontsLoaded();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <SceneRenderer scenes={project.scenes} fps={project.fps} />
    </AbsoluteFill>
  );
};
