import { z } from "zod";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MONO, SCENE_COLORS, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Backdrop,
  BulbIcon,
  Camera,
  CheckIcon,
  ClaudeWindow,
  GAME,
  GameMotif,
  Headline,
  PlaneIcon,
  TrophyIcon,
  cardMotion,
  clampAll,
  usePop,
} from "./shared";

export const description =
  "An empty Claude Code prompt in a big glass window; a three-line checklist – what you fly, what you collect, how you win – ticks off point by point, each row getting its game icon: a paper plane, a glowing light, a trophy";

export const schema = z.object({
  headline: field.text("Headline", "Open *Claude* *Code*"),
  one: field.text("Point 1", "What you fly"),
  two: field.text("Point 2", "What you collect"),
  three: field.text("Point 3", "How you win"),
  placeholder: field.text("Prompt placeholder", "describe your game…"),
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
    { t: params.one },
    { t: params.two },
    { t: params.three },
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
              <span style={{ fontFamily: c.fontUi, fontWeight: 700, fontSize: 48, color: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>
                {params.placeholder}
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
                  {/* the example: a small game icon popping in at the row's end */}
                  <GameBadge kind={i} at={at + 4} />
                </div>
              );
            })}
          </ClaudeWindow>
        </div>
      </Camera>
    </AbsoluteFill>
  );
}

// The row's example as a small game icon: the paper plane, a glowing light
// (the 22 lights you collect), the trophy – each in its own glowing chip.
const BADGES = [
  { bg: "#ffffff", ink: "#1d4ed8", glow: "rgba(255,255,255,0.55)" },
  { bg: "#fbbf24", ink: "#3b2300", glow: "rgba(251,191,36,0.85)" },
  { bg: "#f59e0b", ink: "#3b2300", glow: "rgba(245,158,11,0.7)" },
];
function GameBadge({ kind, at }: { kind: number; at: number }) {
  const frame = useCurrentFrame();
  const pop = usePop(at);
  if (frame < at - 1) return null;
  const b = BADGES[kind] ?? BADGES[0];
  const pulse = 1 + Math.sin((frame - at) / 6) * 0.06;
  const size = 76;
  const icon =
    kind === 0 ? (
      <PlaneIcon size={46} color={b.ink} stroke={4} />
    ) : kind === 1 ? (
      <BulbIcon size={46} color={b.ink} stroke={4} />
    ) : (
      <TrophyIcon size={46} color={b.ink} stroke={3.8} />
    );
  return (
    <div
      style={{
        marginLeft: "auto",
        width: size,
        height: size,
        borderRadius: size / 2,
        flexShrink: 0,
        background: b.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: pop.opacity,
        transform: `scale(${pop.scale}) rotate(${interpolate(pop.scale, [0.5, 1], [-25, 0])}deg)`,
        boxShadow: `0 0 ${kind === 1 ? 46 * pulse : 30}px ${b.glow}, 0 6px 16px rgba(0,0,0,0.35)`,
      }}
    >
      {icon}
    </div>
  );
}
