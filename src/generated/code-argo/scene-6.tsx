import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Dock, glass, GREEN, Headline, Motif, pop, prog, REC, Shot } from "./shared";

export const description =
  "Three real agent cards pop in one after another – voiceover for all scenes, pictures written as code, and the self-review that checked every scene's frames – and the last one gets a green check";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "Builds *every* scene"),
  line2: field.text("Second line", "+ checks its frames"),
  card2On: field.word("Second card on", "every"),
  card3On: field.word("Self-review card on", "checks"),
  checkOn: field.word("Green check on", "frames"),
});
type Params = z.infer<typeof schema>;

const SCALE = 2.2;
const X0 = 1246;
const SRC_W = 332;
// the three cards in the finished run's panel (source y, height)
const CARDS = [
  { y: 398, h: 56 },
  { y: 478, h: 52 },
  { y: 560, h: 104 },
];
const TOP = 392;
const GAP = 18;

export default function Scene6({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const at = [-10, wordFrame(words, params.card2On, 28) - 4, wordFrame(words, params.card3On, 56) - 4];
  const checkAt = wordFrame(words, params.checkOn, 84) - 2;
  const check = Math.min(pop(frame, checkAt), 1.1);
  const glow = prog(frame, checkAt, 10);

  let top = TOP;
  return (
    <AbsoluteFill>
      <Background color={COL.purple} y={700}>
        <Motif size={900} y={720} rotate={-8}>11</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={checkAt}>
        <Headline line1={params.line1} line2={params.line2} color="#b39bff" start={-6} start2={at[2]} />

        {CARDS.map((card, i) => {
          const m = cardMove(frame, at[i], i % 2 ? 8 : -8, i + 6);
          const h = card.h * SCALE;
          const y = top;
          top += h + 20 + GAP;
          const last = i === CARDS.length - 1;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: (1080 - SRC_W * SCALE - 20) / 2,
                top: y,
                padding: 10,
                ...glass(false, 32),
                ...(last && glow > 0 ? { border: `4px solid ${GREEN}`, boxShadow: `0 0 ${60 * glow}px ${GREEN}88, 0 32px 80px rgba(0,0,0,0.5)` } : {}),
                ...m,
              }}
            >
              <div style={{ borderRadius: 22, overflow: "hidden" }}>
                <Shot src={REC.agent} at={15.5} freeze x={X0} y={card.y} scale={SCALE} width={SRC_W * SCALE} height={h} />
              </div>
              {last ? (
                <div
                  style={{
                    position: "absolute",
                    right: -26,
                    top: -28,
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    background: GREEN,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: c.fontUi,
                    fontSize: 58,
                    fontWeight: 900,
                    scale: `${check}`,
                    rotate: `${interpolate(check, [0, 1], [-30, 0])}deg`,
                    boxShadow: `0 0 40px ${GREEN}`,
                  }}
                >
                  ✓
                </div>
              ) : null}
            </div>
          );
        })}

        <Dock done={[1, 1, 1, 0, 0]} active={3} color={COL.purple} />
      </Camera>
    </AbsoluteFill>
  );
}
