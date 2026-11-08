import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Dock, EditorShot, Headline, Motif, OwnOr, pop, prog, WindowCard } from "./shared";

export const description =
  "Light scene: the real TikMaker editor in a big card – its timeline tracks and the scene strip fill with the video's blocks from left to right, and the Result step ticks";

const RECORD =
  "TikMaker editor right after the agent finished: the scene strip along the bottom fills with scenes, the timeline shows each scene's blocks, voice and caption clips; press play so the vertical preview plays with its captions. About 3 s.";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "Lands in the *timeline*"),
  demo: field.recording("Your recording (optional)", RECORD),
  fillOn: field.word("Timeline fills on", "lands"),
  doneOn: field.word("Result ticks on", "timeline"),
});
type Params = z.infer<typeof schema>;

// window onto the editor screenshot (display units): preview controls,
// timeline and scene strip
const X0 = 240;
const Y0 = 470;
const SCALE = 840 / 1300;
const BODY_H = Math.round(780 * SCALE);
const TRACKS = { top: (845 - Y0) * SCALE, bottom: (1122 - Y0) * SCALE };
const STRIP = { top: (1128 - Y0) * SCALE };

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const fillAt = wordFrame(words, params.fillOn, 38) - 4;
  const doneAt = wordFrame(words, params.doneOn, 75);
  const card = cardMove(frame, -10, -8, 7);
  const fill = prog(frame, fillAt, Math.max(12, doneAt - fillAt - 6));
  const strip = prog(frame, fillAt + 8, Math.max(12, doneAt - fillAt - 6));
  const result = Math.min(pop(frame, doneAt), 1.1);
  const edge = (p: number) => interpolate(p, [0, 1], [0, 900]);

  return (
    <AbsoluteFill>
      <Background color={COL.teal} light y={680}>
        <Motif light size={340} y={700} rotate={-10}>timeline</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={doneAt}>
        <Headline line1={params.line1} color="#0d9488" light start={-6} />

        <div style={{ position: "absolute", left: 110, top: 360, width: 860, height: BODY_H + 80, ...card }}>
          <WindowCard light bodyHeight={BODY_H} label="TikMaker · editor">
            <OwnOr src={params.demo} record={RECORD} width={840} height={BODY_H}>
              <EditorShot x={X0} y={Y0} scale={SCALE} width={840} height={BODY_H} />
              {/* the timeline and the scene strip, still empty – the clips arrive left to right */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: TRACKS.top,
                  height: TRACKS.bottom - TRACKS.top,
                  background: `linear-gradient(90deg, transparent ${edge(fill) - 60}px, #141414 ${edge(fill)}px)`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: STRIP.top,
                  bottom: 0,
                  background: `linear-gradient(90deg, transparent ${edge(strip) - 60}px, #0f0f0f ${edge(strip)}px)`,
                }}
              />
              {/* a light sweeping with the fill */}
              <div
                style={{
                  position: "absolute",
                  top: TRACKS.top,
                  bottom: 0,
                  left: edge(fill) - 8,
                  width: 6,
                  background: COL.teal,
                  boxShadow: `0 0 30px ${COL.teal}`,
                  opacity: fill > 0 && fill < 1 ? 1 : 0,
                }}
              />
            </OwnOr>
          </WindowCard>
        </div>

        <Dock light done={[1, 1, 1, 1, result]} active={frame >= doneAt ? -1 : 4} color={COL.teal} />
      </Camera>
    </AbsoluteFill>
  );
}
