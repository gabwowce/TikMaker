import { RichHeadline } from "../typography/RichHeadline";
import { Headline, renderHighlighted } from "../typography/Text";
import { SceneCue, SceneFrame, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";
export function HookVisualScene({
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
          <Headline>
            {renderHighlighted(content.headline, content.highlights)}
          </Headline>
        </SceneCue>
      )}
    </SceneFrame>
  );
}
