import React from "react";
import { LabelText, HeroText, renderHighlighted } from "../typography/Text";
import { RichHeadline } from "../typography/RichHeadline";
import { SceneFrame, SceneCue, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";

export const HookCenteredScene: React.FC<SceneComponentProps> = ({ content, layout, motion, durationSeconds }) => {
  const { baseDelay, cue } = useSceneCues(motion);

  return (
    <SceneFrame
      content={content}
      motion={motion}
      durationSeconds={durationSeconds}
      layout={layout}
      textZone="center"
      gap={40}
    >
      {content.eyebrow ? (
        <SceneCue motion={motion} delay={cue(0)}>
          <LabelText tone="accent" style={{ letterSpacing: 4, textTransform: "uppercase" }}>
            {content.eyebrow}
          </LabelText>
        </SceneCue>
      ) : null}

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
        <SceneCue motion={motion} delay={cue(1)} fallback="slideUp">
          <HeroText>{renderHighlighted(content.headline, content.highlights)}</HeroText>
        </SceneCue>
      )}
    </SceneFrame>
  );
};
