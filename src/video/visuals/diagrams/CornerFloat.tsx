import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { videoDefaults } from "../../typography/tokens";
import { standardEasing } from "../../motion/easing";
import { BareAsset } from "../assets/BareAsset";
import type { VisualConfig } from "../../../schema/visual";

type Corner = "tl" | "tr" | "bl" | "br";
type Diagonal = "tlbr" | "trbl";

const { width: W, height: H } = videoDefaults;

const SLOTS: Record<Corner, { x: number; y: number }> = {
  tl: { x: 150, y: 340 },
  tr: { x: W - 150, y: 340 },
  bl: { x: 150, y: H - 380 },
  br: { x: W - 150, y: H - 380 },
};

const PAIRS: Record<Diagonal, [Corner, Corner]> = {
  tlbr: ["tl", "br"],
  trbl: ["tr", "bl"],
};

/** Default corner slots expressed as percent of frame width/height, so the
 * Inspector can pre-fill per-asset X/Y sliders at the current visual
 * position instead of snapping to 0 the first time a user touches them. */
export const CORNER_SLOT_PERCENT: Record<Corner, { x: number; y: number }> = {
  tl: { x: (SLOTS.tl.x / W) * 100, y: (SLOTS.tl.y / H) * 100 },
  tr: { x: (SLOTS.tr.x / W) * 100, y: (SLOTS.tr.y / H) * 100 },
  bl: { x: (SLOTS.bl.x / W) * 100, y: (SLOTS.bl.y / H) * 100 },
  br: { x: (SLOTS.br.x / W) * 100, y: (SLOTS.br.y / H) * 100 },
};

export const CORNER_PAIRS = PAIRS;

const DEFAULT_SIZE = 480;
const DEFAULT_SPEED = 1;
const ENTER_FRAMES = 20;

/**
 * Two assets parked in opposite corners with a slow float/tilt/breathe drift,
 * so a vertical frame's empty corners hold something alive instead of
 * fighting the centered headline for space. Sits behind all scene content —
 * see OrbitBackdrop / isBackdropVisual, which treats this the same as an
 * orbit ring.
 */
export const CornerFloat: React.FC<{
  assets: VisualConfig[];
  diagonal?: Diagonal;
  size?: number;
  speed?: number;
  /** Per-asset position override, in percent of frame width/height —
   * index-matched to `assets`. Falls back to the diagonal's default corner
   * slot when an entry is missing. */
  offsets?: { x: number; y: number }[];
}> = ({ assets, diagonal = "tlbr", size = DEFAULT_SIZE, speed = DEFAULT_SPEED, offsets }) => {
  const frame = useCurrentFrame();
  const items = assets.length === 1 ? [assets[0], assets[0]] : assets.slice(0, 2);
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
    <AbsoluteFill style={{ pointerEvents: "none" }}>
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
            style={{
              position: "absolute",
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
};
