import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Dock, Headline, Motif, OwnOr, pop, prog, REC, Shot, WindowCard } from "./shared";

export const description =
  "The real TikMaker idea box with one typed sentence flies aside, and the real editor with the finished, agent-built video lands in its place while all five agent steps tick";

const RECORD =
  "TikMaker editor with a video the agent built: start on the empty project's 'Video idea' box with your one sentence typed, then cut to the same project built – the scene strip and timeline full, the vertical preview playing. 3–4 s, no mouse wandering.";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "*One* sentence"),
  line2: field.text("Second line", "→ *entire* video"),
  demo: field.recording("Your recording (optional)", RECORD),
  builtOn: field.word("The built video lands on", "built"),
  line2On: field.word("Second line appears on", "entire"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const builtAt = wordFrame(words, params.builtOn, 66) - 4;
  const line2At = wordFrame(words, params.line2On, 84) - 3;

  const idea = cardMove(frame, -10, -10, 0);
  const aside = prog(frame, builtAt, 16);
  const editor = cardMove(frame, builtAt, 12, 1);
  const done = [0, 1, 2, 3, 4].map((i) => Math.min(pop(frame, builtAt + 8 + i * 3), 1.1));

  return (
    <AbsoluteFill>
      <Background color={COL.orange} y={interpolate(aside, [0, 1], [620, 700])}>
        <Motif size={900} y={700}>1</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={builtAt + 10}>
        <Headline line1={params.line1} line2={params.line2} color={COL.orange} start={-6} start2={line2At} />

        {/* the one sentence, in the real idea box */}
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 440,
            width: 860,
            height: 400,
            opacity: idea.opacity * interpolate(aside, [0, 1], [1, 0.45]),
            transform: `${idea.transform} translateX(${aside * -470}px) translateY(${aside * -40}px) rotateY(${aside * 28}deg) scale(${1 - aside * 0.45})`,
            filter: `blur(${aside * 7}px)`,
          }}
        >
          <WindowCard bodyHeight={330} label="TikMaker · Video idea">
            <Shot src={REC.form} at={11} freeze x={1238} y={116} scale={2.33} width={840} height={330} />
          </WindowCard>
        </div>

        {/* the whole video, built, in the real editor */}
        <div style={{ position: "absolute", left: 140, top: 412, width: 800, height: 558, ...editor }}>
          <WindowCard width={800} bodyHeight={488} label="TikMaker · the built video">
            <OwnOr src={params.demo} record={RECORD} width={780} height={488}>
              <Shot src={REC.built} at={9 - builtAt / 30} x={0} y={0} scale={0.4875} width={780} height={488} />
            </OwnOr>
          </WindowCard>
        </div>

        <Dock done={done} active={-1} color={COL.orange} />
      </Camera>
    </AbsoluteFill>
  );
}
