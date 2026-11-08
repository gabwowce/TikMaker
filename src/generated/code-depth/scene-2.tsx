import { z } from "zod";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { field, Logo, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CL, Dock, glass, Headline, HUE, Prompt, TiltCard, ramp, usePop } from "./shared";

export const description =
  "The dock with three empty numbered slots drops in; a big tilted Claude Code card counts up to 3 commands, a blurred terminal behind it";

export const schema = z.object({
  count: field.number("The number", 3, { min: 1, max: 9 }),
  unit: field.text("Under the number", "commands"),
  title: field.text("Headline", "Nobody uses *them*"),
  countOn: field.word("Counter runs on", "three"),
  titleOn: field.word("Headline on", "most"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pop = usePop();
  const countAt = wordFrame(words, params.countOn, 28);
  const titleAt = wordFrame(words, params.titleOn, 66);
  const claudeAt = wordFrame(words, "Claude", 38);
  const unitAt = wordFrame(words, "commands", 56);

  const n = Math.round(
    interpolate(frame, [countAt, countAt + 22], [0, params.count], { ...CL, easing: Easing.out(Easing.cubic) }),
  );
  const land = countAt + 22;
  const numPunch = interpolate(frame, [land - 2, land + 2, land + 10], [0, 0.12, 0], CL);
  const unitP = pop(frame, unitAt - 2);
  const logoP = pop(frame, claudeAt - 3);

  return (
    <AbsoluteFill>
      <Backdrop hue={HUE.blue} from={HUE.orange} />
      <Camera enter="zoom" punches={[land]}>
        {/* mid-ground: the Claude Code terminal, blurred */}
        <div
          style={{
            position: "absolute",
            left: 60,
            top: 560,
            width: 700,
            height: 480,
            filter: "blur(20px)",
            opacity: 0.55,
            transform: `translateY(${Math.sin(frame / 20) * 6}px) rotate(-4deg)`,
            ...glass(700, { padding: 40 }),
          }}
        >
          <Prompt text="claude" at={-20} size={48} />
          {[0.8, 0.6, 0.9, 0.5].map((w, i) => (
            <div key={i} style={{ marginTop: 34, height: 22, width: 560 * w, borderRadius: 11, background: "rgba(255,255,255,0.35)" }} />
          ))}
        </div>
        <TiltCard
          at={4}
          left={200}
          top={490}
          width={720}
          height={570}
          ry={16}
          rx={8}
          flat={ramp(frame, unitAt, 18) * 0.7}
        >
          <div
            style={{
              position: "absolute",
              left: 40,
              top: 36,
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 26px 12px 14px",
              borderRadius: 40,
              background: "rgba(255,255,255,0.1)",
              transform: `scale(${0.5 + 0.5 * logoP})`,
              transformOrigin: "0% 50%",
              opacity: Math.min(1, logoP * 1.5),
            }}
          >
            <Logo id="claude" size={52} />
            <div style={{ fontFamily: c.fontSemi, fontWeight: 700, fontSize: 38, color: "#fff" }}>Claude Code</div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 100,
              textAlign: "center",
              fontFamily: c.fontStrong,
              fontSize: 330,
              lineHeight: 1,
              color: "#fff",
              fontVariantNumeric: "tabular-nums",
              transform: `scale(${1 + numPunch})`,
              textShadow: `0 20px 80px ${HUE.blue}cc`,
              opacity: frame >= countAt - 2 ? 1 : 0.25,
            }}
          >
            {n}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 440,
              textAlign: "center",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 60,
              color: c.accent,
              transform: `scale(${0.5 + 0.5 * unitP})`,
              opacity: Math.min(1, unitP * 1.5),
            }}
          >
            {params.unit}
          </div>
        </TiltCard>
      </Camera>
      <Dock hue={HUE.blue} appearAt={2} filled={0} />
      <Headline lines={[{ text: params.title, at: titleAt }]} />
    </AbsoluteFill>
  );
}
