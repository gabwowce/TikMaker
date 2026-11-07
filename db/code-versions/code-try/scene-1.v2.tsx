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
  "A tall Claude Code terminal full of a day's chat history: a one-line question is typed and the whole history lights up as sent with it, while banknotes burn in the terminal and a 'burned today' dollar counter ticks up in its title bar";

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

// The terminal fills the picture zone: from under the headline to y ≈ 1075.
const CARD_H = 655;
const BODY_H = CARD_H - 64;
const PROMPT_H = 90;
const HIST_H = BODY_H - PROMPT_H;
const MONEY_W = 270; // right column with the burning bills
const HIST_W = CARD.w - MONEY_W;

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

  // Money
  const billsIn = prog(frame, resend + 4, 12);
  const dollars = interpolate(frame, [resend, durationInFrames], [0, params.dollars], clamp);
  const bump = interpolate(frame, [pays, pays + 4, pays + 12], [1, 1.15, 1], clamp);

  // "burned today $4.20" – lives in the terminal's title bar
  const burnedCounter = (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginLeft: 22,
        paddingLeft: 22,
        borderLeft: "1px solid rgba(255,255,255,0.14)",
        opacity: 0.35 + billsIn * 0.65,
      }}
    >
      <div style={{ fontFamily: c.fontSemi, fontSize: 22, color: c.textSoft, whiteSpace: "nowrap" }}>
        burned today
      </div>
      <div
        style={{
          fontFamily: c.fontStrong,
          fontSize: 40,
          color: c.accent,
          lineHeight: 1,
          minWidth: 104,
          textAlign: "right",
          scale: `${bump}`,
        }}
      >
        ${dollars.toFixed(2)}
      </div>
    </div>
  );

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      <div style={{ position: "absolute", inset: 0, scale: `${push}`, translate: `0px ${float}px` }}>
        <Terminal
          title="claude"
          style={{ height: CARD_H, scale: `${enter}`, opacity: prog(frame, 0, 8) }}
          right={
            <div style={{ display: "flex", alignItems: "center" }}>
              <CtxMeter tokens={tokens} max={params.tokensEnd} />
              {burnedCounter}
            </div>
          }
        >
          {/* history */}
          <div
            style={{
              position: "absolute",
              left: 0,
              width: HIST_W,
              top: 0,
              height: HIST_H,
              overflow: "hidden",
              maskImage: "linear-gradient(to bottom, transparent, black 18%)",
            }}
          >
            <div style={{ position: "absolute", left: 44, top: -offset, right: 0 }}>
              {[...HISTORY, ...HISTORY, ...HISTORY].map((l, i) => (
                <HistoryLine key={i} kind={l.kind} text={l.text} />
              ))}
            </div>
          </div>
          {/* "resent" highlight over the history */}
          <div
            style={{
              position: "absolute",
              left: 16,
              width: HIST_W - 28,
              top: 14,
              height: HIST_H - 24,
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
              left: 34,
              top: 28,
              fontFamily: c.fontStrong,
              fontSize: 30,
              color: c.bg,
              background: c.accent,
              borderRadius: 10,
              padding: "6px 14px 3px",
              opacity: lit,
              translate: `0px ${(1 - lit) * -10}px`,
              whiteSpace: "nowrap",
            }}
          >
            {sent > 0.5 ? "↑ ALL OF THIS GOES WITH IT" : "↑ RESENT EVERY MESSAGE"}
          </div>

          {/* the money burning, right column */}
          <div
            style={{
              position: "absolute",
              left: HIST_W,
              width: MONEY_W,
              top: 0,
              height: HIST_H,
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-evenly",
              opacity: billsIn,
              translate: `${(1 - billsIn) * 24}px 0px`,
            }}
          >
            {[0, 1, 2].map((i) => {
              const start = resend + 6 + i * 14;
              const burn = interpolate(frame, [start, start + 170], [0.04, 0.6], clamp);
              return (
                <div key={i} style={{ rotate: `${(i - 1) * -5}deg`, marginTop: -44 }}>
                  <BurningBill burn={burn} seed={i} width={190} />
                </div>
              );
            })}
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
      </div>

      <Sticker
        text={params.sticker}
        at={pays}
        rotate={-7}
        size={58}
        style={{ left: 150, top: CARD.y + 300 }}
      />
    </AbsoluteFill>
  );
}
