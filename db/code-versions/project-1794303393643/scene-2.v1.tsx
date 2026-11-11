import { z } from "zod";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { MONO, SCENE_COLORS, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Backdrop,
  Camera,
  ClaudeWindow,
  CheckIcon,
  GAME,
  GameMotif,
  GlassPill,
  Headline,
  OUT,
  cardMotion,
  clampAll,
} from "./shared";

export const description =
  "A big glass Claude Code window: the prompt 'Turn this 3D city into a game…' types itself, is sent, and colourful code streams down; a 'zero code' pill pops below";

export const schema = z.object({
  prompt: field.text(
    "Prompt",
    "Turn this 3D city into a game I can play on my phone – a paper plane, lights to collect, rings for speed, fireworks at the finish",
    { long: true },
  ),
  headline: field.text("Headline", "3D city → *phone* *game*"),
  pill: field.text("Pill", "*zero* code by me"),
  sendOn: field.word("Prompt is sent on", "phone"),
  pillOn: field.word("Pill on", "no"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.purple;
const CODE_COLORS = ["#c4b5fd", "#5eead4", "#fbbf24", "#93c5fd", "#f472b6", "#ff7024", "rgba(255,255,255,0.55)"];
const W = 770;
const H = 530;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const send = wordFrame(words, params.sendOn, 75) - 4;
  const pillAt = wordFrame(words, params.pillOn, 109);

  // typing: the whole prompt by the time it is sent
  const typeEnd = send - 6;
  const shown = Math.round(interpolate(frame, [2, typeEnd], [0, params.prompt.length], clampAll));
  const sent = interpolate(frame, [send, send + 12], [0, 1], { ...clampAll, easing: OUT });
  const flash = interpolate(frame, [send - 1, send + 1, send + 10], [0, 1, 0], clampAll);
  const caretOn = Math.floor(frame / 8) % 2 === 0 && sent < 0.5;

  // headline words on the spoken words
  const hw = params.headline.split(" ");
  const ats = [wordFrame(words, "3D", 27), wordFrame(words, "city", 37), wordFrame(words, "into", 67), wordFrame(words, "phone", 75), wordFrame(words, "game", 82)];
  const head = hw.map((t, i) => ({ text: t, at: ats[i] ?? 82 + i * 3 }));

  // the prompt box: big while typing, compact once sent
  const boxH = interpolate(sent, [0, 1], [330, 92]);
  const bodyH = H - 78;
  const codeTop = boxH + 48;
  const scroll = Math.max(0, frame - send) * 9 + Math.max(0, frame - send - 20) * 4;

  const rows = Array.from({ length: 48 }, (_, i) => {
    const indent = Math.floor(random(`i${i}`) * 4) * 34;
    const n = 2 + Math.floor(random(`n${i}`) * 4);
    const tokens = Array.from({ length: n }, (_, k) => ({
      w: 40 + random(`w${i}-${k}`) * 150,
      col: CODE_COLORS[Math.floor(random(`c${i}-${k}`) * CODE_COLORS.length)],
    }));
    return { indent, tokens };
  });

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={690} />
      <GameMotif src={GAME} atSec={6} opacity={0.1} />
      <Camera duration={durationInFrames} punchAt={[send]}>
        <Headline lines={[head]} size={84} top={262} color={COLOR} />
        <div style={{ position: "absolute", left: 130, top: 410, ...cardMotion(frame, -40) }}>
          <ClaudeWindow height={H} glow={COLOR}>
            {/* the prompt box */}
            <div
              style={{
                position: "absolute",
                left: 28,
                right: 28,
                top: 26,
                height: boxH,
                borderRadius: 26,
                background: `rgba(255,255,255,${0.06 + flash * 0.12})`,
                border: `2px solid ${sent > 0.5 ? "rgba(255,255,255,0.14)" : COLOR}`,
                boxShadow: `0 0 ${30 + flash * 60}px ${COLOR}55`,
                padding: "22px 26px",
                boxSizing: "border-box",
                overflow: "hidden",
                display: "flex",
                gap: 16,
              }}
            >
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: COLOR, lineHeight: 1.35 }}>›</span>
              <span
                style={{
                  fontFamily: c.fontUi,
                  fontWeight: 600,
                  fontSize: 38,
                  lineHeight: 1.32,
                  color: "#fff",
                  opacity: 1 - sent * 0.35,
                  whiteSpace: sent > 0.5 ? "nowrap" : "normal",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {params.prompt.slice(0, shown)}
                <span style={{ opacity: caretOn ? 1 : 0, color: COLOR }}>▍</span>
              </span>
              {sent > 0.5 ? (
                <div
                  style={{
                    marginLeft: "auto",
                    flexShrink: 0,
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    background: SCENE_COLORS.teal,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: `scale(${interpolate(frame, [send + 6, send + 12], [0.5, 1], clampAll)})`,
                  }}
                >
                  <CheckIcon size={32} color="#fff" />
                </div>
              ) : null}
            </div>
            {/* colourful code streaming down (not meant to be read) */}
            <div
              style={{
                position: "absolute",
                left: 28,
                right: 28,
                top: codeTop,
                height: bodyH - codeTop - 20,
                overflow: "hidden",
                opacity: interpolate(frame, [send + 2, send + 8], [0, 1], clampAll),
                maskImage: "linear-gradient(to bottom, transparent 0%, #000 14%, #000 80%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 14%, #000 80%, transparent 100%)",
              }}
            >
              <div style={{ transform: `translateY(${bodyH - codeTop - scroll}px)` }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ height: 34, display: "flex", alignItems: "center", gap: 14, paddingLeft: 20 + r.indent }}>
                    {r.tokens.map((t, k) => (
                      <div key={k} style={{ width: t.w, height: 15, borderRadius: 8, background: t.col, opacity: 0.85 }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </ClaudeWindow>
        </div>
        <GlassPill at={pillAt - 3} text={params.pill} top={975} color={COLOR} size={40} />
      </Camera>
    </AbsoluteFill>
  );
}
