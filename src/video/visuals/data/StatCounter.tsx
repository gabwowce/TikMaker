import React from "react";
import { Audio, Sequence, useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { standardEasing } from "../../motion/easing";
import { getSfx } from "../../../registries/sfxRegistry";
import { resolveDefaultSfx, SFX_VOLUME } from "../../motion/sfxDefaults";

type StatCounterProps = {
  from: number;
  to: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  /** Sound effect id (see `sfxRegistry`) ticking while the number counts up —
   * defaults to "counter-short"; "none" silences it. */
  sfx?: string;
};

const COUNT_FRAMES = 50;
/** How often the tick repeats while counting — short enough to read as one
 * continuous "counting" texture rather than separate clicks, matching the
 * ~50-frame count-up duration. */
const TICK_INTERVAL_FRAMES = 5;
const TICK_WINDOW_FRAMES = 8;

export const StatCounter: React.FC<StatCounterProps> = ({
  from,
  to,
  label,
  prefix = "",
  suffix = "",
  decimals = 0,
  sfx,
}) => {
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
  const tickCount = sfxSrc ? Math.floor(COUNT_FRAMES / TICK_INTERVAL_FRAMES) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        style={{
          fontFamily: fontFamilies.clashBold,
          fontSize: fontSizes.hero,
          color: colors.textPrimary,
          lineHeight: 1,
        }}
      >
        {prefix}
        {formatted}
        {suffix}
      </div>
      {label ? (
        <div
          style={{
            fontFamily: fontFamilies.clashMedium,
            fontSize: fontSizes.label,
            color: colors.textSecondary,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          {label}
        </div>
      ) : null}
      {sfxSrc
        ? Array.from({ length: tickCount }, (_, i) => (
            <Sequence key={i} from={i * TICK_INTERVAL_FRAMES} durationInFrames={TICK_WINDOW_FRAMES} layout="none">
              <Audio src={sfxSrc} volume={SFX_VOLUME} />
            </Sequence>
          ))
        : null}
    </div>
  );
};
