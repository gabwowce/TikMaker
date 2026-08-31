import React from "react";
import { Title, BodyLargeText, LabelText, renderHighlighted } from "../typography/Text";
import { colors, fontFamilies, fontSizes } from "../typography/tokens";
import { useCurrentFrame } from "remotion";
import { EnterOnCue, staggerDelay } from "./EnterOnCue";
import { SceneFrame, SceneCue, useSceneCues } from "./SceneFrame";
import type { SceneComponentProps } from "./types";

export const StepsScene: React.FC<SceneComponentProps> = ({
  content,
  motion,
  durationSeconds,
}) => {
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
          <Title>{renderHighlighted(content.headline, content.highlights)}</Title>
        </SceneCue>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
        {(content.items ?? []).map((item, index) => (
          <EnterOnCue
            key={index}
            preset="slideUp"
            delay={item.delay ?? cue(index + 1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 28,
              padding: "24px 32px",
              borderRadius: 20,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              visibility: item.exitAt === undefined || frame < item.exitAt ? "visible" : "hidden",
            }}
          >
            <div
              style={{
                fontFamily: fontFamilies.tanker,
                fontSize: fontSizes.title,
                color: colors.accent,
                minWidth: 90,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <LabelText align="left" style={{ fontFamily: fontFamilies.tanker, textTransform: "uppercase" }}>
                {item.label}
              </LabelText>
              {item.value ? <BodyLargeText align="left" tone="secondary">{item.value}</BodyLargeText> : null}
            </div>
          </EnterOnCue>
        ))}
      </div>
    </SceneFrame>
  );
};
