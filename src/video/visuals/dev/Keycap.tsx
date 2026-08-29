import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
import { enter } from "../../motion/entrances";
import { WINDOW_WIDTH } from "./devText";

type KeycapProps = {
  keys: string[];
  caption?: string;
};

const PRESS_FRAME = 10;
const STAGGER = 8;

/**
 * Physical keyboard keys, so "press ESC" reads as an instruction the viewer
 * can act on instead of another line of body text. Each cap drops on its own
 * beat and settles, mimicking an actual keypress.
 */
export const Keycap: React.FC<KeycapProps> = ({ keys, caption }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {keys.map((key, index) => {
          const delay = index * STAGGER;
          const local = frame - delay;
          const style = enter("pop", { frame, fps, delay });
          // Travel down a few px right after landing, like a key bottoming out.
          const press = local >= PRESS_FRAME && local < PRESS_FRAME + 4 ? 6 : 0;

          return (
            <div
              key={index}
              style={{
                ...style,
                transform: `${style.transform ?? ""} translateY(${press}px)`,
                fontFamily: fontFamilies.tanker,
                fontSize: fontSizes.title,
                color: colors.textPrimary,
                textTransform: "uppercase",
                // Sized to read correctly at ~1x. Drawing it small and letting
                // auto-fit scale it up also scales the caption, which is how
                // the caption ended up bigger than the headline and running
                // into the TikTok side-safe margins.
                padding: "40px 56px",
                minWidth: 260,
                textAlign: "center",
                borderRadius: 24,
                backgroundColor: colors.surfaceElevated,
                border: `1px solid ${colors.border}`,
                boxShadow: press
                  ? `0 2px 0 ${colors.border}`
                  : `0 10px 0 ${colors.surface}, 0 12px 0 ${colors.border}`,
              }}
            >
              {key}
            </div>
          );
        })}
      </div>
      {caption ? (
        <div
          style={{
            fontFamily: fontFamilies.clashMedium,
            fontSize: fontSizes.body,
            color: colors.textSecondary,
            // The caption can easily be wider than the key row, which is what
            // `naturalVisualSize` measures — without this cap a long caption
            // reaches past the side-safe margins even though the keys fit.
            maxWidth: WINDOW_WIDTH,
            textAlign: "center",
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );
};
