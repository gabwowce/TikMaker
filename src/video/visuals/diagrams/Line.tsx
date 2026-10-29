import { useId } from "react";
import { interpolate } from "remotion";
import { standardEasing } from "../../motion/easing";
import { colors } from "../../typography/tokens";
import { useVisualFrame } from "../visualStart";

type LineProps = {
  length: number;
  angle?: number;
  curve?: number;
  thickness?: number;
  color?: string;
  arrow?: "none" | "end" | "both";
  dashed?: boolean;
};

const DRAW_FRAMES = 18;

// A line, arrow, underline or curved route that draws itself from its start
// to its end when its layer appears ("draw-on" in the video analysis).
export function Line({
  length,
  angle = 0,
  curve = 0,
  thickness = 10,
  color = colors.accent,
  arrow = "none",
  dashed = false,
}: LineProps) {
  const frame = useVisualFrame();
  const maskId = useId();
  const progress = interpolate(frame, [0, DRAW_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const box = lineBox({ length, curve, thickness });
  const mid = box.height / 2;
  const start = { x: box.pad, y: mid };
  const end = { x: box.pad + length, y: mid };
  // the bend: a control point above (curve > 0) or below the middle
  const control = { x: box.pad + length / 2, y: mid - curve * length };
  const path = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  const head = thickness * 2.6; // arrowhead size
  // arrowheads point along the line at its ends; they appear once the line reaches them
  const endHead = arrowHead(end, control, head);
  const startHead = arrowHead(start, control, head);
  return (
    <svg
      width={box.width}
      height={box.height}
      className="overflow-visible"
      style={{ transform: angle ? `rotate(${angle}deg)` : undefined }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        pathLength={1}
        // dashed: the dashes are cut out by a mask, so the line can still draw on
        strokeDasharray="1 1"
        strokeDashoffset={1 - progress}
        mask={dashed ? `url(#${maskId})` : undefined}
      />
      {dashed ? (
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <path
            d={path}
            fill="none"
            stroke="#fff"
            strokeWidth={thickness * 2}
            strokeDasharray={`${thickness * 2.2} ${thickness * 1.8}`}
          />
        </mask>
      ) : null}
      {arrow !== "none" ? (
        <path d={endHead} fill={color} opacity={progress > 0.92 ? 1 : 0} />
      ) : null}
      {arrow === "both" ? (
        <path d={startHead} fill={color} opacity={progress > 0.05 ? 1 : 0} />
      ) : null}
    </svg>
  );
}

// The SVG size for a line: its length plus room for the bend and arrowheads.
export function lineBox({
  length,
  curve = 0,
  thickness = 10,
}: {
  length: number;
  curve?: number;
  thickness?: number;
}) {
  const pad = thickness * 3;
  const bend = (Math.abs(curve) * length) / 2; // how far the curve bulges from a straight line
  return {
    pad,
    width: length + pad * 2,
    height: bend + pad * 2 + bend, // symmetric, so the line's centre stays in the middle
  };
}

// A filled triangle at `tip`, pointing away from `from`.
function arrowHead(
  tip: { x: number; y: number },
  from: { x: number; y: number },
  size: number,
): string {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const left = angle + Math.PI * 0.82;
  const right = angle - Math.PI * 0.82;
  return `M ${tip.x + Math.cos(angle) * size * 0.3} ${tip.y + Math.sin(angle) * size * 0.3}
    L ${tip.x + Math.cos(left) * size} ${tip.y + Math.sin(left) * size}
    L ${tip.x + Math.cos(right) * size} ${tip.y + Math.sin(right) * size} Z`;
}
