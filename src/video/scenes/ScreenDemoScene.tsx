import React from "react";
import { Title, renderHighlighted } from "../typography/Text";
import { SceneFrame, SceneCue, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";

export const ScreenDemoScene: React.FC<SceneComponentProps> = ({
  content,
  layout,
  motion,
  durationSeconds,
}) => {
  const { cue } = useSceneCues(motion);

  return (
    <SceneFrame
      content={content}
      motion={motion}
      durationSeconds={durationSeconds}
      layout={layout}
      textZone="top"
      gap={40}
    >
      <SceneCue motion={motion} delay={cue(0)}>
        <Title>{renderHighlighted(content.headline, content.highlights)}</Title>
      </SceneCue>
    </SceneFrame>
  );
};
