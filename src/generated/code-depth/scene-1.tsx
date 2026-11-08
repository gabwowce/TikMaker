import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Background,
  Camera,
  clamp,
  COL,
  FileRow,
  Headline,
  Motif,
  pop,
  prog,
  PromptLine,
  TerminalCard,
  typed,
} from "./shared";

export const description =
  "A Claude Code window with three files turning red as broken; /rewind is typed and a green U-turn arrow sweeps over them as they turn back to green";

export const schema = z.object({
  headline: field.text("Headline (*word* – key word)", "Broke *3 files?*"),
  file1: field.text("File 1", "auth.ts"),
  file2: field.text("File 2", "api.ts"),
  file3: field.text("File 3", "cart.ts"),
  command: field.text("Command typed", "/rewind"),
  breakOn: field.word("Files turn red on", "broke"),
  typeOn: field.word("Command typed on", "One"),
  undoOn: field.word("Arrow sweeps on", "undoes"),
});
type Params = z.infer<typeof schema>;

const CARD_W = 880;
const CARD_TOP = 390;
const CARD_H = 640;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  useBrand();
  const breakAt = wordFrame(words, params.breakOn, 28) - 2;
  const typeAt = wordFrame(words, params.typeOn, 56) - 4;
  const undoAt = wordFrame(words, params.undoOn, 75) - 3;

  const files = [params.file1, params.file2, params.file3];
  // the card settles from a tilt
  const settle = prog(frame, 0, 22);
  const float = Math.sin(frame / 14) * 6;
  const shake = interpolate(frame, [breakAt, breakAt + 3, breakAt + 6, breakAt + 9, breakAt + 12], [0, -10, 8, -5, 0], clamp);

  // the U-turn arrow draws over 16 frames, then fades
  const draw = prog(frame, undoAt, 16);
  const arrowOut = interpolate(frame, [undoAt + 26, undoAt + 36], [1, 0], clamp);

  return (
    <AbsoluteFill>
      <Background color={COL.red} y={700}>
        <Motif x={560} y={720} size={1300} rotate={-6} font="Inter, sans-serif" opacity={0.05}>
          3
        </Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={undoAt}>
        <Headline line1={params.headline} color={COL.red} start={-6} />
        <div
          style={{
            position: "absolute",
            left: (1080 - CARD_W) / 2,
            top: CARD_TOP,
            width: CARD_W,
            height: CARD_H,
            transform: `perspective(1200px) rotateY(${interpolate(settle, [0, 1], [-12, 0])}deg) rotateX(${interpolate(settle, [0, 1], [8, 0])}deg) rotateZ(${Math.sin(frame / 20) * 0.5}deg)`,
            translate: `${shake}px ${float}px`,
            scale: `${interpolate(settle, [0, 1], [0.94, 1])}`,
          }}
        >
          <TerminalCard height={CARD_H} title="Claude Code">
            <div style={{ position: "absolute", left: 40, top: 26, display: "flex", flexDirection: "column", gap: 16 }}>
              {files.map((name, i) => {
                const broken = pop(frame, breakAt + i * 4, 14, 200);
                // the bottom file comes back first – the arrow sweeps upward
                const fixed = pop(frame, undoAt + 8 + (2 - i) * 5, 12, 200);
                return <FileRow key={i} name={name} broken={Math.min(broken, 1)} fixed={Math.min(fixed, 1.08)} />;
              })}
            </div>
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 430,
                bottom: 0,
                borderTop: "1.5px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                padding: "0 46px",
                background: `rgba(20,184,166,${prog(frame, typeAt, 10) * 0.08})`,
              }}
            >
              <PromptLine text={typed(params.command, frame, typeAt, 1.4)} color={COL.orange} size={52} />
            </div>
          </TerminalCard>
        </div>

        {/* the U-turn arrow sweeping up over the files */}
        <svg
          width={1080}
          height={1920}
          style={{ position: "absolute", left: 0, top: 0, opacity: arrowOut, overflow: "visible" }}
        >
          <defs>
            <filter id="s1glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          {[true, false].map((glow) => (
            <g key={String(glow)} filter={glow ? "url(#s1glow)" : undefined} opacity={glow ? 0.8 : 1}>
              <path
                d="M 720 940 C 1030 940, 1030 500, 760 500 L 600 500"
                pathLength={1}
                stroke={COL.teal}
                strokeWidth={glow ? 30 : 20}
                strokeLinecap="round"
                fill="none"
                strokeDasharray="1 1"
                strokeDashoffset={1 - draw}
              />
              <path
                d="M 640 456 L 590 500 L 640 544"
                stroke={COL.teal}
                strokeWidth={glow ? 30 : 20}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={interpolate(draw, [0.85, 1], [0, 1], clamp)}
              />
            </g>
          ))}
        </svg>
      </Camera>
    </AbsoluteFill>
  );
}
