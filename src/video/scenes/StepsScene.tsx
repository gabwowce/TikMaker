import { useCurrentFrame } from "remotion";
import {
  BodyLargeText,
  LabelText,
  renderHighlighted,
  Title,
} from "../typography/Text";
import { EnterOnCue } from "./EnterOnCue";
import { SceneCue, SceneFrame, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";
export function StepsScene({
  content,
  motion,
  durationSeconds,
}: SceneComponentProps) {
  const { cue } = useSceneCues(motion);
  const frame = useCurrentFrame();
  return (
    <SceneFrame
      content={content}
      motion={motion}
      durationSeconds={durationSeconds}
      textZone="center"
      gap={48}
    >
      {content.headline ? (
        <SceneCue motion={motion} delay={cue(0)}>
          <Title>
            {renderHighlighted(content.headline, content.highlights)}
          </Title>
        </SceneCue>
      ) : null}

      <div className="flex flex-col gap-6 w-full">
        {(content.items ?? []).map((item, index) => (
          <EnterOnCue
            key={index}
            preset="slideUp"
            delay={item.delay ?? cue(index + 1)}
            className={`flex items-center gap-7 p-[24px_32px] rounded-[20px] bg-[#222222] [border:1px_solid_rgba(255,255,255,0.10)] ${item.exitAt === undefined || frame < item.exitAt ? "[visibility:visible]" : "[visibility:hidden]"}`}
          >
            <div className="[font-family:Tanker-Regular] text-[80px] text-[#FF7024] min-w-22.5">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="flex flex-col gap-1">
              <LabelText
                align="left"
                className="[font-family:Tanker-Regular] uppercase"
              >
                {item.label}
              </LabelText>
              {item.value ? (
                <BodyLargeText align="left" tone="secondary">
                  {item.value}
                </BodyLargeText>
              ) : null}
            </div>
          </EnterOnCue>
        ))}
      </div>
    </SceneFrame>
  );
}
