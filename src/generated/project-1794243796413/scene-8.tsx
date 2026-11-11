import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { MONO, SCENE_COLORS, asset, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { ASSETS, Backdrop, Camera, Headline, cardMotion, clampAll, glass, usePop, words as w } from "./shared";

export const description =
  "A glass Claude Code terminal: 'build me the game I wish existed' is typed letter by letter, then a 'v1 · this weekend' pill pops under it";

export const schema = z.object({
  title: field.text("Headline", "Ask *Claude Code*"),
  prompt: field.text("Typed prompt", "build me the game I wish existed"),
  pill: field.text("Pill", "v1 · this weekend"),
  typeOn: field.word("Typing starts on", "ask"),
  pillOn: field.word("Pill pops on", "weekend"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.purple;

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typeOn, 13);
  const claude = wordFrame(words, "Claude", 22);
  const pillAt = wordFrame(words, params.pillOn, 77);
  const typeEnd = Math.max(typeAt + 20, pillAt - 10);
  const shown = Math.round(
    interpolate(frame, [typeAt, typeEnd], [0, params.prompt.length], clampAll),
  );
  const caretOn = Math.floor(frame / 8) % 2 === 0 || (frame > typeAt && frame < typeEnd);
  const pill = usePop(pillAt);
  const glowOn = interpolate(frame, [typeEnd - 4, typeEnd + 6], [0, 1], clampAll);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={640} fromY={700} />
      <Camera duration={durationInFrames} punchAt={[pillAt]}>
        <Headline lines={[w(params.title, Math.min(4, claude), Math.max(3, claude - 6))]} size={96} top={262} color={COLOR} />
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 430,
            width: 770,
            ...glass(770),
            borderRadius: 40,
            overflow: "hidden",
            ...cardMotion(frame, -40),
            boxShadow: `0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5), 0 0 ${90 * glowOn}px ${COLOR}88`,
          }}
        >
          <div style={{ height: 76, display: "flex", alignItems: "center", gap: 12, padding: "0 26px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.3)" }} />
            ))}
            <div
              style={{
                marginLeft: 14,
                height: 46,
                borderRadius: 23,
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 22px",
              }}
            >
              <Img src={asset(ASSETS.claude)} style={{ width: 30, height: 30 }} />
              <span style={{ fontFamily: c.fontUi, fontWeight: 700, fontSize: 27, color: "rgba(255,255,255,0.9)" }}>
                Claude Code
              </span>
            </div>
          </div>
          <div style={{ padding: "24px 40px 48px" }}>
            <div
              style={{
                borderRadius: 24,
                border: "2px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.25)",
                padding: "30px 32px",
                minHeight: 200,
                boxSizing: "border-box",
                fontFamily: MONO,
                fontSize: 50,
                lineHeight: 1.3,
                color: "#fff",
              }}
            >
              <span style={{ color: COLOR, fontWeight: 700 }}>{"> "}</span>
              {params.prompt.slice(0, shown)}
              <span
                style={{
                  display: "inline-block",
                  width: 26,
                  height: 52,
                  marginLeft: 4,
                  verticalAlign: "-8px",
                  background: caretOn ? "rgba(255,255,255,0.85)" : "transparent",
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 130, width: 770, top: 850, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              height: 110,
              padding: "0 48px",
              borderRadius: 55,
              background: COLOR,
              boxShadow: `0 12px 40px ${COLOR}88`,
              display: "flex",
              alignItems: "center",
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 56,
              color: "#fff",
              whiteSpace: "nowrap",
              opacity: pill.opacity,
              transform: `scale(${pill.scale}) translateY(${Math.sin(frame / 14) * 5}px)`,
            }}
          >
            {params.pill}
          </div>
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
