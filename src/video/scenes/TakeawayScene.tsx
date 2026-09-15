import { SceneFrame, SceneHeadline } from "./SceneFrame";
import type { SceneComponentProps } from "./types";
export function TakeawayScene({
  content,
  layout,
  motion,
  durationSeconds,
}: SceneComponentProps) {
  return (
    <SceneFrame
      content={content}
      motion={motion}
      durationSeconds={durationSeconds}
      layout={layout}
      textZone="center"
      gap={36}
    >
      <SceneHeadline
        content={content}
        motion={motion}
        durationSeconds={durationSeconds}
      />
    </SceneFrame>
  );
}
