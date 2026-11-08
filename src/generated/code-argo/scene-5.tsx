import { z } from "zod";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Cursor, Dock, Headline, Motif, OwnOr, pop, prog, REC, Shot, WindowCard } from "./shared";

export const description =
  "The real script card in the agent panel scrolls scene by scene; at the end a cursor clicks the orange Approve button and the dock moves from Script to Building";

const RECORD =
  "TikMaker agent panel on the script card: scroll slowly through the scenes (each with its voiceover and what it shows), then click 'Approve' so the step bar moves to Building. Crop to the panel. About 3.5 s.";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "The whole *script*"),
  line2: field.text("Second line", "scene by scene"),
  demo: field.recording("Your recording (optional)", RECORD),
  sceneOn: field.word("Second line appears on", "scene"),
  approveOn: field.word("Approve is clicked on", "Approve"),
});
type Params = z.infer<typeof schema>;

const SCALE = 2.44;
const X0 = 1240;
const Y0 = 684;
const BODY_H = 500;
const CARD = { left: 110, top: 392 };
// the Approve button in the recording's last frames (source px)
const APPROVE = { x: 1296, y: 846 };

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const sceneAt = wordFrame(words, params.sceneOn, 38) - 3;
  const approveAt = wordFrame(words, params.approveOn, 84);
  const card = cardMove(frame, -10, 10, 5);
  const lit = prog(frame, approveAt, 8);
  const tick = Math.min(pop(frame, approveAt + 2), 1.1);
  const btn = { x: (APPROVE.x - X0) * SCALE, y: (APPROVE.y - Y0) * SCALE };
  // the recording runs 2x: from 11 s, its last scroll ends just before Approve
  const at = 18.6 - (approveAt * 2) / 30;

  return (
    <AbsoluteFill>
      <Background color={COL.blue} y={700}>
        <Motif size={380} y={700} rotate={-10}>script</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={approveAt}>
        <Headline line1={params.line1} line2={params.line2} color="#7fb0ff" start={-6} start2={sceneAt} />

        <div style={{ position: "absolute", ...CARD, width: 860, height: BODY_H + 80, ...card }}>
          <WindowCard bodyHeight={BODY_H} label="AI agent · step 3: Script">
            <OwnOr src={params.demo} record={RECORD} width={840} height={BODY_H}>
              <Shot src={REC.approve} at={at} rate={2} x={X0} y={Y0} scale={SCALE} width={840} height={BODY_H} />
              <div
                style={{
                  position: "absolute",
                  left: btn.x - 100,
                  top: btn.y - 40,
                  width: 200,
                  height: 80,
                  borderRadius: 18,
                  border: `4px solid #fff`,
                  boxShadow: `0 0 40px ${COL.orange}, 0 0 80px ${COL.orange}`,
                  opacity: lit * (1 - prog(frame, approveAt + 16, 8) * 0.5),
                }}
              />
            </OwnOr>
          </WindowCard>
        </div>

        <Cursor
          from={[900, 1080]}
          to={[CARD.left + 10 + btn.x + 30, CARD.top + 70 + btn.y]}
          moveAt={approveAt - 14}
          clickAt={approveAt}
          color={COL.orange}
        />

        <Dock done={[1, 1, tick, 0, 0]} active={frame >= approveAt ? 3 : 2} color={COL.blue} />
      </Camera>
    </AbsoluteFill>
  );
}
