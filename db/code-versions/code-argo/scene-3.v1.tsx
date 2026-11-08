import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Dock, GREEN, Headline, Motif, pop, prog, REC, Shot, WindowCard } from "./shared";

export const description =
  "Light scene: the real agent panel shows the step bar on Angle, then glides down to the template card the agent picked, which lights up with a green check";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "Picks the *template*"),
  panOn: field.word("View moves to the template on", "template"),
  checkOn: field.word("Green check on", "fits"),
});
type Params = z.infer<typeof schema>;

const SCALE = 2.44;
const BODY_H = 500;
const X0 = 1240;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const panAt = wordFrame(words, params.panOn, 38) - 8;
  const checkAt = wordFrame(words, params.checkOn, 56) - 2;

  const card = cardMove(frame, -10, -10, 3);
  const pan = prog(frame, panAt, 16);
  const y = interpolate(pan, [0, 1], [104, 314]);
  const ring = prog(frame, checkAt, 8);
  const badge = Math.min(pop(frame, checkAt), 1.1);

  return (
    <AbsoluteFill>
      <Background color={COL.blue} light y={660}>
        <Motif light size={300} y={700} rotate={-12}>template</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={checkAt}>
        <Headline line1={params.line1} color={COL.blue} light start={-6} />

        <div style={{ position: "absolute", left: 110, top: 380, width: 860, height: BODY_H + 80, ...card }}>
          <WindowCard light bodyHeight={BODY_H} label="AI agent · step 2: Angle">
            <Shot src={REC.hooks} at={8.5} freeze x={X0} y={y} scale={SCALE} width={840} height={BODY_H} />
            {/* the picked template card lights up */}
            <div
              style={{
                position: "absolute",
                left: (1246 - X0) * SCALE,
                top: (318 - y) * SCALE,
                width: 333 * SCALE,
                height: 238 * SCALE,
                borderRadius: 30,
                border: `5px solid ${COL.blue}`,
                boxShadow: `0 0 50px ${COL.blue}`,
                opacity: ring * (0.75 + Math.sin(frame / 6) * 0.25),
              }}
            />
          </WindowCard>
          {/* green check badge on the card's corner */}
          <div
            style={{
              position: "absolute",
              right: -26,
              top: -30,
              width: 110,
              height: 110,
              borderRadius: 55,
              background: GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: c.fontUi,
              fontWeight: 900,
              fontSize: 62,
              scale: `${badge}`,
              boxShadow: `0 0 40px ${GREEN}aa, 0 14px 30px rgba(20,30,60,0.2)`,
            }}
          >
            ✓
          </div>
        </div>

        <Dock light done={[1, 0, 0, 0, 0]} active={1} color={COL.blue} />
      </Camera>
    </AbsoluteFill>
  );
}
