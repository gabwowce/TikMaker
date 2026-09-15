import { Fragment } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { standardEasing } from "../../motion/easing";
import { enter } from "../../motion/entrances";
import { VisualRenderer } from "../VisualRenderer";
type FlowNode = {
  label?: string;
  visual?: VisualConfig;
};
type FlowProps = {
  nodes: FlowNode[];
  direction?: "horizontal" | "vertical";
  animated?: boolean;
  stagger?: number;
};
const NODE_REVEAL_FRAMES = 16;
const DEFAULT_STAGGER = 14;
type NodeBoxProps = {
  node: FlowNode;
  delay: number;
  animated: boolean;
};
function NodeBox({ node, delay, animated }: NodeBoxProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const revealStyle = animated
    ? enter("pop", { frame, fps, delay, durationInFrames: NODE_REVEAL_FRAMES })
    : {};
  return (
    <div
      className={`flex flex-col items-center gap-3.5`}
      style={{
        ...revealStyle,
      }}
    >
      {node.visual ? (
        <VisualRenderer visual={node.visual} />
      ) : (
        <div className="w-[160px] h-[160px] rounded-[24px] bg-brand-surface [border:1px_solid_rgba(255,255,255,0.10)]" />
      )}
      {node.label ? (
        <div className="[font-family:ClashDisplay-Medium] text-label text-brand-muted uppercase tracking-[1px]">
          {node.label}
        </div>
      ) : null}
    </div>
  );
}
type ConnectorProps = {
  vertical?: boolean;
  animated: boolean;
  delay: number;
  drawFrames: number;
};
function Connector({ vertical, animated, delay, drawFrames }: ConnectorProps) {
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
      className={`relative bg-[rgba(255,255,255,0.10)] shrink-0 ${vertical ? "w-[3px]" : "w-16"} ${vertical ? "h-16" : "h-[3px]"}`}
    >
      <div
        className={`absolute inset-0 bg-brand-accent ${vertical ? "[transform-origin:top]" : "[transform-origin:left]"}`}
        style={{
          transform: vertical ? `scaleY(${draw})` : `scaleX(${draw})`,
        }}
      />
      {animated && framesSinceDrawn >= 0 ? (
        <div
          className="absolute w-2.5 h-2.5 rounded-[50%] bg-brand-accent"
          style={{
            left: vertical ? -3.5 : `${pulse * 100}%`,
            top: vertical ? `${pulse * 100}%` : -3.5,
          }}
        />
      ) : null}
    </div>
  );
}
export function Flow({
  nodes,
  direction = "horizontal",
  animated = true,
  stagger = DEFAULT_STAGGER,
}: FlowProps) {
  const vertical = direction === "vertical";
  return (
    <div
      className={`flex items-center gap-5 ${vertical ? "flex-col" : "flex-row"}`}
    >
      {nodes.map((node, index) => {
        const nodeDelay = animated ? index * stagger : 0;
        const connectorDelay = nodeDelay + NODE_REVEAL_FRAMES * 0.6;
        const drawFrames = Math.max(stagger - NODE_REVEAL_FRAMES * 0.6, 8);
        return (
          <Fragment key={index}>
            <NodeBox node={node} delay={nodeDelay} animated={animated} />
            {index < nodes.length - 1 ? (
              <Connector
                vertical={vertical}
                animated={animated}
                delay={connectorDelay}
                drawFrames={drawFrames}
              />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
