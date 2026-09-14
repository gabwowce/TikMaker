import { interpolate, useCurrentFrame } from "remotion";
import { standardEasing } from "../../motion/easing";
type ProgressBarProps = {
  value: number;
  max: number;
  label?: string;
};
export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const frame = useCurrentFrame();
  const targetRatio = Math.min(1, Math.max(0, value / max));
  const ratio = interpolate(frame, [0, 40], [0, targetRatio], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  return (
    <div className="flex flex-col gap-4 w-[640px]">
      {label ? (
        <div className="[font-family:ClashDisplay-Medium] text-[42px] text-[#B8B8B8]">
          {label}
        </div>
      ) : null}
      <div className="h-7 rounded-[999px] bg-[#222222] [border:1px_solid_rgba(255,255,255,0.10)] overflow-hidden">
        <div
          className="h-full rounded-[999px] bg-[#FF7024]"
          style={{
            width: `${ratio * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
