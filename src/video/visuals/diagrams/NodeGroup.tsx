import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { colors } from "../../typography/tokens";
import { standardEasing } from "../../motion/easing";
import { BareAsset } from "../assets/BareAsset";
import type { VisualConfig } from "../../../schema/visual";
import { VisualRenderer } from "../VisualRenderer";

type NodeGroupProps = {
  center?: VisualConfig;
  nodes: VisualConfig[];
  layout: "orbit" | "radial" | "one-to-many";
  radius?: number;
  speed?: number;
};

const DEFAULT_RADIUS = 300;
const DEFAULT_ORBIT_SPEED = 0.26;
const ORBIT_ASSET_SIZE = 180;
const ORBIT_ENTER_FRAMES = 20;

const CenterSlot: React.FC<{ center?: VisualConfig; bare?: boolean }> = ({ center, bare }) => {
  if (!center) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 2,
      }}
    >
      {bare ? <BareAsset visual={center} size={ORBIT_ASSET_SIZE} /> : <VisualRenderer visual={center} />}
    </div>
  );
};

const RadialLayout: React.FC<{ center?: VisualConfig; nodes: VisualConfig[]; radius: number }> = ({
  center,
  nodes,
  radius,
}) => {
  const size = radius * 2 + 200;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <CenterSlot center={center} />

      {nodes.map((node, index) => {
        const angle = (360 / nodes.length) * index;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <VisualRenderer visual={node} />
          </div>
        );
      })}
    </div>
  );
};

/**
 * The same nodes traveling a slow ring around the center, so a set of related
 * items reads as one orbiting system rather than a static diagram.
 *
 * The ring grows in from a slightly smaller radius on entry, and each node
 * gets a gentle tilt/scale "breathe" tied to its position on the ring so a
 * parked-looking node never reads as a pasted sticker. `center` is optional —
 * leaving it out lets the ring frame a headline that sits behind/inside it
 * instead of orbiting a graphic.
 */
const OrbitLayout: React.FC<{ center?: VisualConfig; nodes: VisualConfig[]; radius: number; speed: number }> = ({
  center,
  nodes,
  radius: baseRadius,
  speed,
}) => {
  const frame = useCurrentFrame();
  const size = baseRadius * 2 + 200;

  const enter = interpolate(frame, [0, ORBIT_ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const radius = baseRadius * interpolate(enter, [0, 1], [0.84, 1]);
  const rotationOffset = frame * speed;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.border}
          strokeWidth={2}
          opacity={enter}
        />
      </svg>

      <CenterSlot center={center} bare />

      {nodes.map((node, index) => {
        const angle = (360 / nodes.length) * index + rotationOffset;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const tilt = Math.sin(rad * 0.9 + index) * 11;
        const breathe = 1 + Math.sin(rad * 1.4 + index) * 0.06;

        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              opacity: enter,
              transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${breathe})`,
              filter: "drop-shadow(0 14px 26px rgba(0,0,0,0.5))",
            }}
          >
            <BareAsset visual={node} size={ORBIT_ASSET_SIZE} />
          </div>
        );
      })}
    </div>
  );
};

const OneToManyLayout: React.FC<{ center?: VisualConfig; nodes: VisualConfig[] }> = ({ center, nodes }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
    {center ? <VisualRenderer visual={center} /> : null}
    <div style={{ width: 60, height: 3, backgroundColor: colors.border }} />
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {nodes.map((node, index) => (
        <div key={index} style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 40, height: 3, backgroundColor: colors.border }} />
          <VisualRenderer visual={node} />
        </div>
      ))}
    </div>
  </div>
);

export const NodeGroup: React.FC<NodeGroupProps> = ({
  center,
  nodes,
  layout,
  radius = DEFAULT_RADIUS,
  speed = DEFAULT_ORBIT_SPEED,
}) => {
  if (layout === "one-to-many") return <OneToManyLayout center={center} nodes={nodes} />;
  if (layout === "orbit") return <OrbitLayout center={center} nodes={nodes} radius={radius} speed={speed} />;
  return <RadialLayout center={center} nodes={nodes} radius={radius} />;
};
