import React from "react";
import { Headline, renderHighlighted } from "../typography/Text";
import { RichHeadline } from "../typography/RichHeadline";
import { SceneFrame, SceneCue, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";

export const HookVisualScene: React.FC<SceneComponentProps> = ({ content, layout, motion, durationSeconds }) => {
  const { baseDelay, cue } = useSceneCues(motion);

  return (
    <SceneFrame
      content={content}
      motion={motion}
      durationSeconds={durationSeconds}
      layout={layout}
      textZone="center"
      gap={48}
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
      ) : (
        <SceneCue motion={motion} delay={cue(0)} fallback="slideUp">
          <Headline>{renderHighlighted(content.headline, content.highlights)}</Headline>
        </SceneCue>
      )}
    </SceneFrame>
  );
};
