import React from "react";
import { AbsoluteFill } from "remotion";
import { Background } from "../backgrounds";
import { safeAreaPadding } from "../typography/SafeArea";
import { Title, LabelText, BodyText, Badge, renderHighlighted } from "../typography/Text";
import { VisualRenderer } from "../visuals/VisualRenderer";
import { colors } from "../typography/tokens";
import { EnterOnCue, staggerDelay, useSceneExitStyle } from "./EnterOnCue";
import { VisualsLayer } from "../typography/VisualsLayer";
import { BlockLayer } from "../typography/BlockLayer";
import type { SceneComponentProps } from "./types";
import type { SideContent } from "../../schema/scene";

const Column: React.FC<{ side?: SideContent; delay: number }> = ({ side, delay }) => (
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
    {side?.visual ? <VisualRenderer visual={side.visual} /> : null}
    {side?.body ? <BodyText tone="secondary">{side.body}</BodyText> : null}
  </EnterOnCue>
);

export const ComparisonScene: React.FC<SceneComponentProps> = ({ background, content, motion, durationSeconds }) => {
  const exitStyle = useSceneExitStyle(durationSeconds, motion);

  return (
    <AbsoluteFill>
      <Background id={background} />
      <AbsoluteFill
        style={{
          ...safeAreaPadding,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          ...exitStyle,
        }}
      >
        {content.badge ? (
          <EnterOnCue preset={motion?.entrance ?? "fade"} delay={staggerDelay(0, motion?.stagger)}>
            <Badge>{content.badge}</Badge>
          </EnterOnCue>
        ) : null}

        {content.headline ? (
          <EnterOnCue preset={motion?.entrance ?? "fade"} delay={staggerDelay(1, motion?.stagger)}>
            <Title>{renderHighlighted(content.headline, content.highlights)}</Title>
          </EnterOnCue>
        ) : null}

        <div style={{ display: "flex", gap: 24, width: "100%" }}>
          <Column side={content.left} delay={staggerDelay(2, motion?.stagger)} />
          <Column side={content.right} delay={staggerDelay(3, motion?.stagger)} />
        </div>
      </AbsoluteFill>

      <BlockLayer blocks={content.blocks} />
      <VisualsLayer visuals={content.visuals} durationSeconds={durationSeconds} />
    </AbsoluteFill>
  );
};
