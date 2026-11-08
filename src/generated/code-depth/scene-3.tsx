import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Background,
  Camera,
  clamp,
  COL,
  Dock,
  FileRow,
  Headline,
  LIGHT_TEXT,
  pop,
  prog,
  PromptLine,
  RewindIcon,
  TerminalCard,
  typed,
} from "./shared";

export const description =
  "Light scene: /rewind fills slot 1 of the dock, is typed into the Claude Code window, the three red files roll back one by one and turn green";

export const schema = z.object({
  headline: field.text("Headline (*word* – key word)", "*/rewind*"),
  file1: field.text("File 1", "auth.ts"),
  file2: field.text("File 2", "api.ts"),
  file3: field.text("File 3", "cart.ts"),
  command: field.text("Command typed", "/rewind"),
  slotOn: field.word("Slot 1 fills on", "rewind"),
  typeOn: field.word("Command typed on", "Type"),
  undoOn: field.word("Edits roll back on", "undoes"),
  cleanOn: field.word("Files turn green on", "Clean"),
});
type Params = z.infer<typeof schema>;

const CARD_W = 880;
const CARD_TOP = 372;
const CARD_H = 578;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const slotAt = wordFrame(words, params.slotOn, 19) - 3;
  const typeAt = wordFrame(words, params.typeOn, 28) - 3;
  const undoAt = wordFrame(words, params.undoOn, 75) - 3;
  const cleanAt = wordFrame(words, params.cleanOn, 150) - 3;
  const thoseAt = wordFrame(words, "Those", 113);

  const files = [params.file1, params.file2, params.file3];
  const rollStep = 10;
  const rolled = files.map((_, i) => prog(frame, undoAt + i * rollStep, 9));
  const undone = rolled.filter((r) => r > 0.5).length;

  const settle = prog(frame, 0, 20);
  const float = Math.sin(frame / 14) * 7;
  // the camera leans into the files on "Those three broken files?"
  const lean = interpolate(frame, [thoseAt - 4, thoseAt + 12], [0, 1], clamp);
  const greenGlow = prog(frame, cleanAt, 12);

  return (
    <AbsoluteFill>
      <Background color={COL.teal} light y={620}>
        <div
          style={{
            position: "absolute",
            left: 540 - 560,
            top: 660 - 560,
            opacity: 0.06,
            rotate: `${-10 - frame * 0.15}deg`,
            filter: "blur(4px)",
          }}
        >
          <RewindIcon size={1120} color="#1b1d22" />
        </div>
      </Background>
      <Camera duration={durationInFrames} punchAt={cleanAt}>
        <Headline line1={params.headline} color="#0f9488" light mono start={slotAt - 6} size={104} top={214} />

        <div
          style={{
            position: "absolute",
            left: (1080 - CARD_W) / 2,
            top: CARD_TOP,
            width: CARD_W,
            height: CARD_H,
            transform: `perspective(1200px) rotateY(${interpolate(settle, [0, 1], [10, 0]) + Math.sin(frame / 34) * 1.5}deg) rotateX(${interpolate(settle, [0, 1], [6, 0])}deg)`,
            translate: `0px ${float}px`,
            scale: `${1 + lean * 0.03}`,
          }}
        >
          <TerminalCard
            light
            height={CARD_H}
            style={{
              boxShadow: `0 6px 14px rgba(20,30,60,0.06), 0 24px 60px rgba(20,30,60,0.14), 0 0 ${80 * greenGlow}px rgba(34,197,94,${0.35 * greenGlow})`,
            }}
            right={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 20px",
                  borderRadius: 30,
                  background: greenGlow > 0.5 ? COL.green : "#0f9488",
                  color: "#fff",
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 30,
                  opacity: prog(frame, undoAt - 2, 6),
                  scale: `${Math.min(pop(frame, undoAt - 2), 1.08)}`,
                }}
              >
                <RewindIcon size={30} color="#fff" />
                {undone}/3
              </div>
            }
          >
            <div style={{ position: "absolute", left: 40, top: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {files.map((name, i) => (
                <div key={i} style={{ translate: `${interpolate(rolled[i], [0, 0.5, 1], [0, -26, 0])}px 0px` }}>
                  <FileRow
                    light
                    name={name}
                    broken={1 - rolled[i]}
                    fixed={Math.min(pop(frame, cleanAt + i * 3, 12, 200), 1.08)}
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 402,
                bottom: 0,
                borderTop: "1.5px solid rgba(20,30,60,0.07)",
                display: "flex",
                alignItems: "center",
                padding: "0 46px",
                color: LIGHT_TEXT,
                fontFamily: c.fontUi,
              }}
            >
              <PromptLine light text={typed(params.command, frame, typeAt, 1.4)} color="#0f9488" size={46} />
            </div>
          </TerminalCard>
        </div>

        <Dock light fill={[pop(frame, slotAt, 12, 180), 0, 0]} active={frame >= slotAt ? 0 : -1} />
      </Camera>
    </AbsoluteFill>
  );
}
