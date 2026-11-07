import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, Logo, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  clamp,
  EASE_BOUNCE,
  FileCard,
  fileRects,
  FILES_H,
  FILES_Y,
  HOOK_TERM,
  lerpRect,
  prog,
  rowRects,
  Slots,
  S2_TERM,
  Terminal,
} from "./shared";

export const description =
  "The terminal grows into a big Claude Code window while three empty numbered slots drop in above it one by one, the count landing on 3";

export const schema = z.object({
  firstOn: field.word("Slot 1 drops on", "one"),
  secondOn: field.word("Slot 2 drops on", "of"),
  thirdOn: field.word("Slot 3 drops on", "three"),
  terminalOn: field.word("Terminal lights up on", "Claude"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const drops = [
    wordFrame(words, params.firstOn, 9) - 3,
    wordFrame(words, params.secondOn, 19) - 3,
    wordFrame(words, params.thirdOn, 28) - 3,
  ];
  const termAt = wordFrame(words, params.terminalOn, 38) - 3;

  const move = prog(frame, 0, 18);
  const term = lerpRect(HOOK_TERM, S2_TERM, move);
  const filesOut = interpolate(frame, [0, 8], [1, 0], clamp);
  const termHot = prog(frame, termAt, 8);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const drift = Math.sin(frame / 24) * 5;

  // the newest slot is the focus until the terminal takes it
  const newest = drops.filter((d) => frame >= d).length - 1;

  const looks = rowRects(-1).map((r, i) => {
    const d = prog(frame, drops[i], 12, EASE_BOUNCE);
    return {
      rect: { ...r, y: r.y - (1 - d) * 160 },
      hot: i === newest && frame < termAt ? 1 : 0,
      dim: prog(frame, drops[i], 6) * (frame >= termAt ? 0.55 : 1),
    };
  });

  return (
    <AbsoluteFill style={{ scale: `${push}` }}>
      {filesOut > 0
        ? fileRects(FILES_Y, FILES_H).map((r, i) => (
            <FileCard key={i} rect={r} clean={1} style={{ opacity: filesOut, translate: `0px ${(1 - filesOut) * -40}px` }} />
          ))
        : null}

      <Slots looks={looks} />

      <Terminal
        rect={{ ...term, y: term.y + drift * move }}
        style={{
          border: termHot > 0.01 ? `3px solid rgba(255,112,36,${termHot})` : undefined,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 34,
            opacity: move,
          }}
        >
          <div style={{ scale: `${interpolate(termHot, [0, 1], [0.9, 1.08])}`, filter: `drop-shadow(0 0 ${termHot * 40}px ${c.accent}66)` }}>
            <Logo id="claude" size={190} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
            <Bar w={520} h={26} />
            <Bar w={380} h={26} />
          </div>
        </div>
      </Terminal>
    </AbsoluteFill>
  );
}
