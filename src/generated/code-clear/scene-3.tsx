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
  ITEM_TERM,
  lerpRect,
  prog,
  rowRects,
  S2_TERM,
  Slots,
  Terminal,
} from "./shared";

export const description =
  "Slot 1 fills with /rewind; in the terminal the command runs and its last three edits roll back one by one, then the three orange broken files below turn clean";

export const schema = z.object({
  command: field.text("Command", "/rewind"),
  labelOn: field.word("Slot fills on", "rewind"),
  typeOn: field.word("Command types on", "Type"),
  undoOn: field.word("Edits roll back on", "undoes"),
  filesOn: field.word("Broken files light up on", "Those"),
  cleanOn: field.word("Files turn clean on", "Clean"),
});
type Params = z.infer<typeof schema>;

const FILES3_Y = 800;
const EDITS = [0.72, 0.5, 0.62];

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const labelAt = wordFrame(words, params.labelOn, 19) - 3;
  const typeAt = wordFrame(words, params.typeOn, 28) - 4;
  const undoAt = wordFrame(words, params.undoOn, 75) - 3;
  const filesAt = wordFrame(words, params.filesOn, 113) - 3;
  const cleanAt = wordFrame(words, params.cleanOn, 150) - 3;

  const move = prog(frame, 0, 18);
  const term = lerpRect(S2_TERM, ITEM_TERM, move);
  const from = rowRects(-1);
  const to = rowRects(0);
  const label = prog(frame, labelAt, 10);
  const slotHot = frame >= labelAt && frame < typeAt + 4 ? 1 : 0;
  const filesIn = prog(frame, 10, 14);
  const filesHot = prog(frame, filesAt, 8);
  const termDim = interpolate(frame, [filesAt, filesAt + 8], [1, 0.45], clamp);
  const cmdHot = frame >= typeAt && frame < undoAt;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const drift = Math.sin(frame / 24) * 5;

  const looks = from.map((r, i) => ({
    rect: lerpRect(r, to[i], move),
    label: i === 0 ? params.command : undefined,
    hot: i === 0 ? slotHot : 0,
    filled: i === 0 ? label : 0,
    dim: i === 0 ? 1 : 0.5,
  }));
  // the label only shows once it is said
  looks[0].label = label > 0 ? params.command : undefined;

  return (
    <AbsoluteFill style={{ scale: `${push}` }}>
      <Slots looks={looks} />

      <Terminal rect={{ ...term, y: term.y + drift * move }} style={{ opacity: termDim }}>
        <div style={{ position: "absolute", left: 56, top: 34 }}>
          <CommandLine text={params.command} frame={frame} typedFrom={typeAt} perChar={1.4} color={cmdHot ? c.accent : c.text} />
        </div>
        {/* the last three edits – they roll back one by one (newest first) */}
        <div style={{ position: "absolute", left: 56, top: 150, display: "flex", flexDirection: "column", gap: 26, opacity: move }}>
          {EDITS.map((f, i) => {
            const at = undoAt + (EDITS.length - 1 - i) * 8;
            const rolling = interpolate(frame, [at, at + 4], [0, 1], clamp);
            const gone = prog(frame, at + 4, 8);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: 1 - gone, translate: `${-gone * 120}px 0px` }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: rolling > 0.5 && gone < 0.9 ? c.accent : GREY,
                  }}
                />
                <Bar w={780 * f} h={24} color={rolling > 0.5 ? "rgba(255,112,36,0.55)" : GREY} />
              </div>
            );
          })}
        </div>
      </Terminal>

      {fileRects(FILES3_Y, 250).map((r, i) => {
        const at = cleanAt + i * 5;
        return (
          <FileCard
            key={i}
            rect={r}
            clean={prog(frame, at, 8)}
            hot={0.35 + filesHot * 0.65}
            style={{
              opacity: filesIn * (0.55 + 0.45 * filesHot),
              translate: `0px ${(1 - filesIn) * 40 + Math.sin((frame + i * 20) / 22) * 5}px`,
              scale: `${1 + 0.04 * Math.sin(Math.PI * prog(frame, at, 10))}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
