import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  CARD,
  clamp,
  COMMANDS,
  EASE_OUT,
  FILES,
  FileRow,
  Headline,
  popScale,
  prog,
  Prompt,
  SlotList,
  Sticker,
  Terminal,
} from "./shared";

export const description =
  "Slot 1 fills with /rewind; in the terminal below it runs, the last 3 edits roll back one by one and the three broken files turn clean";

export const schema = z.object({
  pill: field.text("Strip", "COMMAND 01"),
  headline: field.text("Headline (*word* – key word)", "*/rewind* = undo"),
  command: field.text("Command", "/rewind"),
  sticker: field.text("Sticker", "CLEAN AGAIN ✓"),
  slotOn: field.word("Slot fills on", "slash"),
  typeOn: field.word("Command typed on", "Type"),
  undoOn: field.word("Edits roll back from", "undoes"),
  thoseOn: field.word("Files pulse on", "Those"),
  cleanOn: field.word("Files clean on", "Clean"),
});
type Params = z.infer<typeof schema>;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const slotAt = wordFrame(words, params.slotOn, 9) - 3;
  const typeAt = wordFrame(words, params.typeOn, 28) - 3;
  const undoAt = wordFrame(words, params.undoOn, 75) - 3;
  const thoseAt = wordFrame(words, params.thoseOn, 113) - 2;
  const cleanAt = wordFrame(words, params.cleanOn, 150) - 3;
  const its = wordFrame(words, "its", undoAt + 10);
  const last = wordFrame(words, "last", undoAt + 20);
  const steps = [undoAt, its - 3, last - 3];
  const undone = steps.filter((f) => frame >= f).length;

  const morph = prog(frame, 0, 18);
  const term = prog(frame, 8, 12);
  const float = Math.sin(frame / 22) * 6;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const ran = prog(frame, undoAt - 6, 6);
  const bar = interpolate(frame, [undoAt, steps[2] + 8], [0, 1], { ...clamp, easing: EASE_OUT });

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      <SlotList
        from="big"
        to="compact"
        t={morph}
        fill={[prog(frame, slotAt, 10), 0, 0]}
        names={[params.command, COMMANDS[1].name, COMMANDS[2].name]}
        active={0}
      />

      <div style={{ position: "absolute", inset: 0, translate: `0px ${float}px`, scale: `${push}` }}>
        <Terminal style={{ opacity: term, scale: `${popScale(frame, 8)}` }}>
          {/* prompt */}
          <div
            style={{
              height: 86,
              display: "flex",
              alignItems: "center",
              padding: "0 30px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: `rgba(255,112,36,${ran * 0.1})`,
            }}
          >
            <Prompt text={params.command} typedFrom={typeAt} cps={1.1} size={40} cursor={frame < undoAt - 6} />
          </div>
          {/* rewind progress */}
          <div
            style={{
              height: 66,
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "0 30px",
              fontFamily: MONO,
              fontSize: 28,
              color: c.textSoft,
              opacity: ran,
            }}
          >
            <span style={{ color: c.accent, fontWeight: 700, fontSize: 34 }}>↶</span>
            <span style={{ whiteSpace: "nowrap" }}>
              {undone >= 3 ? "Rewound 3 edits" : `Rewinding… ${undone}/3 edits`}
            </span>
            <div
              style={{
                marginLeft: "auto",
                width: 260,
                height: 12,
                borderRadius: 6,
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div style={{ width: `${bar * 100}%`, height: "100%", background: c.accent }} />
            </div>
          </div>
          {/* the files */}
          <div
            style={{
              position: "absolute",
              left: 24,
              right: 24,
              top: 166,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {FILES.map((f, i) => {
              const rolled = prog(frame, steps[i], 6);
              const back = prog(frame, cleanAt + i * 4, 6);
              const pulse = interpolate(
                frame,
                [thoseAt + i * 3, thoseAt + i * 3 + 5, thoseAt + i * 3 + 12],
                [1, 1.03, 1],
                clamp,
              );
              return (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    scale: `${pulse}`,
                  }}
                >
                  <FileRow {...f} width={CARD.w - 48} height={100} broken={1 - back} />
                  {/* the rewind sweep over a row */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      right: `${rolled * 100}%`,
                      width: 90,
                      background: `linear-gradient(to left, rgba(255,112,36,0), ${c.accent}88, rgba(255,112,36,0))`,
                      opacity: rolled > 0 && rolled < 1 ? 1 : 0,
                      borderRadius: 18,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </Terminal>
      </div>

      <Sticker text={params.sticker} at={cleanAt} rotate={-7} size={56} style={{ right: 80, top: 1000 }} />
    </AbsoluteFill>
  );
}
