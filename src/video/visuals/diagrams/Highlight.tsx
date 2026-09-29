import { interpolate, useCurrentFrame } from "remotion";
import { standardEasing } from "../../motion/easing";
import { colors } from "../../typography/tokens";

type HighlightProps = {
  width: number;
  height: number;
  shape?: "box" | "circle";
  delay?: number;
};

const STROKE = 10;
const DRAW_FRAMES = 14;

// A marker drawn around one region of whatever sits under it — the "look
// HERE" of a screen recording. The stroke draws itself on at `delay`
// (scene frames), which is the point of it: a box that is simply there reads
// as part of the UI, a box that draws itself reads as the narrator pointing.
export function Highlight({ width, height, shape = "box", delay = 0 }: HighlightProps) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, DRAW_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const inset = STROKE / 2;
  const w = width - STROKE;
  const h = height - STROKE;
  const perimeter =
    shape === "circle"
      ? Math.PI * (3 * (w / 2 + h / 2) - Math.sqrt((3 * w) / 2 + h / 2) * Math.sqrt(w / 2 + (3 * h) / 2))
      : 2 * (w + h);
  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      style={{ filter: `drop-shadow(0 0 18px ${colors.accentSoft})` }}
    >
      {shape === "circle" ? (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={w / 2}
          ry={h / 2}
          fill="none"
          stroke={colors.accent}
          strokeWidth={STROKE}
          strokeDasharray={perimeter}
          strokeDashoffset={perimeter * (1 - progress)}
          strokeLinecap="round"
        />
      ) : (
        <rect
          x={inset}
          y={inset}
          width={w}
          height={h}
          rx={24}
          fill="none"
          stroke={colors.accent}
          strokeWidth={STROKE}
          strokeDasharray={perimeter}
          strokeDashoffset={perimeter * (1 - progress)}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
