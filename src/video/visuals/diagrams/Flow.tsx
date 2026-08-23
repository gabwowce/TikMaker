import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { standardEasing } from "../../motion/easing";
import { enter } from "../../motion/entrances";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";

type FlowNode = { label?: string; visual?: VisualConfig };

type FlowProps = {
  nodes: FlowNode[];
  direction?: "horizontal" | "vertical";
  animated?: boolean;
  /** frames between one node revealing and the next starting */
  stagger?: number;
};

const NODE_REVEAL_FRAMES = 16;
const DEFAULT_STAGGER = 14;

const NodeBox: React.FC<{ node: FlowNode; delay: number; animated: boolean }> = ({ node, delay, animated }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const revealStyle = animated ? enter("pop", { frame, fps, delay, durationInFrames: NODE_REVEAL_FRAMES }) : {};

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, ...revealStyle }}>
      {node.visual ? (
        <VisualRenderer visual={node.visual} />
      ) : (
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 24,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
          }}
        />
      )}
      {node.label ? (
        <div
          style={{
            fontFamily: fontFamilies.clashMedium,
            fontSize: fontSizes.label,
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {node.label}
        </div>
      ) : null}
    </div>
  );
};

/** A connector that draws itself from the node it leaves toward the node it
 * reaches, instead of appearing all at once — then carries a small traveling
 * pulse once the line has fully drawn. */
const Connector: React.FC<{ vertical?: boolean; animated: boolean; delay: number; drawFrames: number }> = ({
  vertical,
  animated,
  delay,
  drawFrames,
}) => {
  const frame = useCurrentFrame();
  const draw = animated
    ? interpolate(frame - delay, [0, drawFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: standardEasing,
      })
    : 1;
  const framesSinceDrawn = frame - delay - drawFrames;
  const pulse = interpolate(framesSinceDrawn % 50, [0, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "relative",
        width: vertical ? 3 : 64,
        height: vertical ? 64 : 3,
        backgroundColor: colors.border,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: colors.accent,
          transformOrigin: vertical ? "top" : "left",
          transform: vertical ? `scaleY(${draw})` : `scaleX(${draw})`,
        }}
      />
      {animated && framesSinceDrawn >= 0 ? (
        <div
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: colors.accent,
            left: vertical ? -3.5 : `${pulse * 100}%`,
            top: vertical ? `${pulse * 100}%` : -3.5,
          }}
        />
      ) : null}
    </div>
  );
};

export const Flow: React.FC<FlowProps> = ({
  nodes,
  direction = "horizontal",
  animated = true,
  stagger = DEFAULT_STAGGER,
}) => {
  const vertical = direction === "vertical";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        gap: 20,
      }}
    >
      {nodes.map((node, index) => {
        const nodeDelay = animated ? index * stagger : 0;
        const connectorDelay = nodeDelay + NODE_REVEAL_FRAMES * 0.6;
        const drawFrames = Math.max(stagger - NODE_REVEAL_FRAMES * 0.6, 8);

        return (
          <React.Fragment key={index}>
            <NodeBox node={node} delay={nodeDelay} animated={animated} />
            {index < nodes.length - 1 ? (
              <Connector vertical={vertical} animated={animated} delay={connectorDelay} drawFrames={drawFrames} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};
