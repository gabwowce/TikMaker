import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  CARD,
  clamp,
  CtxMeter,
  EASE_OUT,
  formatK,
  Headline,
  HISTORY,
  HistoryLine,
  prog,
  Sticker,
  Terminal,
} from "./shared";

export const description =
  "The long Claude Code terminal turns into the creator's screen recording of typing /clear, while a context bar below drops from 148k to 0 and a $0.00 sticker slams in";

const RECORD =
  "Claude Code in a terminal with a long conversation on screen (zoom the terminal so the text is big). Start 1 s before typing: type /clear, press Enter – the history disappears and an empty prompt is left. Stop 2 s after.";

export const schema = z.object({
  pill: field.text("Strip", "FIX 01"),
  headline: field.text("Headline (*word* – key word)", "Fix: */clear* per task"),
  recording: field.recording("Typing /clear in Claude Code", RECORD),
  tokens: field.number("Context before /clear (tokens)", 148000, { min: 0 }),
  sticker: field.text("Sticker", "$0.00"),
  playOn: field.word("Recording plays from", "type"),
  clearOn: field.word("Context empties on", "clear"),
  stickerOn: field.word("Sticker on", "nothing"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const play = Math.max(0, wordFrame(words, params.playOn, 27) - 10);
  const clear = wordFrame(words, params.clearOn, 51) - 2;
  const sticker = wordFrame(words, params.stickerOn, 110) - 3;

  // Scene 1's terminal hands over to the recording over the first 18 frames.
  const morph = prog(frame, 2, 16);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const float = Math.sin(frame / 22) * 6;

  const tokens = interpolate(frame, [clear, clear + 12], [params.tokens, 0], { ...clamp, easing: EASE_OUT });
  const empty = prog(frame, clear, 12);
  const rowIn = prog(frame, 6, 12);

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      <div style={{ position: "absolute", inset: 0, scale: `${push}`, translate: `0px ${float}px` }}>
        {/* the recording – the main visual */}
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            top: CARD.y,
            opacity: morph,
            scale: `${interpolate(morph, [0, 1], [0.96, 1])}`,
          }}
        >
          <RecordingSlot
            src={params.recording || undefined}
            record={RECORD}
            at={play}
            width={CARD.w}
            height={CARD.h}
            style={{ background: "rgba(18,18,23,0.9)" }}
          />
        </div>

        {/* scene 1's terminal, leaving */}
        {morph < 1 && (
          <Terminal
            style={{
              height: 520,
              opacity: 1 - morph,
              scale: `${interpolate(morph, [0, 1], [1, 1.04])}`,
            }}
            right={<CtxMeter tokens={params.tokens} max={params.tokens} />}
          >
            <div style={{ position: "absolute", left: 50, top: 0, right: 30 }}>
              {HISTORY.slice(6, 16).map((l, i) => (
                <HistoryLine key={i} kind={l.kind} text={l.text} />
              ))}
            </div>
          </Terminal>
        )}

        {/* the context bar under it */}
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            width: CARD.w,
            top: CARD.y + CARD.h + 26,
            height: 90,
            display: "flex",
            alignItems: "center",
            gap: 22,
            opacity: rowIn,
            translate: `0px ${(1 - rowIn) * 16}px`,
          }}
        >
          <div style={{ fontFamily: c.fontSemi, fontSize: 34, color: c.textSoft }}>context</div>
          <div
            style={{
              width: 330,
              height: 22,
              borderRadius: 11,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(tokens / Math.max(1, params.tokens)) * 100}%`,
                height: "100%",
                background: c.accent,
              }}
            />
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 44,
              color: empty > 0.5 ? c.text : c.accent,
              minWidth: 130,
            }}
          >
            {formatK(tokens)}
          </div>
        </div>
      </div>

      <Sticker
        text={params.sticker}
        at={sticker}
        rotate={-8}
        size={66}
        style={{ right: 80, top: CARD.y + CARD.h + 18 }}
      />
    </AbsoluteFill>
  );
}
