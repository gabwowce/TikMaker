import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { bounceIn, clamp, Clip, CLIP_H, CLIP_W, prog, pulse, Stage } from "./shared";

export const description =
  "The same clip twice: on top a flat grey screen recording, below it the same clip alive with orange moving shapes, and an orange '01' badge pops onto its corner";

export const schema = z.object({
  badge: field.text("Badge", "01"),
  badgeOn: field.word("Badge pops on", "skills"),
  liveOn: field.word("Motion clip lights up on", "motion"),
});
type Params = z.infer<typeof schema>;

const S = 0.78;
const TOP_CY = 455;
const BOT_CY = 875;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const badgeAt = wordFrame(words, params.badgeOn, 37) - 3;
  const liveAt = wordFrame(words, params.liveOn, 75) - 3;

  const live = prog(frame, liveAt, 14);
  const badge = bounceIn(frame, badgeAt, 10);
  const right = 515 + (CLIP_W * S) / 2;
  const top = BOT_CY - (CLIP_H * S) / 2;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* plain: flat, grey, dimmed */}
        <Clip frame={0} cy={TOP_CY} s={S} look={{ hot: 0 }} style={{ opacity: 0.45, filter: "grayscale(1)" }} />
        {/* motion design: the same clip, alive */}
        <Clip
          frame={frame}
          cy={BOT_CY}
          s={S * (1 + live * 0.04)}
          look={{ hot: 1 }}
          glow={0.4 + live * 0.6 * (0.6 + 0.4 * pulse(frame))}
        />
        <div
          style={{
            position: "absolute",
            left: right - 70 + live * 6,
            top: top - 50 - live * 8,
            width: 120,
            height: 120,
            borderRadius: 60,
            background: c.accent,
            color: c.bg,
            fontFamily: c.fontStrong,
            fontSize: 56 * c.widthFactor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 4,
            boxSizing: "border-box",
            scale: `${badge}`,
            opacity: interpolate(badge, [0, 0.2], [0, 1], clamp),
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {params.badge}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
