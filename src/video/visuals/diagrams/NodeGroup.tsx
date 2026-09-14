import { interpolate, useCurrentFrame } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { standardEasing } from "../../motion/easing";
import { colors } from "../../typography/tokens";
import { BareAsset } from "../assets/BareAsset";
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
type CenterSlotProps = {
  center?: VisualConfig;
  bare?: boolean;
};
function CenterSlot({ center, bare }: CenterSlotProps) {
  if (!center) return null;
  return (
    <div className="absolute left-[50%] top-[50%] [transform:translate(-50%,_-50%)] [z-index:2]">
      {bare ? (
        <BareAsset visual={center} size={ORBIT_ASSET_SIZE} />
      ) : (
        <VisualRenderer visual={center} />
      )}
    </div>
  );
}
type RadialLayoutProps = {
  center?: VisualConfig;
  nodes: VisualConfig[];
  radius: number;
};
function RadialLayout({ center, nodes, radius }: RadialLayoutProps) {
  const size = radius * 2 + 200;
  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
      }}
    >
      <CenterSlot center={center} />

      {nodes.map((node, index) => {
        const angle = (360 / nodes.length) * index;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        return (
          <div
            key={index}
            className="absolute [transform:translate(-50%,_-50%)]"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
            }}
          >
            <VisualRenderer visual={node} />
          </div>
        );
      })}
    </div>
  );
}
type OrbitLayoutProps = {
  center?: VisualConfig;
  nodes: VisualConfig[];
  radius: number;
  speed: number;
};
function OrbitLayout({
  center,
  nodes,
  radius: baseRadius,
  speed,
}: OrbitLayoutProps) {
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
    <div
      className="relative"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg width={size} height={size} className="absolute inset-0">
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
            className="absolute [filter:drop-shadow(0_14px_26px_rgba(0,0,0,0.5))]"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              opacity: enter,
              transform: `translate(-50%, -50%) rotate(${tilt}deg) scale(${breathe})`,
            }}
          >
            <BareAsset visual={node} size={ORBIT_ASSET_SIZE} />
          </div>
        );
      })}
    </div>
  );
}
type OneToManyLayoutProps = {
  center?: VisualConfig;
  nodes: VisualConfig[];
};
function OneToManyLayout({ center, nodes }: OneToManyLayoutProps) {
  return (
    <div className="flex items-center gap-15">
      {center ? <VisualRenderer visual={center} /> : null}
      <div className="w-15 h-[3px] bg-[rgba(255,255,255,0.10)]" />
      <div className="flex flex-col gap-6">
        {nodes.map((node, index) => (
          <div key={index} className="flex items-center gap-5">
            <div className="w-10 h-[3px] bg-[rgba(255,255,255,0.10)]" />
            <VisualRenderer visual={node} />
          </div>
        ))}
      </div>
    </div>
  );
}
export function NodeGroup({
  center,
  nodes,
  layout,
  radius = DEFAULT_RADIUS,
  speed = DEFAULT_ORBIT_SPEED,
}: NodeGroupProps) {
  if (layout === "one-to-many")
    return <OneToManyLayout center={center} nodes={nodes} />;
  if (layout === "orbit")
    return (
      <OrbitLayout
        center={center}
        nodes={nodes}
        radius={radius}
        speed={speed}
      />
    );
  return <RadialLayout center={center} nodes={nodes} radius={radius} />;
}
