import { Audio, interpolate, Sequence, useCurrentFrame } from "remotion";
import { getSfx } from "../../../registries/sfxRegistry";
import { standardEasing } from "../../motion/easing";
import { resolveDefaultSfx, SFX_VOLUME } from "../../motion/sfxDefaults";
type StatCounterProps = {
  from: number;
  to: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  sfx?: string;
};
const COUNT_FRAMES = 50;
const TICK_INTERVAL_FRAMES = 5;
const TICK_WINDOW_FRAMES = 8;
export function StatCounter({
  from,
  to,
  label,
  prefix = "",
  suffix = "",
  decimals = 0,
  sfx,
}: StatCounterProps) {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [0, COUNT_FRAMES], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: standardEasing,
  });
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const resolvedSfxId = resolveDefaultSfx(sfx, "counter-short");
  const sfxSrc = resolvedSfxId ? getSfx(resolvedSfxId)?.src : undefined;
  const tickCount = sfxSrc
    ? Math.floor(COUNT_FRAMES / TICK_INTERVAL_FRAMES)
    : 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="[font-family:ClashDisplay-Bold] text-[136px] text-[#FFFFFF] [line-height:1]">
        {prefix}
        {formatted}
        {suffix}
      </div>
      {label ? (
        <div className="[font-family:ClashDisplay-Medium] text-[42px] text-[#B8B8B8] uppercase [letter-spacing:2px]">
          {label}
        </div>
      ) : null}
      {sfxSrc
        ? Array.from({ length: tickCount }, (_, i) => (
            <Sequence
              key={i}
              from={i * TICK_INTERVAL_FRAMES}
              durationInFrames={TICK_WINDOW_FRAMES}
              layout="none"
            >
              <Audio src={sfxSrc} volume={SFX_VOLUME} />
            </Sequence>
          ))
        : null}
    </div>
  );
}
