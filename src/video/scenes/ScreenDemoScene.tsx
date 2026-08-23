import React from "react";
import { AbsoluteFill } from "remotion";
import { Background } from "../backgrounds";
import { safeAreaPadding } from "../typography/SafeArea";
import { Title, BodyText, Badge, renderHighlighted } from "../typography/Text";
import { AnimatedVisual } from "../typography/AnimatedVisual";
import { PositionedVisual } from "../typography/PositionedVisual";
import { EnterOnCue, staggerDelay, useSceneExitStyle } from "./EnterOnCue";
import { VisualsLayer } from "../typography/VisualsLayer";
import { BlockLayer } from "../typography/BlockLayer";
import { OrbitBackdrop, isOrbitBackdrop } from "./OrbitBackdrop";
import type { SceneComponentProps } from "./types";

export const ScreenDemoScene: React.FC<SceneComponentProps> = ({
  background,
  content,
  visual,
  visualPosition,
  visualEntrance,
  visualExit,
  visualExitDuration,
  motion,
  durationSeconds,
}) => {
  const exitStyle = useSceneExitStyle(durationSeconds, motion);
  const showInlineVisual = visual && !isOrbitBackdrop(visual) && !visualPosition;
  const showPositionedVisual = visual && !isOrbitBackdrop(visual) && visualPosition;

  return (
    <AbsoluteFill>
      <Background id={background} />
      <OrbitBackdrop visual={visual} exitOpacity={typeof exitStyle.opacity === "number" ? exitStyle.opacity : 1} />
      <AbsoluteFill
        style={{
          ...safeAreaPadding,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 40,
          ...exitStyle,
        }}
      >
        {content.badge ? (
          <EnterOnCue preset={motion?.entrance ?? "fade"} delay={staggerDelay(0, motion?.stagger)}>
            <Badge>{content.badge}</Badge>
          </EnterOnCue>
        ) : null}

        <EnterOnCue preset={motion?.entrance ?? "fade"} delay={staggerDelay(1, motion?.stagger)}>
          <Title>{renderHighlighted(content.headline, content.highlights)}</Title>
        </EnterOnCue>

        {showInlineVisual ? (
          <AnimatedVisual
            visual={visual}
            entrance={visualEntrance ?? motion?.entrance ?? "scaleIn"}
            entranceDelay={staggerDelay(2, motion?.stagger)}
            exit={visualExit}
            exitDuration={visualExitDuration}
            durationSeconds={durationSeconds}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
          />
        ) : null}

        {content.body ? (
          <EnterOnCue preset={motion?.entrance ?? "fade"} delay={staggerDelay(3, motion?.stagger)}>
            <BodyText tone="secondary">{content.body}</BodyText>
          </EnterOnCue>
        ) : null}
      </AbsoluteFill>

      {showPositionedVisual ? (
        <PositionedVisual
          visual={visual}
          position={visualPosition}
          entrance={visualEntrance ?? motion?.entrance}
          entranceDelay={staggerDelay(2, motion?.stagger)}
          exit={visualExit}
          exitDuration={visualExitDuration}
          durationSeconds={durationSeconds}
        />
      ) : null}

      <BlockLayer blocks={content.blocks} />
      <VisualsLayer visuals={content.visuals} durationSeconds={durationSeconds} />
    </AbsoluteFill>
  );
};
