import { z } from "zod";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CL, Dock, DOCK_LABELS, glass, Headline, HUE, ramp, usePop } from "./shared";

export const description =
  "Slot 2 fills with /compact; a tall, heavy chat history squeezes down into a short summary block while a glowing thread line from start to now stays unbroken";

export const schema = z.object({
  command: field.text("Slot 2 command", "/compact"),
  title1: field.text("Headline 2", "Long. *Heavy.*"),
  title2: field.text("Headline 3", "*Shrink* it down"),
  title3: field.text("Headline 4", "Thread *kept*"),
  tokensBefore: field.number("Tokens before (k)", 184, { min: 1 }),
  tokensAfter: field.number("Tokens after (k)", 12, { min: 1 }),
  summary: field.text("Summary block label", "Summary"),
  longOn: field.word("History grows on", "long"),
  shrinkOn: field.word("Squeezes on", "shrinks"),
  threadOn: field.word("Thread lights on", "thread"),
});
type Params = z.infer<typeof schema>;

const CX = 560; // card centre x
const CY = 770; // card centre y
const W = 760;

export default function Scene4({ words, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pop = usePop();
  const slashAt = wordFrame(words, "slash", 9);
  const compactAt = wordFrame(words, "compact", 19);
  const longAt = wordFrame(words, params.longOn, 66);
  const heavyAt = wordFrame(words, "heavy", 84);
  const shrinkAt = wordFrame(words, params.shrinkOn, 103);
  const threadAt = wordFrame(words, params.threadOn, 159);

  // height: enters 440, grows to 600 (long), squeezes to 250 (shrinks)
  const grow = ramp(frame, longAt - 4, 20);
  const squeeze = interpolate(frame, [shrinkAt, shrinkAt + 14, shrinkAt + 22], [0, 1.06, 1], {
    ...CL,
    easing: Easing.bezier(0.5, 0, 0.3, 1),
  });
  const h = 440 + 160 * grow - 270 * squeeze;
  const top = CY - h / 2;
  const enter = ramp(frame, 0, 16);
  const tilt = 1 - ramp(frame, shrinkAt, 16);

  // tokens: 40k → before (long…heavy), then → after (shrinks)
  const upK = interpolate(frame, [longAt, heavyAt + 8], [40, params.tokensBefore], { ...CL, easing: Easing.out(Easing.cubic) });
  const tokens = frame < shrinkAt
    ? upK
    : interpolate(frame, [shrinkAt, shrinkAt + 24], [params.tokensBefore, params.tokensAfter], { ...CL, easing: Easing.out(Easing.cubic) });
  const load = Math.min(1, tokens / 200);
  const meterColor = load > 0.6 ? HUE.magenta : "#22D3A6";

  const history = 1 - ramp(frame, shrinkAt + 4, 10);
  const sumP = pop(frame, shrinkAt + 14);
  const scroll = frame * 2.4;

  // the thread: a pulse runs from start to now
  const run = ramp(frame, threadAt - 4, 18);
  const lit = interpolate(frame, [threadAt - 4, threadAt + 6], [0.55, 1], CL);
  const dotBloom = (at: number) => interpolate(frame, [at, at + 6, at + 12], [1, 1.35, 1], CL);
  const lineX = CX - W / 2 - 60;
  const f = Math.sin(frame / 14) * 6;

  const labels = [DOCK_LABELS[0], params.command, DOCK_LABELS[2]];
  return (
    <AbsoluteFill>
      <Backdrop hue={HUE.magenta} from={HUE.teal} />
      <Camera enter="push" punches={[shrinkAt + 14, threadAt]}>
        <div style={{ position: "absolute", left: 0, top: f, width: 1080, height: 1920, perspective: 1200 }}>
          {/* thread line */}
          <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: enter }}>
            <defs>
              <filter id="thglow">
                <feGaussianBlur stdDeviation={7} />
              </filter>
            </defs>
            <line x1={lineX} y1={top + 40} x2={lineX} y2={top + h - 40} stroke={HUE.magenta} strokeWidth={22} filter="url(#thglow)" opacity={0.7 * lit} />
            <line x1={lineX} y1={top + 40} x2={lineX} y2={top + h - 40} stroke="#fff" strokeWidth={8} strokeLinecap="round" opacity={0.5 + 0.5 * lit} />
            {run > 0 && run < 1 ? (
              <circle cx={lineX} cy={top + 40 + (h - 80) * run} r={18} fill="#fff" filter="url(#thglow)" />
            ) : null}
            <circle cx={lineX} cy={top + 40} r={20 * dotBloom(threadAt - 4)} fill="#fff" />
            <circle cx={lineX} cy={top + h - 40} r={20 * dotBloom(threadAt + 14)} fill={HUE.magenta} stroke="#fff" strokeWidth={6} />
          </svg>
          {/* the chat card */}
          <div
            style={{
              position: "absolute",
              left: CX - W / 2,
              top,
              width: W,
              height: h,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 300}px) rotateY(${-12 * tilt}deg) rotateX(${7 * tilt}deg) rotateZ(${Math.sin(frame / 45) * 0.8}deg)`,
              ...glass(W, { overflow: "hidden" }),
            }}
          >
            {/* top bar with the token meter */}
            <div style={{ height: 90, display: "flex", alignItems: "center", gap: 22, padding: "0 34px", borderBottom: "1.5px solid rgba(255,255,255,0.1)" }}>
              <div style={{ flex: 1, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${load * 100}%`, height: "100%", borderRadius: 9, background: meterColor, boxShadow: `0 0 20px ${meterColor}` }} />
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 46, color: "#fff", fontVariantNumeric: "tabular-nums", width: 140, textAlign: "right" }}>
                {Math.round(tokens)}k
              </div>
            </div>
            {/* the history: chat bubbles scrolling */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 90, bottom: 0, overflow: "hidden", opacity: history }}>
              <div style={{ transform: `translateY(${-(scroll % 300)}px)`, padding: "24px 34px" }}>
                {new Array(16).fill(0).map((_, i) => {
                  const user = i % 3 === 0;
                  const w = [0.55, 0.85, 0.7, 0.45, 0.9, 0.6][i % 6];
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: user ? "flex-end" : "flex-start", marginBottom: 18 }}>
                      <div
                        style={{
                          width: (W - 68) * w,
                          height: user ? 56 : 84,
                          borderRadius: 24,
                          background: user ? `${c.accent}55` : "rgba(255,255,255,0.12)",
                          padding: "16px 22px",
                          boxSizing: "border-box",
                        }}
                      >
                        <div style={{ height: 14, width: "80%", borderRadius: 7, background: "rgba(255,255,255,0.35)" }} />
                        {!user ? <div style={{ marginTop: 14, height: 14, width: "55%", borderRadius: 7, background: "rgba(255,255,255,0.22)" }} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* the summary block */}
            <div
              style={{
                position: "absolute",
                left: 34,
                right: 34,
                top: 124,
                display: "flex",
                flexDirection: "column",
                gap: 22,
                opacity: Math.min(1, sumP * 1.5),
                transform: `scale(${0.6 + 0.4 * sumP})`,
                transformOrigin: "50% 0%",
              }}
            >
              <div style={{ fontFamily: c.fontStrong, fontSize: 72, color: "#fff" }}>{params.summary}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[0.95, 0.75, 0.55].map((w, i) => (
                  <div key={i} style={{ height: 18, width: `${w * 100}%`, borderRadius: 9, background: "rgba(255,255,255,0.35)" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Camera>
      <Dock hue={HUE.magenta} filled={1} active={1} moveFrom={0} fillAt={compactAt} labels={labels} />
      <Headline
        lines={[
          { text: `*${params.command}*`, at: slashAt },
          { text: params.title1, at: longAt },
          { text: params.title2, at: shrinkAt },
          { text: params.title3, at: threadAt },
        ]}
      />
    </AbsoluteFill>
  );
}
