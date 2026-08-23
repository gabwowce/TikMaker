import React from "react";
import { AbsoluteFill } from "remotion";
import { Background } from "../backgrounds";
import { safeAreaPadding } from "../typography/SafeArea";
import { LabelText, HeroText, Badge, renderHighlighted } from "../typography/Text";
import { RichHeadline } from "../typography/RichHeadline";
import { AnimatedVisual } from "../typography/AnimatedVisual";
import { PositionedVisual } from "../typography/PositionedVisual";
import { EnterOnCue, staggerDelay, useSceneExitStyle } from "./EnterOnCue";
import { VisualsLayer } from "../typography/VisualsLayer";
import { BlockLayer } from "../typography/BlockLayer";
import { OrbitBackdrop, isOrbitBackdrop } from "./OrbitBackdrop";
import type { SceneComponentProps } from "./types";

export const HookCenteredScene: React.FC<SceneComponentProps> = ({
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

        {content.eyebrow ? (
          <EnterOnCue preset={motion?.entrance ?? "fade"} delay={staggerDelay(1, motion?.stagger)}>
            <LabelText tone="accent" style={{ letterSpacing: 4, textTransform: "uppercase" }}>
              {content.eyebrow}
            </LabelText>
          </EnterOnCue>
        ) : null}

        {content.richHeadline?.length ? (
          <RichHeadline lines={content.richHeadline} stagger={motion?.stagger} />
        ) : (
          <EnterOnCue preset={motion?.entrance ?? "slideUp"} delay={staggerDelay(2, motion?.stagger)}>
            <HeroText>{renderHighlighted(content.headline, content.highlights)}</HeroText>
          </EnterOnCue>
        )}

        {showInlineVisual ? (
          <AnimatedVisual
            visual={visual}
            entrance={visualEntrance ?? motion?.entrance ?? "scaleIn"}
            entranceDelay={staggerDelay(3, motion?.stagger)}
            exit={visualExit}
            exitDuration={visualExitDuration}
            durationSeconds={durationSeconds}
            style={{ marginTop: 24 }}
          />
        ) : null}
      </AbsoluteFill>

      {showPositionedVisual ? (
        <PositionedVisual
          visual={visual}
          position={visualPosition}
          entrance={visualEntrance ?? motion?.entrance}
          entranceDelay={staggerDelay(3, motion?.stagger)}
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
