import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Cursor, Dock, Headline, Motif, OwnOr, pop, prog, REC, Shot, WindowCard } from "./shared";

export const description =
  "The real TikMaker agent panel: the idea is typed into the 'Video idea' box, the view glides down to Start and a cursor clicks it; the Idea step ticks in the dock";

const RECORD =
  "TikMaker, an empty project, the AI agent panel on the right. Click 'Video idea', type your one sentence, scroll to the 'Start' button and click it. Crop to the agent panel. About 3 s.";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "Type the *idea*"),
  line2: field.text("Second line", "→ hit *Start*"),
  demo: field.recording("Your recording (optional)", RECORD),
  typeOn: field.word("Typing starts on", "type"),
  startOn: field.word("Start is clicked on", "Start"),
});
type Params = z.infer<typeof schema>;

const SCALE = 2.33;
const BODY_W = 840;
const BODY_H = 520;
const CARD = { left: 110, top: 384 };

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const typeAt = wordFrame(words, params.typeOn, 19);
  const startAt = wordFrame(words, params.startOn, 84);

  const card = cardMove(frame, -10, 10, 2);
  // the view glides from the idea box down to the Start button
  const pan = prog(frame, startAt - 22, 16);
  const y = interpolate(pan, [0, 1], [112, 500]);
  // Start button in the body (source 1412, 698)
  const btn = { x: (1412 - 1238) * SCALE, y: (698 - y) * SCALE };
  const clicked = prog(frame, startAt, 8);
  const tick = Math.min(pop(frame, startAt + 2), 1.1);

  return (
    <AbsoluteFill>
      <Background color={COL.purple} y={700}>
        <Motif size={420} y={720} rotate={-10}>idea</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={startAt}>
        <Headline line1={params.line1} line2={params.line2} color="#b39bff" start={-6} start2={startAt - 12} />

        <div style={{ position: "absolute", ...CARD, width: 860, height: BODY_H + 80, ...card }}>
          <WindowCard bodyHeight={BODY_H} label="TikMaker · AI agent">
            <OwnOr src={params.demo} record={RECORD} width={BODY_W} height={BODY_H}>
              <Shot src={REC.form} at={6.2 - (typeAt * 1.8) / 30} rate={1.8} x={1238} y={y} scale={SCALE} width={BODY_W} height={BODY_H} />
              {/* the Start button lights up when clicked */}
              <div
                style={{
                  position: "absolute",
                  left: btn.x - 400,
                  top: btn.y - 42,
                  width: 800,
                  height: 84,
                  borderRadius: 14,
                  border: `4px solid ${COL.orange}`,
                  boxShadow: `0 0 40px ${COL.orange}`,
                  opacity: params.demo ? 0 : clicked * (1 - prog(frame, startAt + 14, 10) * 0.4),
                }}
              />
            </OwnOr>
          </WindowCard>
        </div>

        <Cursor
          from={[900, 1080]}
          to={[CARD.left + 10 + btn.x + 40, CARD.top + 70 + btn.y]}
          moveAt={startAt - 14}
          clickAt={startAt}
          color={COL.orange}
        />

        <Dock done={[tick, 0, 0, 0, 0]} active={frame >= startAt ? 1 : 0} color={COL.purple} />
      </Camera>
    </AbsoluteFill>
  );
}
