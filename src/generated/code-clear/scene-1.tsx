import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { clamp, CommandLine, EASE_OUT, FileCard, fileRects, FILES_H, FILES_Y, HOOK_TERM, popScale, prog, Terminal } from "./shared";

export const description =
  "Three file cards break and glow orange; /rewind types into a terminal below and an orange U-turn arrow sweeps over the files, turning them clean one by one";

export const schema = z.object({
  command: field.text("Command", "/rewind"),
  breakOn: field.word("Files break on", "broke"),
  typeOn: field.word("Command types on", "One"),
  undoOn: field.word("Arrow sweeps on", "undoes"),
});
type Params = z.infer<typeof schema>;


// The U-turn arc over the row of files, right → left.
const ARC = "M 905 470 C 905 160, 175 160, 175 470";

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const breakAt = wordFrame(words, params.breakOn, 28) - 3;
  const typeAt = wordFrame(words, params.typeOn, 56) - 6;
  const undoAt = wordFrame(words, params.undoOn, 75) - 3;
  const sweepLen = 16;

  const broke = prog(frame, breakAt, 8);
  const sweep = interpolate(frame, [undoAt, undoAt + sweepLen], [0, 1], { ...clamp, easing: EASE_OUT });
  const arcOut = interpolate(frame, [undoAt + sweepLen + 6, undoAt + sweepLen + 14], [1, 0], clamp);
  const cmdHot = frame >= typeAt && frame < undoAt;
  const filesDim = interpolate(frame, [typeAt, typeAt + 6, undoAt, undoAt + 6], [1, 0.45, 0.45, 1], clamp);
  const termIn = prog(frame, 8, 12);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);

  // The tip passes the right file first, then the middle, then the left.
  const cleanAt = (i: number) => undoAt + sweepLen * [0.85, 0.5, 0.15][i];

  // arrow head at the tip
  const tipT = sweep;
  const bez = (t: number, a: number, b: number, cc: number, d: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * cc + t ** 3 * d;
  const tx = bez(tipT, 905, 905, 175, 175);
  const ty = bez(tipT, 470, 160, 160, 470);
  const dx = bez(Math.min(1, tipT + 0.01), 905, 905, 175, 175) - bez(Math.max(0, tipT - 0.01), 905, 905, 175, 175);
  const dy = bez(Math.min(1, tipT + 0.01), 470, 160, 160, 470) - bez(Math.max(0, tipT - 0.01), 470, 160, 160, 470);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <AbsoluteFill style={{ scale: `${push}` }}>
      {fileRects(FILES_Y, FILES_H).map((r, i) => {
        const enter = prog(frame, i * 3, 12);
        const clean = interpolate(frame, [cleanAt(i), cleanAt(i) + 6], [1 - broke, 1], clamp);
        const shake = frame < breakAt + 10 && frame > breakAt ? Math.sin(frame * 2.4 + i) * 6 * (1 - broke) : 0;
        return (
          <FileCard
            key={i}
            rect={r}
            clean={frame < cleanAt(i) ? 1 - broke : clean}
            hot={1}
            style={{
              opacity: enter * filesDim,
              scale: `${popScale(frame, i * 3)}`,
              translate: `${shake}px ${(1 - enter) * 30 + Math.sin((frame + i * 20) / 22) * 5}px`,
            }}
          />
        );
      })}

      <Terminal
        rect={HOOK_TERM}
        style={{ opacity: termIn, translate: `0px ${(1 - termIn) * 40}px` }}
      >
        <div style={{ position: "absolute", left: 56, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
          <CommandLine text={params.command} frame={frame} typedFrom={typeAt} perChar={1.4} color={cmdHot ? c.accent : c.text} />
        </div>
      </Terminal>

      {/* the U-turn arrow */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: arcOut }}>
        <path
          d={ARC}
          fill="none"
          stroke={c.accent}
          strokeWidth={22}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 2"
          strokeDashoffset={1 - sweep}
          opacity={sweep > 0 ? 1 : 0}
        />
        {sweep > 0.02 ? (
          <g transform={`translate(${tx} ${ty}) rotate(${ang})`}>
            <path d="M -8 -40 L 44 0 L -8 40 Z" fill={c.accent} strokeLinejoin="round" stroke={c.accent} strokeWidth={8} />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
}
