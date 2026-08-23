import React from "react";
import { AbsoluteFill } from "remotion";
import { Background } from "../backgrounds";
import { safeAreaPadding } from "../typography/SafeArea";
import { Title, BodyLargeText, LabelText, Badge, renderHighlighted } from "../typography/Text";
import { colors, fontFamilies, fontSizes } from "../typography/tokens";
import { EnterOnCue, staggerDelay, useSceneExitStyle } from "./EnterOnCue";
import { VisualsLayer } from "../typography/VisualsLayer";
import { BlockLayer } from "../typography/BlockLayer";
import type { SceneComponentProps } from "./types";

export const StepsScene: React.FC<SceneComponentProps> = ({ background, content, motion, durationSeconds }) => {
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
          gap: 48,
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

        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
          {(content.items ?? []).map((item, index) => (
            <EnterOnCue
              key={index}
              preset="slideUp"
              delay={staggerDelay(index + 2, motion?.stagger)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                padding: "24px 32px",
                borderRadius: 20,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div
                style={{
                  fontFamily: fontFamilies.clashBold,
                  fontSize: fontSizes.title,
                  color: colors.accent,
                  minWidth: 90,
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <LabelText align="left" style={{ fontFamily: fontFamilies.clashSemibold }}>
                  {item.label}
                </LabelText>
                {item.value ? <BodyLargeText align="left" tone="secondary">{item.value}</BodyLargeText> : null}
              </div>
            </EnterOnCue>
          ))}
        </div>
      </AbsoluteFill>

      <BlockLayer blocks={content.blocks} />
      <VisualsLayer visuals={content.visuals} durationSeconds={durationSeconds} />
    </AbsoluteFill>
  );
};
