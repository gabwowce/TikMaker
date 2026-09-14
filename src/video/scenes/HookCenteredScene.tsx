import { RichHeadline } from "../typography/RichHeadline";
import { HeroText, LabelText, renderHighlighted } from "../typography/Text";
import { SceneCue, SceneFrame, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";
export function HookCenteredScene({
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
      gap={40}
    >
      {content.eyebrow ? (
        <SceneCue motion={motion} delay={cue(0)}>
          <LabelText tone="accent" className="[letter-spacing:4px] uppercase">
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
          <HeroText>
            {renderHighlighted(content.headline, content.highlights)}
          </HeroText>
        </SceneCue>
      )}
    </SceneFrame>
  );
}
