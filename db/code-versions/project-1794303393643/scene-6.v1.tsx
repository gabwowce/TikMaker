import { z } from "zod";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MONO, SCENE_COLORS, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CheckIcon, ClaudeWindow, GAME, GameMotif, Headline, cardMotion, clampAll } from "./shared";

export const description =
  "An empty Claude Code prompt in a big glass window; a three-line checklist – what you fly, what you collect, how you win – ticks off point by point";

export const schema = z.object({
  headline: field.text("Headline", "Open *Claude* *Code*"),
  one: field.text("Point 1", "What you fly"),
  two: field.text("Point 2", "What you collect"),
  three: field.text("Point 3", "How you win"),
  oneHint: field.text("Example 1", "a paper plane"),
  twoHint: field.text("Example 2", "22 lights"),
  threeHint: field.text("Example 3", "all of them, fast"),
  oneOn: field.word("Point 1 on", "fly"),
  twoOn: field.word("Point 2 on", "collect"),
  threeOn: field.word("Point 3 on", "win"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.blue;
const H = 620;

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useBrand();
  const ons = [
    wordFrame(words, params.oneOn, 48),
    wordFrame(words, params.twoOn, 74),
    wordFrame(words, params.threeOn, 99),
  ];
  const items = [
    { t: params.one, h: params.oneHint },
    { t: params.two, h: params.twoHint },
    { t: params.three, h: params.threeHint },
  ];
  const head = params.headline.split(" ").map((t, i) => ({ text: t, at: [0, 10, 17][i] ?? 17 + i * 3 }));
  const caret = Math.floor(frame / 9) % 2 === 0;
  const describeAt = wordFrame(words, "describe", 30);
  const barGlow = interpolate(frame, [describeAt - 2, describeAt + 6], [0, 1], clampAll);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={700} fromX={515} fromY={760} />
      <GameMotif src={GAME} atSec={9} opacity={0.08} />
      <Camera duration={durationInFrames} punchAt={[ons[2]]}>
        <Headline lines={[head]} size={84} top={262} color={COLOR} />
        <div style={{ position: "absolute", left: 130, top: 405, ...cardMotion(frame, -40) }}>
          <ClaudeWindow height={H} glow={COLOR}>
            {/* the empty prompt bar */}
            <div
              style={{
                position: "absolute",
                left: 28,
                right: 28,
                top: 26,
                height: 96,
                borderRadius: 26,
                background: "rgba(255,255,255,0.06)",
                border: `2px solid ${barGlow > 0.5 ? COLOR : "rgba(255,255,255,0.16)"}`,
                boxShadow: `0 0 ${barGlow * 50}px ${COLOR}66`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "0 26px",
              }}
            >
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, color: COLOR }}>›</span>
              <span style={{ width: 4, height: 44, background: "#fff", opacity: caret ? 1 : 0 }} />
              <span style={{ fontFamily: c.fontUi, fontWeight: 600, fontSize: 34, color: "rgba(255,255,255,0.35)" }}>
                describe your tiny game…
              </span>
            </div>
            {/* the checklist */}
            {items.map((it, i) => {
              const at = ons[i] - 3;
              const s = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });
              const on = frame >= at;
              const top = 156 + i * 128;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: 36,
                    right: 36,
                    top,
                    height: 108,
                    borderRadius: 26,
                    display: "flex",
                    alignItems: "center",
                    gap: 26,
                    padding: "0 22px",
                    background: on ? `rgba(59,130,246,${0.1 + 0.08 * s})` : "transparent",
                    border: on ? `1.5px solid rgba(59,130,246,0.45)` : "1.5px dashed rgba(255,255,255,0.14)",
                    transform: `scale(${on ? interpolate(s, [0, 1], [0.92, 1]) : 1})`,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      flexShrink: 0,
                      background: on ? COLOR : "transparent",
                      border: on ? "none" : "3px solid rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `scale(${on ? interpolate(s, [0, 1], [0.5, 1]) : 1})`,
                      fontFamily: c.fontUi,
                      fontWeight: 800,
                      fontSize: 32,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {on ? <CheckIcon size={40} color="#fff" /> : i + 1}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontFamily: c.fontUi,
                        fontWeight: 800,
                        fontSize: 46,
                        lineHeight: 1.1,
                        color: on ? "#fff" : "rgba(255,255,255,0.32)",
                      }}
                    >
                      {it.t}
                    </span>
                    <span
                      style={{
                        fontFamily: c.fontUi,
                        fontWeight: 600,
                        fontSize: 28,
                        color: "rgba(255,255,255,0.55)",
                        opacity: interpolate(frame - at, [4, 12], [0, 1], clampAll),
                        transform: `translateY(${interpolate(frame - at, [4, 12], [10, 0], clampAll)}px)`,
                      }}
                    >
                      e.g. {it.h}
                    </span>
                  </div>
                </div>
              );
            })}
          </ClaudeWindow>
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
