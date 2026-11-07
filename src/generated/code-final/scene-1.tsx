import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  clamp,
  EDITOR,
  FILES,
  FileRow,
  Headline,
  popScale,
  prog,
  Prompt,
  Sticker,
  Terminal,
  UTurn,
} from "./shared";

export const description =
  "Three files in a Claude Code editor break and turn orange, /rewind is typed below, and a U-turn arrow sweeps over them as they come back clean";

export const schema = z.object({
  headline: field.text("Headline (*word* – key word)", "Broke *3* files?"),
  command: field.text("Command typed", "/rewind"),
  sticker: field.text("Sticker", "ONE command"),
  breakOn: field.word("Files break on", "broke"),
  typeOn: field.word("Command typed on", "One"),
  undoOn: field.word("Arrow sweeps on", "undoes"),
});
type Params = z.infer<typeof schema>;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const breakAt = wordFrame(words, params.breakOn, 28) - 3;
  const typeAt = wordFrame(words, params.typeOn, 56) - 3;
  const undoAt = wordFrame(words, params.undoOn, 75) - 4;

  const arrow = prog(frame, undoAt, 14);
  const arrowOut = 1 - prog(frame, durationInFrames - 8, 6);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const float = Math.sin(frame / 20) * 6;
  const shake = frame > breakAt && frame < breakAt + 16 ? Math.sin(frame * 2.6) * 6 : 0;
  const ran = prog(frame, undoAt, 6);

  return (
    <AbsoluteFill>
      <Headline text={params.headline} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          scale: `${push}`,
          translate: `${shake}px ${float}px`,
        }}
      >
        <Terminal
          rect={EDITOR}
          title="claude  ~/my-app"
          style={{ scale: `${popScale(frame, 0)}`, opacity: prog(frame, 0, 8) }}
        >
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {FILES.map((f, i) => {
              const b = prog(frame, breakAt + i * 5, 6);
              const back = prog(frame, undoAt + 6 + i * 5, 6);
              return <FileRow key={i} {...f} width={EDITOR.w - 48} broken={b * (1 - back)} />;
            })}
          </div>
          {/* the prompt */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 130,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              padding: "0 34px",
              background: `rgba(255,112,36,${ran * 0.12})`,
            }}
          >
            <Prompt text={params.command} typedFrom={typeAt} cps={1.2} size={44} />
          </div>
        </Terminal>

        <UTurn
          p={arrow}
          size={340}
          style={{
            position: "absolute",
            left: 470,
            top: 500,
            opacity: arrowOut * (arrow > 0 ? 1 : 0),
            rotate: `${interpolate(arrow, [0, 1], [-20, 0])}deg`,
          }}
        />
      </div>

      <Sticker
        text={params.sticker}
        at={typeAt}
        rotate={-6}
        size={58}
        style={{ right: 110, top: 945, color: c.bg }}
      />
    </AbsoluteFill>
  );
}
