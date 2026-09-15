import type { SideContent } from "../../schema/scene";
import { resolveExplicitSfx } from "../motion/sfxDefaults";
import { AnimatedVisual } from "../typography/AnimatedVisual";
import { BodyText, LabelText, Title } from "../typography/Text";
import { EnterOnCue } from "./EnterOnCue";
import { SceneFrame, SceneHeadline, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";
type ColumnProps = {
  side?: SideContent;
  delay: number;
  durationSeconds: number;
};
function Column({ side, delay, durationSeconds }: ColumnProps) {
  return (
    <EnterOnCue
      preset="slideUp"
      delay={delay}
      className="flex-1 flex flex-col items-center gap-5 p-6 rounded-[24px] bg-brand-surface [border:1px_solid_rgba(255,255,255,0.10)]"
    >
      {side?.label ? (
        <LabelText tone="accent" className="uppercase [letter-spacing:2px]">
          {side.label}
        </LabelText>
      ) : null}
      {side?.headline ? (
        <Title className="text-[56px]!">{side.headline}</Title>
      ) : null}
      {side?.visual ? (
        <AnimatedVisual
          visual={side.visual}
          entrance={side.visualEntrance ?? "none"}
          entranceDelay={delay}
          exit={side.visualExit}
          entranceDuration={side.visualEntranceDuration}
          exitDuration={side.visualExitDuration}
          entranceDistance={side.visualEntranceDistance}
          exitDistance={side.visualExitDistance}
          kenBurns={side.visualKenBurns}
          kenBurnsSpeed={side.visualKenBurnsSpeed}
          ownScale={side.visualScale}
          durationSeconds={durationSeconds}
          sfx={resolveExplicitSfx(side.visualSfx)}
          exitSfx={resolveExplicitSfx(side.visualExitSfx)}
        />
      ) : null}
      {side?.body ? <BodyText tone="secondary">{side.body}</BodyText> : null}
    </EnterOnCue>
  );
}
export function ComparisonScene({
  content,
  motion,
  durationSeconds,
}: SceneComponentProps) {
  const { cue } = useSceneCues(motion);
  return (
    <SceneFrame
      content={content}
      motion={motion}
      durationSeconds={durationSeconds}
      textZone="center"
      gap={40}
    >
      <SceneHeadline
        content={content}
        motion={motion}
        durationSeconds={durationSeconds}
      />

      <div className="flex gap-6 w-full">
        <Column
          side={content.left}
          delay={cue(1)}
          durationSeconds={durationSeconds}
        />
        <Column
          side={content.right}
          delay={cue(2)}
          durationSeconds={durationSeconds}
        />
      </div>
    </SceneFrame>
  );
}
