import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  clamp,
  CommandLine,
  FileCard,
  fileRects,
  HOOK_FILES_H,
  HOOK_FILES_Y,
  HOOK_TERM,
  popScale,
  prog,
  Stage,
  Terminal,
  UTurnArrow,
} from "./shared";

export const description =
  "Three file cards break and glow orange; /rewind is typed in a terminal below and an orange U-turn arrow sweeps over them as they snap back clean";

export const schema = z.object({
  command: field.text("The command", "/rewind"),
  breakOn: field.word("Files break on", "broke"),
  typeOn: field.word("Command typed on", "command"),
  undoOn: field.word("Arrow sweeps on", "undoes"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const breakAt = wordFrame(words, params.breakOn, 28) - 3;
  const typeAt = wordFrame(words, params.typeOn, 66) - 8;
  const undoAt = wordFrame(words, params.undoOn, 75) - 3;
  const sweepLen = 16;

  const sweep = interpolate(frame, [undoAt, undoAt + sweepLen], [0, 1], clamp);
  const files = fileRects(HOOK_FILES_Y, HOOK_FILES_H);
  // The arrow runs right → left, so the right file comes back first.
  const cleanAt = [0.88, 0.55, 0.22].map((p) => undoAt + p * sweepLen);
  // Once the command is typed the focus moves from the files to the command.
  const filesHot = interpolate(frame, [typeAt, typeAt + 8], [1, 0.45], clamp);
  const termIn = prog(frame, 6, 12);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {files.map((r, i) => {
          const broken = prog(frame, breakAt + i * 3, 7);
          const clean = 1 - broken + prog(frame, cleanAt[i], 6);
          // a short jolt when it breaks
          const jolt = Math.sin((frame - breakAt - i * 3) * 1.4) * 8 * (1 - prog(frame, breakAt + i * 3, 12)) * broken;
          return (
            <FileCard
              key={i}
              rect={r}
              clean={Math.min(1, clean)}
              hot={filesHot}
              badge={broken}
              style={{ scale: `${popScale(frame, i * 3)}`, opacity: prog(frame, i * 3, 8), translate: `${jolt}px 0px` }}
            />
          );
        })}

        <UTurnArrow t={sweep} color={c.accent} opacity={1 - prog(frame, undoAt + sweepLen + 14, 8)} />

        <Terminal
          rect={HOOK_TERM}
          style={{ opacity: termIn * interpolate(frame, [typeAt - 6, typeAt], [0.55, 1], clamp), translate: `0px ${(1 - termIn) * 30}px` }}
        >
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", paddingLeft: 56 }}>
            <CommandLine text={params.command} frame={frame} typedFrom={typeAt} size={92} />
          </div>
        </Terminal>
      </Stage>
    </AbsoluteFill>
  );
}
