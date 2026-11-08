import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CL, EASE, FileRow, GOOD, Headline, HUE, Prompt, TiltCard, WindowBar, ramp } from "./shared";

export const description =
  "A tilted glass code editor: three files snap red and broken, /rewind is typed below, and a U-turn arrow sweeps up as the files flip back to green";

export const schema = z.object({
  title1: field.text("First headline", "Broke *3* files?"),
  title2: field.text("Second headline", "*One* command"),
  command: field.text("The command", "/rewind"),
  file1: field.text("File 1", "auth.ts"),
  file2: field.text("File 2", "api.ts"),
  file3: field.text("File 3", "cart.ts"),
  breakOn: field.word("Files break on", "broke"),
  typeOn: field.word("Command is typed on", "One"),
  undoOn: field.word("Files come back on", "undoes"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const brk = wordFrame(words, params.breakOn, 28);
  const type = wordFrame(words, params.typeOn, 56);
  const undo = wordFrame(words, params.undoOn, 75);
  const files = [params.file1, params.file2, params.file3];

  // the arrow sweeps up from the terminal over the files
  const sweep = ramp(frame, undo - 2, 14);
  const arrowOut = ramp(frame, undo + 22, 10);

  return (
    <AbsoluteFill>
      <Backdrop hue={HUE.orange} />
      <Camera punches={[brk, undo]}>
        <Headline
          top={250}
          lines={[
            { text: params.title1, at: brk },
            { text: params.title2, at: type },
          ]}
        />
        <TiltCard at={0} left={120} top={420} width={840} height={620} ry={-16} rx={8} flat={ramp(frame, undo, 16)}>
          <WindowBar width={840} />
          <div style={{ padding: "26px 28px 0", display: "flex", flexDirection: "column", gap: 16 }}>
            {files.map((name, i) => {
              const b = ramp(frame, brk + i * 4, 6);
              const g = ramp(frame, undo + 2 + (2 - i) * 4, 10);
              const shake = interpolate(frame, [brk + i * 4, brk + i * 4 + 3, brk + i * 4 + 12], [0, 1, 0], CL);
              return <FileRow key={i} name={name} bad={b} good={g} diff={b * (1 - g)} shake={shake} />;
            })}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 116,
              display: "flex",
              alignItems: "center",
              padding: "0 36px",
              background: "rgba(0,0,0,0.35)",
              borderTop: "1.5px solid rgba(255,255,255,0.1)",
            }}
          >
            {frame >= type - 4 ? <Prompt text={params.command} at={type} len={10} size={50} /> : null}
          </div>
        </TiltCard>
        <svg
          width={1080}
          height={1920}
          style={{ position: "absolute", left: 0, top: 0, opacity: 1 - arrowOut, overflow: "visible" }}
        >
          <defs>
            <filter id="glow1">
              <feGaussianBlur stdDeviation={8} />
            </filter>
          </defs>
          {[true, false].map((blur) => (
            <path
              key={String(blur)}
              d="M 760 990 C 1010 960, 1020 560, 760 520 L 600 520"
              fill="none"
              stroke={GOOD}
              strokeWidth={blur ? 26 : 16}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - sweep}
              filter={blur ? "url(#glow1)" : undefined}
              opacity={blur ? 0.6 : 1}
            />
          ))}
          <path
            d="M 640 480 L 590 520 L 640 560"
            fill="none"
            stroke={GOOD}
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={interpolate(sweep, [0.9, 1], [0, 1], CL)}
            transform={`translate(${interpolate(sweep, [0.9, 1], [20, 0], { ...CL, easing: EASE })} 0)`}
          />
        </svg>
      </Camera>
    </AbsoluteFill>
  );
}
