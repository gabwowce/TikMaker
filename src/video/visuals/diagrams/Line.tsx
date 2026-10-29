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
  // arrowhead: a triangle whose tip is the line's end. The line itself stops
  // inside the triangle, so its round cap never pokes out past the tip.
  const headLength = Math.max(18, thickness * 3);
  const headWidth = Math.max(12, thickness * 2); // half of the base
  const endHead = arrowHead(end, control, headLength, headWidth);
  const startHead = arrowHead(start, control, headLength, headWidth);
  const lineEnd = arrow !== "none" ? endHead.inside : end;
  const lineStart = arrow === "both" ? startHead.inside : start;
  const path = `M ${lineStart.x} ${lineStart.y} Q ${control.x} ${control.y} ${lineEnd.x} ${lineEnd.y}`;
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
        <path d={endHead.path} fill={color} opacity={progress > 0.92 ? 1 : 0} />
      ) : null}
      {arrow === "both" ? (
        <path
          d={startHead.path}
          fill={color}
          opacity={progress > 0.05 ? 1 : 0}
        />
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

// A filled triangle with its tip at `tip`, pointing away from `from`, and the
// point where the line should stop so it ends inside the triangle.
function arrowHead(
  tip: { x: number; y: number },
  from: { x: number; y: number },
  length: number,
  halfWidth: number,
): { path: string; inside: { x: number; y: number } } {
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const norm = Math.hypot(dx, dy) || 1;
  const along = { x: dx / norm, y: dy / norm }; // direction the arrow points
  const across = { x: -along.y, y: along.x };
  const base = { x: tip.x - along.x * length, y: tip.y - along.y * length };
  const left = {
    x: base.x + across.x * halfWidth,
    y: base.y + across.y * halfWidth,
  };
  const right = {
    x: base.x - across.x * halfWidth,
    y: base.y - across.y * halfWidth,
  };
  return {
    path: `M ${tip.x} ${tip.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z`,
    inside: {
      x: tip.x - along.x * length * 0.6,
      y: tip.y - along.y * length * 0.6,
    },
  };
}
