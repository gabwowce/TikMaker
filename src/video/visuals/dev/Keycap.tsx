import { useCurrentFrame, useVideoConfig } from "remotion";
import { enter } from "../../motion/entrances";
import { colors, fontFamilies, fontSizes } from "../../typography/tokens";
type KeycapProps = {
  keys: string[];
  caption?: string;
};
const PRESS_FRAME = 10;
const STAGGER = 8;
export function Keycap({ keys, caption }: KeycapProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div className="flex flex-col items-center gap-7">
      <div className="flex items-center gap-5">
        {keys.map((key, index) => {
          const delay = index * STAGGER;
          const local = frame - delay;
          const style = enter("pop", { frame, fps, delay });
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
        <div className="[font-family:ClashDisplay-Medium] text-[52px] text-[#B8B8B8] max-w-[820px] text-center">
          {caption}
        </div>
      ) : null}
    </div>
  );
}
