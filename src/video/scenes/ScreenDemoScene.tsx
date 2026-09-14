import { RichHeadline } from "../typography/RichHeadline";
import { Title, renderHighlighted } from "../typography/Text";
import { SceneCue, SceneFrame, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";
export function ScreenDemoScene({
  content,
  layout,
  motion,
  durationSeconds,
}: SceneComponentProps) {
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
          <Title>
            {renderHighlighted(content.headline, content.highlights)}
          </Title>
        </SceneCue>
      ) : null}
    </SceneFrame>
  );
}
