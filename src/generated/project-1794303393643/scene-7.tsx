import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { SCENE_COLORS, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { ChatIcon, GAME, GAME_RECORD, Gameplay, GlassPill, TrophyIcon, clampAll, usePop, ZONE } from "./shared";

export const description =
  "The fireworks finish of the game freezes full screen, dimmed and softly blurred; a big glass 'Comment PLAY' card springs in at the centre, then a 'beat 14.2 s' pill";

export const schema = z.object({
  gameplay: field.recording("Gameplay", GAME_RECORD),
  startSec: field.number("Recording starts at (s)", 16.6, { min: 0, max: 19 }),
  word: field.text("Comment word", "PLAY"),
  beat: field.text("Pill", "beat *14.2 s*"),
  showOn: field.word("Card on", "PLAY"),
  beatOn: field.word("Pill on", "Beat"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const show = wordFrame(words, params.showOn, 12);
  const beat = wordFrame(words, params.beatOn, 97);
  const pop = usePop(show - 3);
  const float = Math.sin(frame / 14) * 7;
  const tilt = interpolate(frame - show, [0, 16], [10, 0], clampAll) + Math.sin(frame / 26) * 1.5;
  const glowPulse = 0.5 + Math.sin(frame / 10) * 0.15;
  return (
    <AbsoluteFill>
      <Gameplay
        src={params.gameplay || GAME}
        startSec={params.startSec}
        rate={0.6}
        freezeAt={50}
        duration={durationInFrames}
        zoom={[1.0, 1.1]}
        punchAt={[show, beat]}
        dim={0.4}
        blur={7}
        hideTop={520}
        scrim={[1350, 1550]}
      />
      <div
        style={{
          position: "absolute",
          left: ZONE.left,
          width: ZONE.width,
          top: 565,
          display: "flex",
          justifyContent: "center",
          opacity: pop.opacity,
          transform: `perspective(1200px) translateY(${float}px) rotateX(${tilt * 0.6}deg) rotateY(${-tilt}deg) scale(${pop.scale})`,
        }}
      >
        <div
          style={{
            width: 720,
            height: 270,
            borderRadius: 48,
            background: "rgba(10,14,26,0.55)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1.5px solid rgba(255,255,255,0.18)",
            borderTop: "1.5px solid rgba(255,255,255,0.34)",
            boxShadow: `0 8px 16px rgba(0,0,0,0.3), 0 32px 80px rgba(0,0,0,0.5), 0 0 90px ${COLOR}${Math.round(glowPulse * 255)
              .toString(16)
              .padStart(2, "0")}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <ChatIcon size={52} color="rgba(255,255,255,0.75)" />
            <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 56, color: "rgba(255,255,255,0.75)" }}>
              Comment
            </span>
          </div>
          <span
            style={{
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 150,
              lineHeight: 1,
              letterSpacing: 6,
              color: COLOR,
              textShadow: `0 0 40px ${COLOR}88`,
            }}
          >
            {params.word}
          </span>
        </div>
      </div>
      <GlassPill at={beat - 3} icon={<TrophyIcon size={46} color="#fff" />} text={params.beat} top={880} color={COLOR} size={54} />
    </AbsoluteFill>
  );
}
