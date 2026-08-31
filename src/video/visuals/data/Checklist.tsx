import React from "react";
import { Audio, Sequence, useCurrentFrame, interpolate } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { getSfx } from "../../../registries/sfxRegistry";
import { resolveDefaultSfx, SFX_VOLUME } from "../../motion/sfxDefaults";

type ChecklistProps = {
  items: { label: string; done?: boolean; delay?: number; exitAt?: number }[];
  font?: "tanker" | "clash";
  size?: "hero" | "headline" | "title" | "bodyLarge" | "body" | "label";
  /** frames between one item revealing and the next — matches the pace of a
   * voiceover reading items one at a time */
  stagger?: number;
  /** Sound effect id (see `sfxRegistry`) played as each item reveals —
   * defaults to "check" (a checklist ticking on is its own reveal beat, same
   * reasoning as a Block's text entrance); "none" silences it. */
  sfx?: string;
};

const CUE_WINDOW_FRAMES = 30;

export const Checklist: React.FC<ChecklistProps> = ({ items, font, size = "bodyLarge", stagger = 6, sfx }) => {
  const frame = useCurrentFrame();
  const family = font === "clash" ? fontFamilies.clashMedium : fontFamilies.tanker;
  const resolvedSfxId = resolveDefaultSfx(sfx, "check");
  const sfxSrc = resolvedSfxId ? getSfx(resolvedSfxId)?.src : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 640 }}>
      {items.map((item, index) => {
        const delay = item.delay ?? index * stagger;
        const opacity = interpolate(frame - delay, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const translateX = interpolate(frame - delay, [0, 12], [-30, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const exitOpacity = item.exitAt === undefined
          ? 1
          : interpolate(frame, [Math.max(delay, item.exitAt - 8), item.exitAt], [1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

        return (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              opacity: opacity * exitOpacity,
              transform: `translateX(${translateX}px)`,
              padding: "18px 24px",
              borderRadius: 16,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: item.done === false ? "transparent" : colors.accentSoft,
                border: `2px solid ${item.done === false ? colors.border : colors.accent}`,
                color: colors.accent,
                fontSize: 20,
              }}
            >
              {item.done === false ? "" : "✓"}
            </div>
            <div
              style={{
                fontFamily: family,
                fontSize: fontSizes[size],
                color: colors.textPrimary,
                textTransform: font === "clash" ? undefined : "uppercase",
              }}
            >
              {item.label}
            </div>
            {sfxSrc ? (
              <Sequence from={Math.max(0, delay)} durationInFrames={CUE_WINDOW_FRAMES} layout="none">
                <Audio src={sfxSrc} volume={SFX_VOLUME} />
              </Sequence>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
