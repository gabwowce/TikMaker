import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { VisualConfig } from "../../../schema/visual";
import { standardEasing } from "../../motion/easing";
import { videoDefaults } from "../../typography/tokens";
import { BareAsset } from "../assets/BareAsset";
type Corner = "tl" | "tr" | "bl" | "br";
type Diagonal = "tlbr" | "trbl";
const { width: W, height: H } = videoDefaults;
const SLOTS: Record<
  Corner,
  {
    x: number;
    y: number;
  }
> = {
  tl: { x: 150, y: 340 },
  tr: { x: W - 150, y: 340 },
  bl: { x: 150, y: H - 380 },
  br: { x: W - 150, y: H - 380 },
};
const PAIRS: Record<Diagonal, [Corner, Corner]> = {
  tlbr: ["tl", "br"],
  trbl: ["tr", "bl"],
};
export const CORNER_SLOT_PERCENT: Record<
  Corner,
  {
    x: number;
    y: number;
  }
> = {
  tl: { x: (SLOTS.tl.x / W) * 100, y: (SLOTS.tl.y / H) * 100 },
  tr: { x: (SLOTS.tr.x / W) * 100, y: (SLOTS.tr.y / H) * 100 },
  bl: { x: (SLOTS.bl.x / W) * 100, y: (SLOTS.bl.y / H) * 100 },
  br: { x: (SLOTS.br.x / W) * 100, y: (SLOTS.br.y / H) * 100 },
};
export const CORNER_PAIRS = PAIRS;
const DEFAULT_SIZE = 480;
const DEFAULT_SPEED = 1;
const ENTER_FRAMES = 20;
type CornerFloatProps = {
  assets: VisualConfig[];
  diagonal?: Diagonal;
  size?: number;
  speed?: number;
  offsets?: {
    x: number;
    y: number;
  }[];
};
export function CornerFloat({
  assets,
  diagonal = "tlbr",
  size = DEFAULT_SIZE,
  speed = DEFAULT_SPEED,
  offsets,
}: CornerFloatProps) {
  const frame = useCurrentFrame();
  const items =
    assets.length === 1 ? [assets[0], assets[0]] : assets.slice(0, 2);
  const corners = PAIRS[diagonal];
  const enter = interpolate(frame, [0, ENTER_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const enterScale = interpolate(enter, [0, 1], [0.86, 1]);
  const enterOpacity = interpolate(enter, [0, 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill className="pointer-events-none">
      {items.map((asset, index) => {
        const override = offsets?.[index];
        const slot = override
          ? { x: (override.x / 100) * W, y: (override.y / 100) * H }
          : SLOTS[corners[index]];
        const t = frame * 0.011 * speed + index * 2.3;
        const dx = Math.cos(t) * 30;
        const dy = Math.sin(t * 1.2) * 26;
        const rotation = Math.sin(t * 0.7 + index) * 11;
        const breathe = 1 + Math.sin(t * 0.5 + index) * 0.05;
        return (
          <div
            key={index}
            className="absolute"
            style={{
              left: slot.x - size / 2,
              top: slot.y - size / 2,
              width: size,
              height: size,
              opacity: enterOpacity,
              transform: [
                `translate(${dx}px, ${dy}px)`,
                `rotate(${rotation}deg)`,
                `scale(${breathe * enterScale})`,
              ].join(" "),
              filter: `drop-shadow(0 ${size * 0.05}px ${size * 0.11}px rgba(0,0,0,0.6))`,
            }}
          >
            <BareAsset visual={asset} size={size} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
