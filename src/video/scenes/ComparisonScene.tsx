import React from "react";
import { Title, LabelText, BodyText, renderHighlighted } from "../typography/Text";
import { AnimatedVisual } from "../typography/AnimatedVisual";
import { resolveExplicitSfx } from "../motion/sfxDefaults";
import { colors } from "../typography/tokens";
import { EnterOnCue } from "./EnterOnCue";
import { SceneFrame, SceneCue, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";
import type { SideContent } from "../../schema/scene";

/**
 * One side of the comparison. Its visual belongs to the column and moves with
 * it, which is why it isn't a `content.visuals[]` layer — but it still gets the
 * full in/out control set through the same `AnimatedVisual` every layer uses,
 * so no visual in the system is missing controls the others have.
 */
const Column: React.FC<{ side?: SideContent; delay: number; durationSeconds: number }> = ({
  side,
  delay,
  durationSeconds,
}) => (
  <EnterOnCue
    preset="slideUp"
    delay={delay}
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 20,
      padding: 24,
      borderRadius: 24,
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
    }}
  >
    {side?.label ? (
      <LabelText tone="accent" style={{ textTransform: "uppercase", letterSpacing: 2 }}>
        {side.label}
      </LabelText>
    ) : null}
    {side?.headline ? <Title style={{ fontSize: 56 }}>{side.headline}</Title> : null}
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

export const ComparisonScene: React.FC<SceneComponentProps> = ({ content, motion, durationSeconds }) => {
  const { cue } = useSceneCues(motion);

  return (
    <SceneFrame content={content} motion={motion} durationSeconds={durationSeconds} textZone="center" gap={40}>
      {content.headline ? (
        <SceneCue motion={motion} delay={cue(0)}>
          <Title>{renderHighlighted(content.headline, content.highlights)}</Title>
        </SceneCue>
      ) : null}

      <div style={{ display: "flex", gap: 24, width: "100%" }}>
        <Column side={content.left} delay={cue(1)} durationSeconds={durationSeconds} />
        <Column side={content.right} delay={cue(2)} durationSeconds={durationSeconds} />
      </div>
    </SceneFrame>
  );
};
