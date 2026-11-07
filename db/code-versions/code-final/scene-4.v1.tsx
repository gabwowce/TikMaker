import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  clamp,
  COMMANDS,
  EASE_OUT,
  Headline,
  prog,
  Prompt,
  SlotList,
  Sticker,
  Terminal,
} from "./shared";

export const description =
  "Slot 2 fills with /compact; a long scrolling chat history squeezes into a short summary block while the thread line from start to now stays unbroken and the context drops from 182k to 14k";

export const schema = z.object({
  pill: field.text("Strip", "COMMAND 02"),
  headline: field.text("Headline (*word* – key word)", "*/compact* = shrink"),
  command: field.text("Command", "/compact"),
  tokensStart: field.number("Context before (tokens)", 120000, { min: 0 }),
  tokensHeavy: field.number("Context when heavy (tokens)", 182000, { min: 0 }),
  tokensAfter: field.number("Context after /compact (tokens)", 14000, { min: 0 }),
  summary: field.text("Summary line", "Building: auth refresh + sticky navbar"),
  sticker: field.text("Sticker", "THREAD KEPT"),
  slotOn: field.word("Slot fills on", "slash"),
  heavyOn: field.word("History piles up on", "long"),
  shrinkOn: field.word("Squeezes on", "shrinks"),
  threadOn: field.word("Thread glows on", "thread"),
});
type Params = z.infer<typeof schema>;

const HISTORY: { kind: "you" | "tool" | "ai"; text: string }[] = [
  { kind: "you", text: "fix the login redirect bug" },
  { kind: "tool", text: "Read(src/auth/session.ts)" },
  { kind: "ai", text: "Found it – the cookie expires early." },
  { kind: "you", text: "now add tests for it" },
  { kind: "tool", text: "Write(tests/auth.test.ts)" },
  { kind: "you", text: "make the navbar sticky" },
  { kind: "tool", text: "Edit(src/ui/Navbar.tsx)" },
  { kind: "ai", text: "Done. Navbar sticks on scroll." },
  { kind: "you", text: "why is the build slow?" },
  { kind: "tool", text: "Bash(npm run build --profile)" },
  { kind: "ai", text: "Webpack re-bundles all icons." },
  { kind: "you", text: "refactor the pricing page" },
  { kind: "tool", text: "Edit(src/pages/pricing.tsx)" },
];
const LINE_H = 46;
const FULL_H = 392;
const SHORT_H = 128;

const fmtK = (n: number) => `${Math.round(n / 1000)}k`;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const slotAt = wordFrame(words, params.slotOn, 9) - 3;
  const heavyAt = wordFrame(words, params.heavyOn, 66) - 3;
  const shrinkAt = wordFrame(words, params.shrinkOn, 103) - 3;
  const threadAt = wordFrame(words, params.threadOn, 159) - 3;
  const typeAt = shrinkAt - 14;
  const downAt = wordFrame(words, "down", shrinkAt + 19) - 3;

  const squeeze = prog(frame, shrinkAt, 16);
  const H = FULL_H + (SHORT_H - FULL_H) * squeeze;
  const scroll = frame * 1.2 + interpolate(frame, [heavyAt, heavyAt + 30], [0, 120], { ...clamp, easing: EASE_OUT });
  const listH = HISTORY.length * LINE_H;
  const offset = scroll % listH;

  const tokens = interpolate(
    frame,
    [0, heavyAt, heavyAt + 30, shrinkAt, shrinkAt + 16],
    [params.tokensStart, params.tokensStart + 8000, params.tokensHeavy, params.tokensHeavy, params.tokensAfter],
    clamp,
  );
  const meter = Math.min(1, tokens / 200000);
  const heavy = prog(frame, heavyAt, 20) * (1 - squeeze);
  const glow = prog(frame, threadAt, 8);
  const stats = prog(frame, downAt, 10);
  const contentIn = prog(frame, 0, 10);
  const float = Math.sin(frame / 22) * 6;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      <SlotList
        from="compact"
        to="compact"
        t={0}
        fill={[1, prog(frame, slotAt, 10), 0]}
        names={[COMMANDS[0].name, params.command, COMMANDS[2].name]}
        active={1}
      />

      <div style={{ position: "absolute", inset: 0, translate: `0px ${float}px`, scale: `${push}` }}>
        <Terminal
          right={
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 150,
                  height: 12,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.1)",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: `${meter * 100}%`, height: "100%", background: c.accent }} />
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 26,
                  fontWeight: 700,
                  color: meter > 0.6 ? c.accent : c.text,
                  minWidth: 80,
                  textAlign: "right",
                }}
              >
                {fmtK(tokens)}
              </div>
            </div>
          }
        >
          <div style={{ position: "absolute", inset: 0, opacity: contentIn }}>
            {/* the history, squeezed by /compact */}
            <div
              style={{
                position: "absolute",
                left: 70,
                right: 24,
                top: 18,
                height: H,
                overflow: "hidden",
                borderRadius: 16,
                background: `rgba(255,112,36,${heavy * 0.08})`,
                maskImage: squeeze < 0.5 ? "linear-gradient(to bottom, transparent, black 18%)" : undefined,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  right: 0,
                  top: 0,
                  height: FULL_H,
                  scale: `1 ${H / FULL_H}`,
                  transformOrigin: "top",
                  opacity: 1 - prog(frame, shrinkAt + 4, 8),
                }}
              >
                <div style={{ position: "absolute", left: 0, right: 0, top: -offset }}>
                  {[...HISTORY, ...HISTORY, ...HISTORY].map((l, i) => (
                    <div
                      key={i}
                      style={{
                        height: LINE_H,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        fontFamily: MONO,
                        fontSize: 27,
                        whiteSpace: "nowrap",
                        color: l.kind === "you" ? c.text : l.kind === "tool" ? c.textSoft : "rgba(255,255,255,0.55)",
                      }}
                    >
                      <span style={{ width: 22, color: l.kind === "you" ? c.accent : undefined }}>
                        {l.kind === "you" ? ">" : l.kind === "tool" ? "●" : " "}
                      </span>
                      {l.text}
                    </div>
                  ))}
                </div>
              </div>
              {/* the summary it becomes */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  padding: "18px 22px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 10,
                  border: `2px solid ${c.accent}`,
                  borderRadius: 16,
                  background: "rgba(255,112,36,0.1)",
                  opacity: prog(frame, shrinkAt + 8, 8),
                }}
              >
                <div style={{ fontFamily: MONO, fontSize: 28, color: c.text, whiteSpace: "nowrap" }}>
                  <span style={{ color: c.accent }}>● </span>Compacted 48 messages
                </div>
                <div style={{ fontFamily: MONO, fontSize: 26, color: c.textSoft, whiteSpace: "nowrap" }}>
                  {params.summary}
                </div>
              </div>
            </div>

            {/* the thread: start → now, never broken */}
            <div
              style={{
                position: "absolute",
                left: 34,
                top: 22,
                width: 8 + glow * 4,
                marginLeft: -glow * 2,
                height: H - 8,
                borderRadius: 6,
                background: c.accent,
                boxShadow: `0 0 ${10 + glow * 30}px ${c.accent}`,
              }}
            />
            {[22, 18 + H - 8].map((y, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 38 - 14,
                  top: y - 10,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: i === 0 ? c.accent : c.text,
                  border: `4px solid ${c.accent}`,
                  boxSizing: "border-box",
                  scale: `${1 + glow * 0.3 * Math.abs(Math.sin(frame / 6))}`,
                }}
              />
            ))}

            {/* what it saved */}
            <div
              style={{
                position: "absolute",
                left: 70,
                right: 24,
                top: SHORT_H + 50,
                height: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                opacity: stats,
                translate: `0px ${(1 - stats) * 24}px`,
              }}
            >
              <div style={{ fontFamily: c.fontStrong, fontSize: 110, lineHeight: 1, color: c.text, whiteSpace: "nowrap" }}>
                <span style={{ color: c.textSoft, textDecoration: "line-through" }}>{fmtK(params.tokensHeavy)}</span>
                <span style={{ color: c.accent }}> → </span>
                {fmtK(params.tokensAfter)}
              </div>
              <div style={{ fontFamily: c.fontSemi, fontSize: 34, color: c.textSoft, marginTop: 10 }}>
                tokens in context
              </div>
            </div>

            {/* prompt */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 78,
                borderTop: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                padding: "0 30px",
                background: "#121217",
              }}
            >
              <Prompt text={params.command} typedFrom={typeAt} cps={1.2} size={34} />
            </div>
          </div>
        </Terminal>
      </div>

      <Sticker text={params.sticker} at={threadAt} rotate={6} size={54} style={{ left: 70, top: 640 }} />
    </AbsoluteFill>
  );
}
