import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Cursor, Dock, glass, Headline, Motif, OwnOr, pop, prog, REC, Shot, WindowCard } from "./shared";

export const description =
  "Three real hook options from the agent panel stand as a glass deck; a cursor clicks one, it lights up while the other two sink back";

const RECORD =
  "TikMaker agent panel on the 'Pick the opening line' card: the three hooks, each with what it shows. Move the mouse over them and click one. Crop to the card. About 3 s.";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "*3* hooks"),
  demo: field.recording("Your recording (optional)", RECORD),
  picked: field.number("Hook that gets picked (1–3)", 2, { min: 1, max: 3 }),
  threeOn: field.word("Number punches on", "three"),
  pickOn: field.word("Hook is clicked on", "pick"),
});
type Params = z.infer<typeof schema>;

// the three hook rows in the recording (source y), all 316 px wide from x 1254
const ROWS = [628, 713, 799];
const ROW_H = 80;
const SCALE = 2.15;
const W = 316 * SCALE; // 679
const H = ROW_H * SCALE; // 172
const LEFT = (1080 - W - 20) / 2;
const TOP = 346;
const GAP = 22;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const threeAt = wordFrame(words, params.threeOn, 28) - 3;
  const pickAt = wordFrame(words, params.pickOn, 66);
  const pick = Math.max(0, Math.min(2, Math.round(params.picked) - 1));
  const chosen = prog(frame, pickAt, 10);
  const tick = Math.min(pop(frame, pickAt + 4), 1.1);
  const target: [number, number] = [LEFT + W * 0.7, TOP + pick * (H + 20 + GAP) + H * 0.6];

  return (
    <AbsoluteFill>
      <Background color={COL.amber} y={680}>
        <Motif size={1100} y={720} rotate={-6}>3</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={threeAt + 6}>
        <Headline line1={params.line1} color={COL.amber} start={-6} size={96} />

        {params.demo ? (
          <div style={{ position: "absolute", left: 110, top: 360, width: 860, height: 600, ...cardMove(frame, -10, -10, 4) }}>
            <WindowCard bodyHeight={530} label="AI agent · pick the hook">
              <OwnOr src={params.demo} record={RECORD} width={840} height={530}>
                {null}
              </OwnOr>
            </WindowCard>
          </div>
        ) : (
          ROWS.map((y, i) => {
            const m = cardMove(frame, -12 + i * 3, i === 1 ? 0 : i === 0 ? -8 : 8, i);
            const fan = interpolate(prog(frame, -12 + i * 3, 18), [0, 1], [(i - 1) * 5, 0]);
            const isPick = i === pick;
            const dim = isPick ? 0 : chosen;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: LEFT,
                  top: TOP + i * (H + 20 + GAP),
                  padding: 10,
                  ...glass(false, 34),
                  ...(isPick && chosen > 0
                    ? { border: `4px solid ${COL.orange}`, boxShadow: `0 0 ${50 * chosen}px ${COL.orange}, 0 32px 80px rgba(0,0,0,0.5)` }
                    : {}),
                  opacity: m.opacity * (1 - dim * 0.55),
                  transform: `${m.transform} rotateZ(${fan}deg) scale(${isPick ? 1 + chosen * 0.04 : 1 - dim * 0.05})`,
                  filter: `blur(${dim * 3}px)`,
                }}
              >
                <div style={{ borderRadius: 24, overflow: "hidden" }}>
                  <Shot src={REC.hooks} at={8.5} freeze x={1254} y={y} scale={SCALE} width={W} height={H} />
                </div>
                {isPick ? (
                  <div
                    style={{
                      position: "absolute",
                      right: -22,
                      top: -22,
                      width: 70,
                      height: 70,
                      borderRadius: 35,
                      background: COL.orange,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 40,
                      fontWeight: 900,
                      scale: `${tick}`,
                      boxShadow: `0 0 30px ${COL.orange}`,
                    }}
                  >
                    ✓
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {params.demo ? null : <Cursor from={[980, 1060]} to={target} moveAt={pickAt - 14} clickAt={pickAt} color={COL.orange} />}

        <Dock done={[1, tick, 0, 0, 0]} active={frame >= pickAt ? 2 : 1} color={COL.amber} />
      </Camera>
    </AbsoluteFill>
  );
}
