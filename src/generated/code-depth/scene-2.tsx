import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Background,
  Camera,
  clamp,
  CLAUDE_LOGO,
  COL,
  Dock,
  EASE,
  glass,
  Headline,
  pop,
  prog,
  SHOT,
  SideShot,
} from "./shared";

export const description =
  "A big glass tile counts up to 3 over blurred Claude Code docs; three empty numbered slots drop into the dock below";

export const schema = z.object({
  count: field.number("The number", 3, { min: 1, max: 9 }),
  line1: field.text("Line 1 (*word* – key word)", "Claude Code *commands*"),
  line2: field.text("Line 2 (grey)", "most people never use"),
  countOn: field.word("Counter lands on", "three"),
  slotsOn: field.word("Slots drop in on", "commands"),
  line2On: field.word("Line 2 on", "most"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const countAt = wordFrame(words, params.countOn, 28);
  const slotsAt = wordFrame(words, params.slotsOn, 56) - 4;
  const line1At = wordFrame(words, "Claude", 38) - 3;
  const line2At = wordFrame(words, params.line2On, 66) - 3;

  // 1 → count, fast then slowing, landing on the word
  const run = interpolate(frame, [countAt - 14, countAt], [0, 1], { ...clamp, easing: EASE });
  const n = Math.max(1, Math.round(interpolate(run, [0, 1], [1, params.count])));
  const landed = pop(frame, countAt, 10, 200);
  const tickPunch = interpolate(frame, [countAt, countAt + 3, countAt + 12], [1, 1.12, 1], clamp);

  const settle = prog(frame, 0, 20);
  const float = Math.sin(frame / 14) * 8;

  return (
    <AbsoluteFill>
      <Background color={COL.purple} y={500}>
        <SideShot src={SHOT.commands} side="left" y={300} />
        <SideShot src={SHOT.skills} side="right" y={560} />
      </Background>
      <Camera duration={durationInFrames} punchAt={countAt}>
        {/* the number tile */}
        <div
          style={{
            position: "absolute",
            left: 540 - 220,
            top: 230,
            width: 440,
            height: 420,
            ...glass(false, 90),
            background: "linear-gradient(160deg, rgba(139,92,246,0.35), rgba(255,255,255,0.05) 60%)",
            boxShadow: `0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5), 0 0 ${60 * landed}px ${COL.purple}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `perspective(1200px) rotateY(${interpolate(settle, [0, 1], [14, 0]) + Math.sin(frame / 30) * 3}deg) rotateX(${interpolate(settle, [0, 1], [8, 2])}deg)`,
            translate: `0px ${float}px`,
          }}
        >
          <div
            style={{
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 330,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              fontVariantNumeric: "tabular-nums",
              background: "linear-gradient(180deg, #ffffff 30%, #c9c2e8)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              scale: `${tickPunch}`,
              marginTop: -10,
            }}
          >
            {n}
          </div>
          <Img
            src={CLAUDE_LOGO}
            style={{
              position: "absolute",
              right: -30,
              top: -30,
              width: 110,
              height: 110,
              padding: 20,
              borderRadius: 34,
              background: "#1a1420",
              border: "1.5px solid rgba(255,255,255,0.18)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
              scale: `${Math.min(pop(frame, line1At - 4), 1.1)}`,
              rotate: "8deg",
            }}
          />
        </div>

        <Headline
          line1={params.line1}
          line2={params.line2}
          color="#b9a3ff"
          start={line1At}
          start2={line2At}
          top={712}
          size={72}
        />

        <Dock
          fill={[0, 0, 0]}
          show={[0, 1, 2].map((i) => Math.min(pop(frame, slotsAt + i * 3, 13, 170), 1.06))}
        />
      </Camera>
    </AbsoluteFill>
  );
}
