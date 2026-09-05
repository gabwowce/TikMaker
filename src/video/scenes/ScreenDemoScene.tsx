import React from "react";
import { Title, renderHighlighted } from "../typography/Text";
import { RichHeadline } from "../typography/RichHeadline";
import { SceneFrame, SceneCue, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";

export const ScreenDemoScene: React.FC<SceneComponentProps> = ({
  content,
  layout,
  motion,
  durationSeconds,
}) => {
  const { baseDelay, cue } = useSceneCues(motion);

  return (
    <SceneFrame
      content={content}
      motion={motion}
      durationSeconds={durationSeconds}
      layout={layout}
      textZone="top"
      gap={40}
    >
      {content.richHeadline?.length ? (
        <RichHeadline
          lines={content.richHeadline}
          stagger={motion?.stagger}
          baseDelay={baseDelay}
          motion={motion}
          durationSeconds={durationSeconds}
          x={content.richHeadlineX}
          y={content.richHeadlineY}
        />
      ) : content.headline ? (
        <SceneCue motion={motion} delay={cue(0)}>
          <Title>{renderHighlighted(content.headline, content.highlights)}</Title>
        </SceneCue>
      ) : null}
    </SceneFrame>
  );
};
