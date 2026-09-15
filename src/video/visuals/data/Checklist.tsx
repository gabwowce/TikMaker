import { Audio, interpolate, Sequence, useCurrentFrame } from "remotion";
import { getSfx } from "../../../registries/sfxRegistry";
import { resolveDefaultSfx, SFX_VOLUME } from "../../motion/sfxDefaults";
import { fontFamilies, fontSizes } from "../../typography/tokens";
type ChecklistProps = {
  items: {
    label: string;
    done?: boolean;
    delay?: number;
    exitAt?: number;
  }[];
  font?: "tanker" | "clash";
  size?: "hero" | "headline" | "title" | "bodyLarge" | "body" | "label";
  stagger?: number;
  sfx?: string;
};
const CUE_WINDOW_FRAMES = 30;
export function Checklist({
  items,
  font,
  size = "bodyLarge",
  stagger = 6,
  sfx,
}: ChecklistProps) {
  const frame = useCurrentFrame();
  const family =
    font === "clash" ? fontFamilies.clashMedium : fontFamilies.tanker;
  const resolvedSfxId = resolveDefaultSfx(sfx, "check");
  const sfxSrc = resolvedSfxId ? getSfx(resolvedSfxId)?.src : undefined;
  return (
    <div className="flex flex-col gap-5 min-w-[640px]">
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
        const exitOpacity =
          item.exitAt === undefined
            ? 1
            : interpolate(
                frame,
                [Math.max(delay, item.exitAt - 8), item.exitAt],
                [1, 0],
                {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                },
              );
        return (
          <div
            key={index}
            className="flex items-center gap-5 p-[18px_24px] rounded-[16px] bg-brand-surface [border:1px_solid_rgba(255,255,255,0.10)]"
            style={{
              opacity: opacity * exitOpacity,
              transform: `translateX(${translateX}px)`,
            }}
          >
            <div
              className={`w-9 h-9 rounded-[50%] shrink-0 flex items-center justify-center text-brand-accent text-[20px] ${item.done === false ? "bg-transparent" : "bg-[rgba(255,_112,_36,_0.15)]"} ${item.done === false ? "[border:2px_solid_rgba(255,255,255,0.10)]" : "[border:2px_solid_#FF7024]"}`}
            >
              {item.done === false ? "" : "✓"}
            </div>
            <div
              className="text-brand-text"
              style={{
                fontFamily: family,
                fontSize: fontSizes[size],
                textTransform: font === "clash" ? undefined : "uppercase",
              }}
            >
              {item.label}
            </div>
            {sfxSrc ? (
              <Sequence
                from={Math.max(0, delay)}
                durationInFrames={CUE_WINDOW_FRAMES}
                layout="none"
              >
                <Audio src={sfxSrc} volume={SFX_VOLUME} />
              </Sequence>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
