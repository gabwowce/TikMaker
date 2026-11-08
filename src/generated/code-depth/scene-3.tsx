import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CL, Dock, DOCK_LABELS, FileRow, Headline, HUE, Prompt, TiltCard, WindowBar, ramp } from "./shared";

export const description =
  "Slot 1 of the dock fills with /rewind; in a tilted terminal the command runs, three red files roll back their edits one by one and flip green";

export const schema = z.object({
  command: field.text("Slot 1 command", "/rewind"),
  title1: field.text("Headline 2", "*Undo* the last edits"),
  title2: field.text("Headline 3", "Clean *again*"),
  file1: field.text("File 1", "auth.ts"),
  file2: field.text("File 2", "api.ts"),
  file3: field.text("File 3", "cart.ts"),
  typeOn: field.word("Command is typed on", "Type"),
  undoOn: field.word("Rollback starts on", "undoes"),
  cleanOn: field.word("Files turn green on", "Clean"),
});
type Params = z.infer<typeof schema>;

export default function Scene3({ words, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const slashAt = wordFrame(words, "slash", 9);
  const rewindAt = wordFrame(words, "rewind", 19);
  const typeAt = wordFrame(words, params.typeOn, 28);
  const undoAt = wordFrame(words, params.undoOn, 75);
  const changesAt = wordFrame(words, "changes", 103);
  const thoseAt = wordFrame(words, "Those", 113);
  const cleanAt = wordFrame(words, params.cleanOn, 150);
  const files = [params.file1, params.file2, params.file3];
  const step = Math.max(6, (changesAt - undoAt) / 2);
  const labels = [params.command, DOCK_LABELS[1], DOCK_LABELS[2]];

  // "Those three broken files?" – the rows pulse once
  const pulse = interpolate(frame, [thoseAt, thoseAt + 6, thoseAt + 16], [0, 1, 0], CL);

  return (
    <AbsoluteFill>
      <Backdrop hue={HUE.teal} from={HUE.blue} />
      <Camera enter="push" punches={[cleanAt]}>
        <TiltCard at={0} left={120} top={480} width={840} height={590} ry={-14} rx={8} flat={ramp(frame, cleanAt, 16)}>
          <WindowBar width={840} title="claude ~/my-app" />
          <div style={{ padding: "26px 36px 6px" }}>
            <Prompt text={params.command} at={typeAt} len={10} size={54} />
          </div>
          <div style={{ padding: "8px 28px 0", display: "flex", flexDirection: "column", gap: 14 }}>
            {files.map((name, i) => {
              const r = undoAt + i * step;
              const roll = ramp(frame, r, 12);
              const g = ramp(frame, cleanAt + i * 3, 10);
              return (
                <div key={i} style={{ transform: `scale(${1 + pulse * 0.03})` }}>
                  <FileRow
                    name={name}
                    bad={1}
                    good={g}
                    diff={1 - roll}
                    spin={frame >= r ? Math.min(360, (frame - r) * 30) : undefined}
                    height={100}
                  />
                </div>
              );
            })}
          </div>
        </TiltCard>
      </Camera>
      <Dock hue={HUE.teal} filled={0} active={0} fillAt={rewindAt} labels={labels} />
      <Headline
        lines={[
          { text: `*${params.command}*`, at: slashAt },
          { text: params.title1, at: undoAt },
          { text: params.title2, at: cleanAt },
        ]}
      />
    </AbsoluteFill>
  );
}
