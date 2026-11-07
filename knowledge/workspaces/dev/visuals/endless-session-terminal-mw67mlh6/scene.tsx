import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  BurningBill,
  CARD,
  clamp,
  CtxMeter,
  EASE_OUT,
  Headline,
  HISTORY,
  HistoryLine,
  LINE_H,
  popScale,
  prog,
  Prompt,
  Sticker,
  Terminal,
} from "./shared";

export const description =
  "A Claude Code terminal full of a day's chat history: a one-line question is typed and the whole history lights up as sent with it, while banknotes burn below";

export const schema = z.object({
  pill: field.text("Strip", "MISTAKE 01"),
  headline: field.text("Headline (*word* – key word)", "One *endless* session"),
  question: field.text("The one-line question", "what does this regex do?"),
  tokensStart: field.number("Context at the start (tokens)", 96000, { min: 0 }),
  tokensEnd: field.number("Context at the end (tokens)", 148000, { min: 0 }),
  sticker: field.text("Sticker", "148k tokens for 1 line"),
  dollars: field.number("Dollars burned by the end", 4.2, { min: 0 }),
  resendOn: field.word("History lights up on", "resends"),
  questionOn: field.word("Question typed on", "one-line"),
  paysOn: field.word("Sticker on", "pays"),
});
type Params = z.infer<typeof schema>;

const CARD_H = 520;
const BODY_H = CARD_H - 64;
const PROMPT_H = 84;

export default function Scene1({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const resend = wordFrame(words, params.resendOn, 70) - 3;
  const question = wordFrame(words, params.questionOn, 120) - 6;
  const pays = wordFrame(words, params.paysOn, 145) - 3;
  const endless = wordFrame(words, "endless", 26) - 2;

  // The history scrolls up, endlessly (the list repeats); faster on "endless".
  const scroll =
    frame * 1.1 + interpolate(frame, [endless, endless + 30], [0, 90], { ...clamp, easing: EASE_OUT });
  const listH = HISTORY.length * LINE_H;
  const offset = scroll % listH;

  const tokens = interpolate(
    frame,
    [0, pays, pays + 10, durationInFrames],
    [params.tokensStart, params.tokensEnd * 0.9, params.tokensEnd, params.tokensEnd + 1200],
    clamp,
  );

  const lit = prog(frame, resend, 10); // the history is resent
  const sent = prog(frame, pays, 8); // the one-liner goes with all of it
  const enter = popScale(frame, 0);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const float = Math.sin(frame / 22) * 6;

  // Money row
  const billsIn = prog(frame, resend + 4, 12);
  const dollars = interpolate(frame, [resend, durationInFrames], [0, params.dollars], clamp);

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      <div style={{ position: "absolute", inset: 0, scale: `${push}`, translate: `0px ${float}px` }}>
        <Terminal
          style={{ height: CARD_H, scale: `${enter}`, opacity: prog(frame, 0, 8) }}
          right={<CtxMeter tokens={tokens} max={params.tokensEnd} />}
        >
          {/* history */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: BODY_H - PROMPT_H,
              overflow: "hidden",
              maskImage: "linear-gradient(to bottom, transparent, black 22%)",
            }}
          >
            <div style={{ position: "absolute", left: 50, top: -offset, right: 30 }}>
              {[...HISTORY, ...HISTORY, ...HISTORY].map((l, i) => (
                <HistoryLine key={i} kind={l.kind} text={l.text} />
              ))}
            </div>
          </div>
          {/* "resent" highlight over the history */}
          <div
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              top: 12,
              height: BODY_H - PROMPT_H - 18,
              borderRadius: 18,
              border: `3px solid ${c.accent}`,
              background: `rgba(255,112,36,${0.06 + sent * 0.12})`,
              opacity: lit,
              scale: `${interpolate(lit, [0, 1], [0.97, 1])}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 36,
              top: 26,
              fontFamily: c.fontStrong,
              fontSize: 30,
              color: c.bg,
              background: c.accent,
              borderRadius: 10,
              padding: "6px 14px 3px",
              opacity: lit,
              translate: `0px ${(1 - lit) * -10}px`,
            }}
          >
            {sent > 0.5 ? "↑ ALL OF THIS GOES WITH IT" : "↑ RESENT EVERY MESSAGE"}
          </div>
          {/* the one-line question */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: PROMPT_H,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              padding: "0 34px",
              background: `rgba(255,112,36,${sent * 0.14})`,
            }}
          >
            <Prompt text={params.question} typedFrom={question} cps={1.6} />
            <div
              style={{
                marginLeft: "auto",
                fontFamily: MONO,
                fontSize: 24,
                color: c.textSoft,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                padding: "4px 10px",
                opacity: prog(frame, question + 8, 8) * (1 - prog(frame, pays, 4)),
              }}
            >
              1 line
            </div>
          </div>
        </Terminal>

        {/* the money burning */}
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            width: CARD.w,
            top: CARD.y + CARD_H + 8,
            height: 150,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            opacity: billsIn,
            translate: `0px ${(1 - billsIn) * 20}px`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", paddingBottom: 6 }}>
            <div style={{ fontFamily: c.fontSemi, fontSize: 30, color: c.textSoft }}>burned today</div>
            <div style={{ fontFamily: c.fontStrong, fontSize: 76, color: c.accent, lineHeight: 1 }}>
              ${dollars.toFixed(2)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[0, 1, 2].map((i) => {
              const start = resend + 6 + i * 14;
              const burn = interpolate(frame, [start, start + 170], [0.04, 0.6], clamp);
              return (
                <div key={i} style={{ rotate: `${(i - 1) * 5}deg` }}>
                  <BurningBill burn={burn} seed={i} width={160} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Sticker
        text={params.sticker}
        at={pays}
        rotate={-7}
        size={58}
        style={{ right: 50, top: CARD.y + 250 }}
      />
    </AbsoluteFill>
  );
}
