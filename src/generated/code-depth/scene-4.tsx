import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Background,
  Camera,
  clamp,
  COL,
  CompactIcon,
  Dock,
  EASE,
  Headline,
  Motif,
  pop,
  prog,
  PromptLine,
  TerminalCard,
  typed,
} from "./shared";

export const description =
  "/compact fills slot 2; a tall scrolling Claude Code chat with a heavy context meter squeezes down into one short summary block while the blue thread line from start to now stays unbroken";

export const schema = z.object({
  headline: field.text("Headline (*word* – key word)", "*/compact*"),
  command: field.text("Command typed", "/compact"),
  tokensHeavy: field.number("Context when heavy (k tokens)", 186, { min: 1 }),
  tokensAfter: field.number("Context after (k tokens)", 21, { min: 1 }),
  slotOn: field.word("Slot 2 fills on", "compact"),
  heavyOn: field.word("Chat gets heavy on", "long"),
  shrinkOn: field.word("Chat squeezes on", "shrinks"),
  threadOn: field.word("Thread lights up on", "thread"),
});
type Params = z.infer<typeof schema>;

const CARD_W = 880;
const TALL = 578;
const SHORT = 340;
const MID = 372 + TALL / 2;

// the chat history: user prompts (right, blue) and Claude's answers (grey bars)
const HISTORY = [
  { user: true, w: 380 },
  { user: false, w: 560 },
  { user: false, w: 420 },
  { user: true, w: 300 },
  { user: false, w: 600 },
  { user: true, w: 440 },
  { user: false, w: 500 },
  { user: false, w: 360 },
  { user: true, w: 340 },
  { user: false, w: 580 },
];
const ROW = 66;

export default function Scene4({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const slotAt = wordFrame(words, params.slotOn, 19) - 3;
  const heavyAt = wordFrame(words, params.heavyOn, 66) - 3;
  const shrinkAt = wordFrame(words, params.shrinkOn, 103) - 4;
  const threadAt = wordFrame(words, params.threadOn, 159) - 3;

  const squeeze = interpolate(frame, [shrinkAt, shrinkAt + 18], [0, 1], { ...clamp, easing: EASE });
  const h = interpolate(squeeze, [0, 1], [TALL, SHORT]);
  const top = MID - h / 2;
  const body = h - 92;
  const promptH = 92;
  const histH = body - promptH;

  // the history scrolls, faster once it gets heavy
  const speed = interpolate(frame, [heavyAt, heavyAt + 20], [1.2, 4], clamp);
  const scroll = frame * 1.2 + Math.max(0, frame - heavyAt) * (speed - 1.2) * 0.5;
  const listH = HISTORY.length * ROW;
  const offset = scroll % listH;

  // the context meter: heavy → light
  const heavy = prog(frame, heavyAt, 26);
  const k = Math.round(
    interpolate(frame, [0, heavyAt, heavyAt + 26, shrinkAt, shrinkAt + 24], [128, 140, params.tokensHeavy, params.tokensHeavy, params.tokensAfter], { ...clamp, easing: EASE }),
  );
  const fullness = k / Math.max(params.tokensHeavy, 1);
  const meterCol = squeeze > 0.5 ? COL.teal : heavy > 0.5 ? COL.red : COL.blue;

  const thread = prog(frame, threadAt, 8);
  const threadPulse = thread * (0.6 + Math.sin((frame - threadAt) / 5) * 0.4);
  const settle = prog(frame, 0, 20);
  const float = Math.sin(frame / 14) * 7;
  const summary = prog(frame, shrinkAt + 10, 12);
  const savedIn = Math.min(pop(frame, shrinkAt + 22, 12, 180), 1.08);

  return (
    <AbsoluteFill>
      <Background color={COL.blue} y={660}>
        <Motif x={540} y={680} size={330} rotate={-12} opacity={0.05}>
          /compact
        </Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={shrinkAt + 16}>
        <Headline line1={params.headline} color="#7fb0ff" mono start={slotAt - 6} size={104} top={214} />

        <div
          style={{
            position: "absolute",
            left: (1080 - CARD_W) / 2,
            top,
            width: CARD_W,
            height: h,
            transform: `perspective(1200px) rotateY(${interpolate(settle, [0, 1], [-10, 0]) + Math.sin(frame / 34) * 1.5}deg) rotateX(${interpolate(squeeze, [0, 0.5, 1], [0, 8, 0])}deg)`,
            translate: `0px ${float}px`,
          }}
        >
          <TerminalCard
            height={h}
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 150, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(1, fullness) * 100}%`, height: "100%", background: meterCol, borderRadius: 7 }} />
                </div>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: meterCol, width: 96, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {k}k
                </div>
              </div>
            }
          >
            {/* the history (tall) */}
            <div
              style={{
                position: "absolute",
                left: 110,
                right: 36,
                top: 0,
                height: histH,
                overflow: "hidden",
                opacity: 1 - prog(frame, shrinkAt, 10),
                maskImage: "linear-gradient(to bottom, transparent, black 18%, black 85%, transparent)",
              }}
            >
              <div style={{ position: "absolute", left: 0, right: 0, top: -offset }}>
                {[...HISTORY, ...HISTORY, ...HISTORY].map((m, i) => (
                  <div key={i} style={{ height: ROW, display: "flex", alignItems: "center", justifyContent: m.user ? "flex-end" : "flex-start" }}>
                    <div
                      style={{
                        width: m.user ? m.w * 0.9 : m.w,
                        height: m.user ? 44 : 18,
                        borderRadius: 22,
                        background: m.user ? "rgba(59,130,246,0.45)" : `rgba(255,255,255,${0.16 + heavy * 0.04})`,
                        border: m.user ? "1.5px solid rgba(127,176,255,0.5)" : "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* the summary block (short) */}
            <div
              style={{
                position: "absolute",
                left: 110,
                right: 36,
                top: (histH - 118) / 2,
                height: 118,
                borderRadius: 26,
                background: "rgba(59,130,246,0.18)",
                border: "2px solid rgba(127,176,255,0.55)",
                display: "flex",
                alignItems: "center",
                gap: 22,
                padding: "0 26px",
                opacity: summary,
                scale: `${interpolate(summary, [0, 1], [0.85, 1])}`,
              }}
            >
              <div style={{ width: 70, height: 70, borderRadius: 20, background: COL.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CompactIcon size={44} color="#fff" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                <div style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 40, color: "#fff" }}>Summary</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 220, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.3)" }} />
                  <div style={{ width: 160, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.2)" }} />
                </div>
              </div>
            </div>

            {/* the thread: start → now, never broken */}
            <div
              style={{
                position: "absolute",
                left: 56,
                top: 26,
                width: 8,
                height: body - 52,
                borderRadius: 4,
                background: `linear-gradient(180deg, #7fb0ff, ${COL.blue})`,
                boxShadow: `0 0 ${14 + threadPulse * 40}px ${COL.blue}`,
              }}
            />
            {[26, body - 26].map((y, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 60 - 18,
                  top: y - 18,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  background: i === 0 ? "#fff" : COL.blue,
                  border: "5px solid #0b1328",
                  boxShadow: `0 0 ${20 + threadPulse * 40}px ${COL.blue}`,
                  scale: `${1 + threadPulse * 0.25}`,
                }}
              />
            ))}

            {/* prompt */}
            <div
              style={{
                position: "absolute",
                left: 100,
                right: 0,
                top: histH,
                height: promptH,
                borderTop: "1.5px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
              }}
            >
              <PromptLine text={typed(params.command, frame, slotAt + 4, 1.4)} color="#7fb0ff" size={44} />
            </div>
          </TerminalCard>
        </div>

        {/* the payoff: heavy → light */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: MID + SHORT / 2 + 34,
            display: "flex",
            justifyContent: "center",
            opacity: Math.min(1, savedIn * 1.5),
            scale: `${interpolate(savedIn, [0, 1], [0.5, 1])}`,
            translate: `0px ${float}px`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "14px 34px",
              borderRadius: 50,
              background: "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(18px)",
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 44,
              color: "#fff",
            }}
          >
            <span style={{ color: COL.red, textDecoration: "line-through" }}>{params.tokensHeavy}k</span>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>→</span>
            <span style={{ color: COL.teal }}>{params.tokensAfter}k</span>
          </div>
        </div>

        <Dock fill={[1, Math.min(pop(frame, slotAt, 12, 180), 1.08), 0]} active={frame >= slotAt ? 1 : 0} />
      </Camera>
    </AbsoluteFill>
  );
}
