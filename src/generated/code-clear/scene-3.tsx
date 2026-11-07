import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  clamp,
  CommandLine,
  FileCard,
  fileRects,
  GREY,
  lerpRect,
  popScale,
  prog,
  pulse,
  rowRects,
  S2_TERM,
  S3_FILES_H,
  S3_FILES_Y,
  S3_TERM,
  Slot,
  Stage,
  Terminal,
} from "./shared";

export const description =
  "Slot 1 fills with /rewind; the command runs in the terminal, three edit lines roll back one by one, and the three broken files below snap back clean";

export const schema = z.object({
  command: field.text("The command", "/rewind"),
  slotOn: field.word("Slot fills on", "rewind"),
  typeOn: field.word("Typed on", "Type"),
  undoOn: field.word("Edits roll back from", "undoes"),
  filesOn: field.word("Files light up on", "Those"),
  cleanOn: field.word("Files clean on", "Clean"),
});
type Params = z.infer<typeof schema>;

const EDITS = [0.72, 0.5, 0.62];

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const slotAt = wordFrame(words, params.slotOn, 19) - 3;
  const typeAt = wordFrame(words, params.typeOn, 28) - 2;
  const undoAt = wordFrame(words, params.undoOn, 75) - 3;
  const filesAt = wordFrame(words, params.filesOn, 113) - 2;
  const cleanAt = wordFrame(words, params.cleanOn, 150) - 4;

  // the row: three equal → slot 1 wide
  const widen = prog(frame, slotAt, 12);
  const from = rowRects(-1);
  const to = rowRects(0);
  const slotHot = interpolate(frame, [slotAt, slotAt + 6, typeAt + 4, typeAt + 12], [0, 1, 1, 0], clamp);
  const slotDone = prog(frame, cleanAt + 12, 8);

  const term = lerpRect(S2_TERM, S3_TERM, prog(frame, 0, 18));
  const termDim = interpolate(frame, [filesAt, filesAt + 8], [1, 0.4], clamp);
  const files = fileRects(S3_FILES_Y, S3_FILES_H);
  const filesIn = prog(frame, 10, 12);
  const filesHot = interpolate(frame, [filesAt, filesAt + 6], [0.35, 1], clamp) * (0.85 + 0.15 * pulse(frame, 24));

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {from.map((r, i) => (
          <Slot
            key={i}
            n={i + 1}
            look={{
              rect: lerpRect(r, to[i], widen),
              label: i === 0 ? params.command : undefined,
              hot: i === 0 ? slotHot : 0,
              filled: i === 0 ? Math.max(widen, slotDone) : 0,
              dim: i === 0 ? 1 : 0.5,
            }}
          />
        ))}

        <Terminal rect={term} style={{ opacity: termDim }}>
          <div style={{ position: "absolute", left: 56, top: 22 }}>
            <CommandLine text={params.command} frame={frame} typedFrom={typeAt} size={78} />
          </div>
          {/* the last edits, rolled back one by one */}
          <div style={{ position: "absolute", left: 60, right: 60, top: 128, display: "flex", flexDirection: "column", gap: 18 }}>
            {EDITS.map((f, i) => {
              const at = undoAt + i * 11;
              const appear = prog(frame, typeAt + 14 + i * 3, 8);
              const back = prog(frame, at, 10);
              const active = interpolate(frame, [at - 2, at, at + 10], [0, 1, 0], clamp);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, opacity: appear * (1 - back * 0.85) }}>
                  <Bar w={30} h={30} color={active > 0.2 ? c.accent : "#4a4d55"} style={{ borderRadius: 10 }} />
                  <Bar
                    w={680 * f}
                    h={26}
                    color={active > 0.2 ? c.accent : GREY}
                    style={{ translate: `${-back * 90}px 0px` }}
                  />
                </div>
              );
            })}
          </div>
        </Terminal>

        {files.map((r, i) => {
          const clean = prog(frame, cleanAt + i * 5, 7);
          const pop = clean > 0 ? interpolate(frame, [cleanAt + i * 5, cleanAt + i * 5 + 6, cleanAt + i * 5 + 12], [1, 1.06, 1], clamp) : 1;
          return (
            <FileCard
              key={i}
              rect={r}
              clean={clean}
              hot={filesHot}
              style={{
                opacity: filesIn,
                translate: `0px ${(1 - filesIn) * 40}px`,
                scale: `${frame < 24 ? popScale(frame, 10 + i * 2) : pop}`,
              }}
            />
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
