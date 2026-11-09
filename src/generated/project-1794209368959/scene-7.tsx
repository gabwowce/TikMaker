import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, bounceIn, CARD_BG, cardShadow, clamp, GREY, popScale, prog, pulse, Stage } from "./shared";

export const description =
  "A comment box types out SKILL in orange, a reply bubble with three numbered prompts 01, 02, 03 pops up below it, then an orange Follow button pulses";

export const schema = z.object({
  keyword: field.text("Comment keyword", "SKILL"),
  button: field.text("Button", "Follow"),
  typeOn: field.word("Keyword typed on", "skill"),
  replyOn: field.word("Reply pops on", "send"),
  followOn: field.word("Button pulses on", "follow"),
});
type Params = z.infer<typeof schema>;

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const typeAt = wordFrame(words, params.typeOn, 11) - 4;
  const replyAt = wordFrame(words, params.replyOn, 34) - 3;
  const followAt = wordFrame(words, params.followOn, 79) - 3;

  const kw = params.keyword;
  const typed = Math.max(0, Math.min(kw.length, Math.floor((frame - typeAt) / 2)));
  const blink = Math.floor(frame / 12) % 2 === 0 || typed < kw.length;
  const reply = popScale(frame, replyAt);
  const replyOp = prog(frame, replyAt, 6);
  const follow = bounceIn(frame, followAt, 12);
  const beat = frame > followAt + 12 ? 1 + 0.05 * pulse(frame - followAt, 20) : 1;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the comment box */}
        <div
          style={{
            position: "absolute",
            left: 145,
            top: 300,
            width: 740,
            height: 150,
            borderRadius: 75,
            background: CARD_BG,
            border: typed > 0 ? `3px solid ${c.accent}` : "1px solid rgba(255,255,255,0.12)",
            boxShadow: cardShadow,
            display: "flex",
            alignItems: "center",
            gap: 30,
            padding: "0 30px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: 92, height: 92, borderRadius: 46, background: "#4a4d55", flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", alignItems: "center", fontFamily: c.fontStrong, fontSize: 80 * c.widthFactor, color: c.accent, whiteSpace: "nowrap" }}>
            {kw.slice(0, typed)}
            <span style={{ width: 8, height: 76, marginLeft: 8, background: c.text, opacity: blink ? 0.85 : 0, borderRadius: 3 }} />
          </div>
          <svg width={64} height={64} viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: typed >= kw.length ? 1 : 0.35 }}>
            <path d="M3 11.5L21 3l-7 18-2.6-7.4z" fill={typed >= kw.length ? c.accent : GREY} />
          </svg>
        </div>

        {/* the reply with the three prompts */}
        <div
          style={{
            position: "absolute",
            left: 225,
            top: 500,
            width: 660,
            height: 350,
            borderRadius: 40,
            background: CARD_BG,
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: cardShadow,
            padding: "40px 44px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            scale: `${reply}`,
            opacity: replyOp,
            transformOrigin: "top right",
          }}
        >
          {["01", "02", "03"].map((n, i) => {
            const t = prog(frame, replyAt + 5 + i * 5, 10);
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 30, opacity: t, translate: `${(1 - t) * 30}px 0px` }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    background: c.accent,
                    color: c.bg,
                    fontFamily: c.fontStrong,
                    fontSize: 36 * c.widthFactor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingTop: 3,
                    boxSizing: "border-box",
                    flexShrink: 0,
                  }}
                >
                  {n}
                </div>
                <Bar w={[400, 330, 370][i]} h={26} />
              </div>
            );
          })}
        </div>

        {/* follow */}
        <div
          style={{
            position: "absolute",
            left: 515 - 200,
            top: 910,
            width: 400,
            height: 120,
            borderRadius: 60,
            background: c.accent,
            color: c.bg,
            fontFamily: c.fontStrong,
            fontSize: 60 * c.widthFactor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            paddingTop: 4,
            boxSizing: "border-box",
            scale: `${follow * beat}`,
            opacity: interpolate(follow, [0, 0.2], [0, 1], clamp),
            boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 ${50 * (beat - 1) * 20}px ${c.accent}66`,
          }}
        >
          <span style={{ fontSize: 72 * c.widthFactor, marginTop: -6 }}>+</span>
          {params.button}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
